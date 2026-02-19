import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiUsers, FiPackage, FiCheckCircle, FiXCircle, FiTrendingUp } from 'react-icons/fi';
import './AdminPanel.css';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, itemsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getItems({ status: activeTab === 'pending' ? 'pending' : undefined })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setItems(itemsRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveItem = async (itemId) => {
    try {
      await adminAPI.approveItem(itemId);
      toast.success('Item approved!');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve item');
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      try {
        await adminAPI.removeItem(itemId);
        toast.success('Item removed');
        fetchData();
      } catch (error) {
        toast.error('Failed to remove item');
      }
    }
  };

  const handleToggleUser = async (userId, isActive) => {
    try {
      await adminAPI.updateUserStatus(userId, { isActive: !isActive });
      toast.success(`User ${!isActive ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  return (
    <div className="admin-page">
      <div className="container">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
          <p>Manage users, items, and monitor platform activity</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card card">
              <div className="stat-icon"><FiUsers /></div>
              <div className="stat-content">
                <h3>{stats.users.total}</h3>
                <p>Total Users</p>
                <small>{stats.users.donors} donors • {stats.users.receivers} receivers</small>
              </div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon"><FiPackage /></div>
              <div className="stat-content">
                <h3>{stats.items.total}</h3>
                <p>Total Items</p>
                <small>{stats.items.pending} pending approval</small>
              </div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon"><FiCheckCircle /></div>
              <div className="stat-content">
                <h3>{stats.items.donated}</h3>
                <p>Successfully Donated</p>
                <small>{stats.items.available} available</small>
              </div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon"><FiTrendingUp /></div>
              <div className="stat-content">
                <h3>{stats.items.requested}</h3>
                <p>Active Requests</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="admin-tabs">
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Items ({items.filter(i => !i.isApproved).length})
          </button>
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Items
          </button>
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users ({users.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="spinner"></div>
        ) : activeTab === 'users' ? (
          <div className="users-table card">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-badge">{user.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-secondary'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {user.role !== 'admin' && (
                        <button 
                          onClick={() => handleToggleUser(user._id, user.isActive)}
                          className={`btn btn-sm ${user.isActive ? 'btn-outline' : 'btn-primary'}`}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="items-list">
            {items.map(item => (
              <div key={item._id} className="item-row card">
                <img src={item.image || '/placeholder.jpg'} alt={item.itemName} />
                <div className="item-info">
                  <h3>{item.itemName}</h3>
                  <p>{item.description}</p>
                  <div className="item-meta">
                    <span className="badge badge-info">{item.category}</span>
                    <span>Donor: {item.donor.name}</span>
                    <span>Location: {item.location.city}</span>
                  </div>
                </div>
                <div className="item-actions">
                  {!item.isApproved && (
                    <button 
                      onClick={() => handleApproveItem(item._id)}
                      className="btn btn-primary"
                    >
                      <FiCheckCircle /> Approve
                    </button>
                  )}
                  <button 
                    onClick={() => handleRemoveItem(item._id)}
                    className="btn btn-outline"
                  >
                    <FiXCircle /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
