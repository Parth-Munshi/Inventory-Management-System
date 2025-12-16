import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import InventoryPage from './pages/InventoryPage';
import ItemsPage from './pages/ItemsPage';
import OrdersPage from './pages/OrdersPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <h1 className="nav-title">Medical Inventory Management</h1>
            <div className="nav-links">
              <Link to="/" className="nav-link">Inventory</Link>
              <Link to="/items" className="nav-link">Items</Link>
              <Link to="/orders" className="nav-link">Historical Orders</Link>
            </div>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<InventoryPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

