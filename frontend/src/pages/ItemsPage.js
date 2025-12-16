import React, { useState, useEffect } from 'react';
import { itemsAPI, inventoryAPI } from '../services/api';
import '../App.css';

function ItemsPage() {
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    item_type: '',
    cost: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsRes, inventoryRes] = await Promise.all([
        itemsAPI.getAll(),
        inventoryAPI.getAll(),
      ]);
      setItems(itemsRes.data);
      setInventory(inventoryRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading items data');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      item_type: '',
      cost: '',
      description: '',
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      item_type: item.item_type,
      cost: item.cost.toString(),
      description: item.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      cost: parseFloat(formData.cost),
    };

    if (editingItem) {
      itemsAPI
        .update(editingItem.id, submitData)
        .then(() => {
          loadData();
          setShowModal(false);
        })
        .catch((error) => {
          console.error('Error updating item:', error);
          alert(error.response?.data?.detail || 'Error updating item');
        });
    } else {
      itemsAPI
        .create(submitData)
        .then(() => {
          loadData();
          setShowModal(false);
        })
        .catch((error) => {
          console.error('Error creating item:', error);
          alert(error.response?.data?.detail || 'Error creating item');
        });
    }
  };

  const handleDelete = (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      itemsAPI
        .delete(itemId)
        .then(() => {
          loadData();
        })
        .catch((error) => {
          console.error('Error deleting item:', error);
          alert(error.response?.data?.detail || 'Error deleting item');
        });
    }
  };

  const getInventoryQuantity = (itemId) => {
    const inv = inventory.find((i) => i.item_id === itemId);
    return inv ? inv.quantity : 0;
  };

  if (loading) {
    return <div className="card">Loading...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">Medical Items</h2>
          <button className="button button-primary" onClick={openAddModal}>
            Add New Item
          </button>
        </div>

        {items.length === 0 ? (
          <p>No items found. Add items to get started.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Cost</th>
                <th>In Inventory</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.item_type}</td>
                  <td>${item.cost.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${getInventoryQuantity(item.id) > 0 ? 'badge-success' : 'badge-danger'}`}>
                      {getInventoryQuantity(item.id)}
                    </span>
                  </td>
                  <td>{item.description || 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="button button-secondary"
                        onClick={() => openEditModal(item)}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Edit
                      </button>
                      <button
                        className="button button-danger"
                        onClick={() => handleDelete(item.id)}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
              <button className="close-button" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Item Type</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={formData.item_type}
                  onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                  placeholder="e.g., MRI Machine, X-Ray Machine"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cost ($)</label>
                <input
                  type="number"
                  className="input"
                  required
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="input"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="button-group">
                <button type="submit" className="button button-primary">
                  {editingItem ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemsPage;

