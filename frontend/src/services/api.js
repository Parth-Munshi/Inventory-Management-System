import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const itemsAPI = {
  getAll: () => api.get('/items'),
  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
};

export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getByItemId: (itemId) => api.get(`/inventory/${itemId}`),
  add: (data) => api.post('/inventory', data),
  update: (itemId, data) => api.put(`/inventory/${itemId}`, data),
  remove: (itemId, quantity) => api.delete(`/inventory/${itemId}?quantity=${quantity || ''}`),
};

export const ordersAPI = {
  getAll: () => api.get('/orders'),
  create: (data) => api.post('/orders', data),
  getWeeklyStats: (weeks = 12) => api.get(`/orders/stats/weekly?weeks=${weeks}`),
};

export default api;

