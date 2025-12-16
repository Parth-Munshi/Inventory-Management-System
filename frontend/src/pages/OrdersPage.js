import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ordersAPI } from '../services/api';
import '../App.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

function OrdersPage() {
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('line'); // 'line', 'bar', 'pie'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await ordersAPI.getWeeklyStats(12);
      setWeeklyStats(response.data);
    } catch (error) {
      console.error('Error loading order stats:', error);
      alert('Error loading order statistics');
    } finally {
      setLoading(false);
    }
  };

  const prepareLineData = () => {
    return weeklyStats.map((stat) => ({
      week: stat.week_start,
      orders: stat.total_orders,
      amount: stat.total_amount,
    }));
  };

  const preparePieData = () => {
    const itemTotals = {};
    weeklyStats.forEach((stat) => {
      Object.entries(stat.item_counts).forEach(([item, count]) => {
        itemTotals[item] = (itemTotals[item] || 0) + count;
      });
    });
    return Object.entries(itemTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  const calculateTrend = () => {
    if (weeklyStats.length < 2) return { direction: 'stable', percentage: 0 };
    const recent = weeklyStats.slice(-4);
    const older = weeklyStats.slice(-8, -4);
    const recentAvg = recent.reduce((sum, s) => sum + s.total_orders, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, s) => sum + s.total_orders, 0) / older.length : recentAvg;
    const change = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100;
    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      percentage: Math.abs(change).toFixed(1),
    };
  };

  if (loading) {
    return <div className="card">Loading order statistics...</div>;
  }

  const trend = calculateTrend();
  const lineData = prepareLineData();
  const pieData = preparePieData();

  return (
    <div>
      <div className="card">
        <h2 className="card-title">Historical Orders Analysis</h2>
        
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Trend Analysis</h3>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: trend.direction === 'up' ? '#00C49F' : trend.direction === 'down' ? '#FF8042' : '#8884d8' }}>
                  {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
                </span>
                <span style={{ marginLeft: '0.5rem', fontSize: '1.2rem' }}>
                  Orders are {trend.direction === 'up' ? 'increasing' : trend.direction === 'down' ? 'decreasing' : 'stable'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {trend.percentage}%
                </span>
                <span style={{ marginLeft: '0.5rem' }}>change</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
          <button
            className={`button ${selectedView === 'line' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => setSelectedView('line')}
          >
            Line Chart
          </button>
          <button
            className={`button ${selectedView === 'bar' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => setSelectedView('bar')}
          >
            Bar Chart
          </button>
          <button
            className={`button ${selectedView === 'pie' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => setSelectedView('pie')}
          >
            Pie Chart
          </button>
        </div>

        {weeklyStats.length === 0 ? (
          <p>No order data available. Create some orders to see statistics.</p>
        ) : (
          <div style={{ height: '400px', marginTop: '2rem' }}>
            {selectedView === 'line' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Number of Orders"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="amount"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Total Amount ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {selectedView === 'bar' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#8884d8" name="Number of Orders" />
                  <Bar dataKey="amount" fill="#82ca9d" name="Total Amount ($)" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {selectedView === 'pie' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Weekly Breakdown</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Week Start</th>
                <th>Week End</th>
                <th>Total Orders</th>
                <th>Total Amount</th>
                <th>Items Ordered</th>
              </tr>
            </thead>
            <tbody>
              {weeklyStats.map((stat, index) => (
                <tr key={index}>
                  <td>{stat.week_start}</td>
                  <td>{stat.week_end}</td>
                  <td>{stat.total_orders}</td>
                  <td>${stat.total_amount.toLocaleString()}</td>
                  <td>
                    {Object.entries(stat.item_counts)
                      .map(([item, count]) => `${item}: ${count}`)
                      .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OrdersPage;

