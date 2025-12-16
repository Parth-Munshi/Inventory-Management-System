"""
Seed script to populate the database with initial medical equipment data
"""
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

# Medical equipment items
MEDICAL_ITEMS = [
    {"name": "MRI Machine - 3T", "item_type": "MRI Machine", "cost": 1500000.00, "description": "High-field 3 Tesla MRI scanner for advanced imaging"},
    {"name": "CT Scanner - 64 Slice", "item_type": "CT Scanner", "cost": 800000.00, "description": "64-slice computed tomography scanner"},
    {"name": "X-Ray Machine - Digital", "item_type": "X-Ray Machine", "cost": 120000.00, "description": "Digital radiography system"},
    {"name": "Ultrasound System - Portable", "item_type": "Ultrasound Machine", "cost": 45000.00, "description": "Portable ultrasound imaging system"},
    {"name": "Ventilator - ICU", "item_type": "Ventilator", "cost": 35000.00, "description": "Intensive care unit ventilator"},
    {"name": "Defibrillator - AED", "item_type": "Defibrillator", "cost": 1500.00, "description": "Automated external defibrillator"},
    {"name": "Patient Monitor - Multi-parameter", "item_type": "Patient Monitor", "cost": 8000.00, "description": "Multi-parameter patient monitoring system"},
    {"name": "Surgical Table - Electric", "item_type": "Surgical Equipment", "cost": 25000.00, "description": "Electric adjustable surgical table"},
    {"name": "Anesthesia Machine", "item_type": "Anesthesia Equipment", "cost": 55000.00, "description": "Modern anesthesia delivery system"},
    {"name": "Dialysis Machine", "item_type": "Dialysis Equipment", "cost": 28000.00, "description": "Hemodialysis machine"},
]

def seed_database():
    db: Session = SessionLocal()
    
    try:
        # Create items
        created_items = []
        for item_data in MEDICAL_ITEMS:
            # Check if item already exists
            existing = db.query(models.Item).filter(models.Item.name == item_data["name"]).first()
            if not existing:
                item = models.Item(**item_data)
                db.add(item)
                created_items.append(item)
            else:
                created_items.append(existing)
        
        db.commit()
        
        # Refresh to get IDs
        for item in created_items:
            db.refresh(item)
        
        # Create initial inventory entries with higher quantities (to account for historical orders)
        inventory_quantities = [5, 8, 12, 15, 10, 25, 20, 8, 7, 10]  # Higher quantities for each item
        
        for i, item in enumerate(created_items):
            # Check if inventory entry exists
            existing_inv = db.query(models.Inventory).filter(models.Inventory.item_id == item.id).first()
            if not existing_inv:
                inventory = models.Inventory(
                    item_id=item.id,
                    quantity=inventory_quantities[i]
                )
                db.add(inventory)
        
        db.commit()
        
        # Refresh inventory entries
        inventory_entries = {}
        for item in created_items:
            inv = db.query(models.Inventory).filter(models.Inventory.item_id == item.id).first()
            if inv:
                inventory_entries[item.id] = inv
        
        # Create some sample orders for historical data
        from datetime import datetime, timedelta
        import random
        
        # Create orders over the past 12 weeks
        sample_orders = []
        for week in range(12):
            week_start = datetime.now() - timedelta(weeks=12-week)
            # Create 1-3 orders per week
            num_orders = random.randint(1, 3)
            for order_num in range(num_orders):
                order_date = week_start + timedelta(days=random.randint(0, 6), hours=random.randint(9, 17))
                
                # Select 1-3 random items for each order
                num_items = random.randint(1, 3)
                selected_items = random.sample(created_items, min(num_items, len(created_items)))
                
                total_amount = 0.0
                order_items_list = []
                
                for item in selected_items:
                    # Use a small quantity for historical orders (1-2 items)
                    quantity = random.randint(1, 2)
                    subtotal = item.cost * quantity
                    total_amount += subtotal
                    order_items_list.append({
                        "item": item,
                        "quantity": quantity,
                        "unit_price": item.cost,
                        "subtotal": subtotal
                    })
                
                if order_items_list and total_amount > 0:
                    # Create order
                    order = models.Order(order_date=order_date, total_amount=total_amount)
                    db.add(order)
                    db.flush()
                    
                    # Create order items and update inventory
                    for oi_data in order_items_list:
                        order_item = models.OrderItem(
                            order_id=order.id,
                            item_id=oi_data["item"].id,
                            quantity=oi_data["quantity"],
                            unit_price=oi_data["unit_price"],
                            subtotal=oi_data["subtotal"]
                        )
                        db.add(order_item)
                        
                        # Update inventory (reduce quantity)
                        inv = inventory_entries.get(oi_data["item"].id)
                        if inv:
                            inv.quantity -= oi_data["quantity"]
                            if inv.quantity < 0:
                                inv.quantity = 0
                    
                    sample_orders.append(order)
        
        db.commit()
        print("Database seeded successfully!")
        print(f"Created {len(created_items)} items with inventory entries")
        print(f"Created {len(sample_orders)} sample orders for historical data")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # Create tables if they don't exist
    models.Base.metadata.create_all(bind=engine)
    seed_database()

