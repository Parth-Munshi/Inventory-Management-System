from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import List
import models
import schemas
from database import get_db, engine, Base
import seed_data

# Create tables
Base.metadata.create_all(bind=engine)

# Seed database on startup (only if empty)
try:
    from database import SessionLocal
    db = SessionLocal()
    item_count = db.query(models.Item).count()
    if item_count == 0:
        print("Database is empty, seeding initial data...")
        seed_data.seed_database()
        print("Database seeded successfully!")
    db.close()
except Exception as e:
    print(f"Note: Could not seed database automatically: {e}")
    print("You can run 'python seed_data.py' manually if needed")

app = FastAPI(title="Medical Inventory Management System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Items endpoints
@app.get("/api/items", response_model=List[schemas.ItemResponse])
def get_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    items = db.query(models.Item).offset(skip).limit(limit).all()
    return items

@app.get("/api/items/{item_id}", response_model=schemas.ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.post("/api/items", response_model=schemas.ItemResponse)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    # Check if item with same name exists
    existing = db.query(models.Item).filter(models.Item.name == item.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Item with this name already exists")
    
    db_item = models.Item(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/items/{item_id}", response_model=schemas.ItemResponse)
def update_item(item_id: int, item_update: schemas.ItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = item_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if item is in inventory
    inventory_entry = db.query(models.Inventory).filter(models.Inventory.item_id == item_id).first()
    if inventory_entry:
        raise HTTPException(status_code=400, detail="Cannot delete item that exists in inventory. Remove from inventory first.")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Item deleted successfully"}

# Inventory endpoints
@app.get("/api/inventory", response_model=List[schemas.InventoryResponse])
def get_inventory(db: Session = Depends(get_db)):
    inventory = db.query(models.Inventory).all()
    return inventory

@app.get("/api/inventory/{item_id}", response_model=schemas.InventoryResponse)
def get_inventory_item(item_id: int, db: Session = Depends(get_db)):
    inventory = db.query(models.Inventory).filter(models.Inventory.item_id == item_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory entry not found")
    return inventory

@app.post("/api/inventory", response_model=schemas.InventoryResponse)
def add_to_inventory(inventory: schemas.InventoryCreate, db: Session = Depends(get_db)):
    # Check if item exists
    item = db.query(models.Item).filter(models.Item.id == inventory.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if inventory entry exists
    existing = db.query(models.Inventory).filter(models.Inventory.item_id == inventory.item_id).first()
    if existing:
        existing.quantity += inventory.quantity
        db.commit()
        db.refresh(existing)
        return existing
    
    db_inventory = models.Inventory(**inventory.dict())
    db.add(db_inventory)
    db.commit()
    db.refresh(db_inventory)
    return db_inventory

@app.put("/api/inventory/{item_id}", response_model=schemas.InventoryResponse)
def update_inventory(item_id: int, inventory_update: schemas.InventoryUpdate, db: Session = Depends(get_db)):
    inventory = db.query(models.Inventory).filter(models.Inventory.item_id == item_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory entry not found")
    
    inventory.quantity = inventory_update.quantity
    if inventory.quantity < 0:
        inventory.quantity = 0
    
    db.commit()
    db.refresh(inventory)
    return inventory

@app.delete("/api/inventory/{item_id}")
def remove_from_inventory(item_id: int, quantity: int = None, db: Session = Depends(get_db)):
    inventory = db.query(models.Inventory).filter(models.Inventory.item_id == item_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory entry not found")
    
    if quantity is None:
        # Remove entire entry
        db.delete(inventory)
    else:
        # Reduce quantity
        inventory.quantity -= quantity
        if inventory.quantity <= 0:
            db.delete(inventory)
        else:
            db.commit()
            db.refresh(inventory)
            return {"message": f"Removed {quantity} items from inventory"}
    
    db.commit()
    return {"message": "Item removed from inventory"}

# Orders endpoints
@app.get("/api/orders", response_model=List[schemas.OrderResponse])
def get_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    orders = db.query(models.Order).offset(skip).limit(limit).order_by(models.Order.order_date.desc()).all()
    return orders

@app.post("/api/orders", response_model=schemas.OrderResponse)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    total_amount = 0.0
    order_items_list = []
    
    # Validate all items exist and have sufficient inventory
    for order_item in order.items:
        item = db.query(models.Item).filter(models.Item.id == order_item.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {order_item.item_id} not found")
        
        inventory = db.query(models.Inventory).filter(models.Inventory.item_id == order_item.item_id).first()
        if not inventory or inventory.quantity < order_item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient inventory for item {item.name}")
        
        subtotal = item.cost * order_item.quantity
        total_amount += subtotal
        order_items_list.append({
            "item_id": order_item.item_id,
            "quantity": order_item.quantity,
            "unit_price": item.cost,
            "subtotal": subtotal
        })
    
    # Create order
    db_order = models.Order(total_amount=total_amount)
    db.add(db_order)
    db.flush()
    
    # Create order items and update inventory
    for order_item_data in order_items_list:
        db_order_item = models.OrderItem(
            order_id=db_order.id,
            **order_item_data
        )
        db.add(db_order_item)
        
        # Update inventory
        inventory = db.query(models.Inventory).filter(models.Inventory.item_id == order_item_data["item_id"]).first()
        inventory.quantity -= order_item_data["quantity"]
        if inventory.quantity <= 0:
            db.delete(inventory)
    
    db.commit()
    db.refresh(db_order)
    return db_order

# Historical orders statistics
@app.get("/api/orders/stats/weekly")
def get_weekly_order_stats(weeks: int = 12, db: Session = Depends(get_db)):
    end_date = datetime.now()
    start_date = end_date - timedelta(weeks=weeks)
    
    # Get orders grouped by week
    orders = db.query(models.Order).filter(
        models.Order.order_date >= start_date
    ).order_by(models.Order.order_date).all()
    
    # Group by week
    weekly_stats = {}
    for order in orders:
        # Get week start (Monday)
        week_start = order.order_date - timedelta(days=order.order_date.weekday())
        week_key = week_start.strftime("%Y-%m-%d")
        
        if week_key not in weekly_stats:
            weekly_stats[week_key] = {
                "week_start": week_key,
                "week_end": (week_start + timedelta(days=6)).strftime("%Y-%m-%d"),
                "total_orders": 0,
                "total_amount": 0.0,
                "item_counts": {}
            }
        
        weekly_stats[week_key]["total_orders"] += 1
        weekly_stats[week_key]["total_amount"] += order.total_amount
        
        # Count items in this order
        for order_item in order.order_items:
            item_name = order_item.item.name
            if item_name not in weekly_stats[week_key]["item_counts"]:
                weekly_stats[week_key]["item_counts"][item_name] = 0
            weekly_stats[week_key]["item_counts"][item_name] += order_item.quantity
    
    return list(weekly_stats.values())

@app.get("/")
def root():
    return {"message": "Medical Inventory Management System API"}

