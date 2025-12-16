from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ItemBase(BaseModel):
    name: str
    item_type: str
    cost: float
    description: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    item_type: Optional[str] = None
    cost: Optional[float] = None
    description: Optional[str] = None

class ItemResponse(ItemBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class InventoryBase(BaseModel):
    item_id: int
    quantity: int

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    quantity: int

class InventoryResponse(BaseModel):
    id: int
    item_id: int
    quantity: int
    item: ItemResponse
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class OrderItemCreate(BaseModel):
    item_id: int
    quantity: int

class OrderCreate(BaseModel):
    items: list[OrderItemCreate]

class OrderItemResponse(BaseModel):
    id: int
    item_id: int
    quantity: int
    unit_price: float
    subtotal: float
    item: ItemResponse
    
    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    order_date: datetime
    total_amount: float
    created_at: datetime
    order_items: list[OrderItemResponse]
    
    class Config:
        from_attributes = True

class WeeklyOrderStats(BaseModel):
    week_start: str
    week_end: str
    total_orders: int
    total_amount: float
    item_counts: dict[str, int]

