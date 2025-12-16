import React, { useState, useEffect } from 'react';
import { inventoryAPI, itemsAPI } from '../services/api';
import '../App.css';

function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [inventoryRes, itemsRes] = await Promise.all([
        inventoryAPI.getAll(),
        itemsAPI.getAll(),
      ]);
      setInventory(inventoryRes.data);
      setItems(itemsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToInventory = () => {
    if (!selectedItem || quantity <= 0) {
      alert('Please select an item and enter a valid quantity');
      return;
    }

    inventoryAPI
      .add({ item_id: selectedItem.id, quantity: parseInt(quantity) })
      .then(() => {
        loadData();
        setShowAddModal(false);
        setSelectedItem(null);
        setQuantity(1);
      })
      .catch((error) => {
        console.error('Error adding to inventory:', error);
        alert('Error adding item to inventory');
      });
  };

  const handleRemoveFromInventory = (itemId, currentQuantity) => {
    if (quantity <= 0 || quantity > currentQuantity) {
      alert('Please enter a valid quantity to remove');
      return;
    }

    inventoryAPI
      .remove(itemId, quantity)
      .then(() => {
        loadData();
        setShowRemoveModal(false);
        setSelectedItem(null);
        setQuantity(1);
      })
      .catch((error) => {
        console.error('Error removing from inventory:', error);
        alert('Error removing item from inventory');
      });
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setSelectedItem(null);
    setQuantity(1);
  };

  const openRemoveModal = (inventoryItem) => {
    setShowRemoveModal(true);
    setSelectedItem(inventoryItem);
    setQuantity(1);
  };

  if (loading) {
    return <div className="card">Loading...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">Inventory</h2>
          <button className="button button-primary" onClick={openAddModal}>
            Add to Inventory
          </button>
        </div>

        {inventory.length === 0 ? (
          <p>No items in inventory. Add items to get started.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Type</th>
                <th>Cost</th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.item.name}</td>
                  <td>{inv.item.item_type}</td>
                  <td>${inv.item.cost.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${inv.quantity > 5 ? 'badge-success' : inv.quantity > 2 ? 'badge-warning' : 'badge-danger'}`}>
                      {inv.quantity}
                    </span>
                  </td>
                  <td>
                    <button
                      className="button button-danger"
                      onClick={() => openRemoveModal(inv)}
                      style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add to Inventory Modal */}
      {showAddModal && (
        <div className="modal" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add to Inventory</h3>
              <button className="close-button" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Select Item</label>
              <select
                className="input"
                value={selectedItem?.id || ''}
                onChange={(e) => {
                  const item = items.find((i) => i.id === parseInt(e.target.value));
                  setSelectedItem(item);
                }}
              >
                <option value="">Choose an item...</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - ${item.cost.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                className="input"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="button-group">
              <button className="button button-primary" onClick={handleAddToInventory}>
                Add
              </button>
              <button className="button button-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove from Inventory Modal */}
      {showRemoveModal && selectedItem && (
        <div className="modal" onClick={() => setShowRemoveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Remove from Inventory</h3>
              <button className="close-button" onClick={() => setShowRemoveModal(false)}>
                ×
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Item</label>
              <input
                className="input"
                value={selectedItem.item.name}
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label">Current Quantity: {selectedItem.quantity}</label>
              <label className="form-label">Quantity to Remove</label>
              <input
                type="number"
                className="input"
                min="1"
                max={selectedItem.quantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="button-group">
              <button
                className="button button-danger"
                onClick={() => handleRemoveFromInventory(selectedItem.item_id, selectedItem.quantity)}
              >
                Remove
              </button>
              <button className="button button-secondary" onClick={() => setShowRemoveModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryPage;

