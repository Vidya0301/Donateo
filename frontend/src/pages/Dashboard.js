import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { itemsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiPackage, FiGift, FiTrendingUp, FiMapPin, FiUser } from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [myDonations, setMyDonations] = useState([]);
  const [myReceivedItems, setMyReceivedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserItems();
  }, []);

  const fetchUserItems = async () => {
    try {
      setLoading(true);
      const [donationsRes, receivedRes] = await Promise.all([
        itemsAPI.getMyDonations(),
        itemsAPI.getMyReceivedItems()
      ]);
      setMyDonations(donationsRes.data);
      setMyReceivedItems(receivedRes.data);
    } catch (error) {
      toast.error('Failed to load your items');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (itemId, userId) => {
    try {
      if (!userId) {
        toast.error('Invalid user ID');
        return;
      }
      await itemsAPI.donateItem(itemId, userId);
      toast.success('Request approved! Item donated successfully.');
      fetchUserItems();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await itemsAPI.deleteItem(itemId);
        toast.success('Item deleted');
        fetchUserItems();
      } catch (error) {
        toast.error('Failed to delete item');
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <span className="badge badge-warning">Pending Approval</span>,
      available: <span className="badge badge-success">Available</span>,
      requested: <span className="badge badge-info">Requested</span>,
      donated: <span className="badge badge-secondary">Donated</span>
    };
    return badges[status];
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>Welcome back, {user?.name}!</h1>
            <p className="dashboard-subtitle">
              Manage your donations and items you've received
            </p>
          </div>
          <Link to="/donate" className="btn btn-primary">
            <FiPlus /> Donate New Item
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card card">
            <div className="stat-icon">
              <FiPackage />
            </div>
            <div className="stat-content">
              <h3>{myDonations.length}</h3>
              <p>Items Donated</p>
            </div>
          </div>

          <div className="stat-card card">
            <div className="stat-icon">
              <FiGift />
            </div>
            <div className="stat-content">
              <h3>{myDonations.filter(i => i.status === 'donated').length}</h3>
              <p>Successfully Donated</p>
            </div>
          </div>

          <div className="stat-card card">
            <div className="stat-icon">
              <FiTrendingUp />
            </div>
            <div className="stat-content">
              <h3>{myReceivedItems.length}</h3>
              <p>Items Received</p>
            </div>
          </div>
        </div>

        {/* My Donations Section */}
        <div className="items-section">
          <h2>My Donations</h2>
          
          {loading ? (
            <div className="spinner"></div>
          ) : myDonations.length === 0 ? (
            <div className="empty-state card">
              <FiPackage />
              <h3>No donations yet</h3>
              <p>Start sharing items with your community</p>
              <Link to="/donate" className="btn btn-primary">
                Donate Your First Item
              </Link>
            </div>
          ) : (
            <div className="items-list">
              {myDonations.map(item => (
                <div key={item._id} className="item-row card">
                  <img src={item.image || '/placeholder.jpg'} alt={item.itemName} />
                  <div className="item-info">
                    <h3>{item.itemName}</h3>
                    <p className="item-desc">{item.description}</p>
                    <div className="item-details">
                      <span className="category-tag">{item.category}</span>
                      <span className="location-tag">
                        <FiMapPin /> {item.location.city}
                      </span>
                    </div>
                  </div>
                  <div className="item-status">
                    {getStatusBadge(item.status)}
                    
                    {/* Show requests if item is available or requested */}
                    {item.requests && item.requests.length > 0 && item.status !== 'donated' && (
                      <div className="requests-info">
                        <p><strong>{item.requests.length} Request(s)</strong></p>
                        {item.requests.map((req, index) => (
                          <div key={req._id || index} className="request-item">
                            <div className="requester-info">
                              <FiUser />
                              <div>
                                <p><strong>{req.user?.name || 'Unknown User'}</strong></p>
                                {req.user?.phone && <p className="requester-phone">{req.user.phone}</p>}
                                {req.message && <p className="request-message">"{req.message}"</p>}
                              </div>
                            </div>
                            <button 
                              onClick={() => handleApproveRequest(item._id, req.user?._id)}
                              className="btn btn-sm btn-primary"
                              disabled={!req.user?._id}
                           >
                              Approve & Donate
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Show receiver if donated */}
                    {item.status === 'donated' && item.receiver && (
                      <div className="donated-to">
                        <p>Donated to:</p>
                        <p><strong>{item.receiver.name}</strong></p>
                        {item.receiver.phone && <p>{item.receiver.phone}</p>}
                      </div>
                    )}
                    
                    {/* Delete button for pending items */}
                    {item.status === 'pending' && (
                      <button 
                        onClick={() => handleDeleteItem(item._id)}
                        className="btn btn-sm btn-outline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items I've Received Section */}
        <div className="items-section" style={{marginTop: '3rem'}}>
          <h2>Items I've Received</h2>
          
          {loading ? (
            <div className="spinner"></div>
          ) : myReceivedItems.length === 0 ? (
            <div className="empty-state card">
              <FiGift />
              <h3>No items received yet</h3>
              <p>Browse available items to get started</p>
              <Link to="/browse" className="btn btn-primary">
                Browse Items
              </Link>
            </div>
          ) : (
            <div className="items-list">
              {myReceivedItems.map(item => (
                <div key={item._id} className="item-row card">
                  <img src={item.image || '/placeholder.jpg'} alt={item.itemName} />
                  <div className="item-info">
                    <h3>{item.itemName}</h3>
                    <p className="item-desc">{item.description}</p>
                    <p className="donor-info">
                      <FiUser /> Donated by: <strong>{item.donor?.name}</strong>
                      {item.donor?.phone && ` • ${item.donor.phone}`}
                    </p>
                  </div>
                  <div className="item-status">
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;