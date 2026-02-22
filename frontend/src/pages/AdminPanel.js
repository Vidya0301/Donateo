import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiUsers, FiPackage, FiCheckCircle, FiXCircle, FiTrendingUp } from 'react-icons/fi';
import './AdminPanel.css';
import { chatAPI } from '../services/api';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const promises = [
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getItems({ status: activeTab === 'pending' ? 'pending' : undefined })
      ];

      if (activeTab === 'chats') {
        promises.push(chatAPI.getAllChats());
      }

      const results = await Promise.all(promises);
      setStats(results[0].data);
      setUsers(results[1].data);
      setItems(results[2].data);

      if (activeTab === 'chats' && results[3]) {
        setChats(results[3].data);
      }
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Get sender label for admin view
  const getSenderLabel = (msg, chat) => {
    if (msg.isBot) return '🤖 Donateo Assistant';
    if (!msg.sender) return 'Unknown';
    const senderId = msg.sender._id || msg.sender;
    if (senderId === (chat.donor._id || chat.donor)) return `Donor (${chat.donor.name})`;
    if (senderId === (chat.receiver._id || chat.receiver)) return `Receiver (${chat.receiver.name})`;
    return msg.sender.name || 'User';
  };

  const getSenderClass = (msg, chat) => {
    if (msg.isBot) return 'admin-msg-bot';
    const senderId = msg.sender?._id || msg.sender;
    if (senderId === (chat.donor._id || chat.donor)) return 'admin-msg-donor';
    if (senderId === (chat.receiver._id || chat.receiver)) return 'admin-msg-receiver';
    return 'admin-msg-user';
  };

  const selectedChatData = chats.find(c => c._id === selectedChat);

  return (
    <div className="admin-page">
      <div className="container">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
          <p>Manage users, items, and monitor platform activity</p>
        </div>

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
          <button
            className={`tab ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            Chats ({chats.length})
          </button>
        </div>

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
                    <td><span className="role-badge">{user.role}</span></td>
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
        ) : activeTab === 'chats' ? (
          <div className="chats-list">
            {chats.length === 0 ? (
              <p className="no-data">No chats found.</p>
            ) : (
              chats
                .filter(chat => chat.item && chat.donor && chat.receiver)
                .map(chat => (
                  <div key={chat._id} className="chat-item card">
                    <div>
                      <h4>{chat.item.itemName}</h4>
                      <p>Donor: {chat.donor.name} ({chat.donor.phone || 'N/A'})</p>
                      <p>Receiver: {chat.receiver.name} ({chat.receiver.phone || 'N/A'})</p>
                      <p>Messages: {chat.messages?.length || 0}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedChat(chat._id);
                        setSelectedItemName(chat.item.itemName);
                        setShowChat(true);
                      }}
                      className="btn btn-primary"
                    >
                      View Chat
                    </button>
                  </div>
                ))
            )}
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
                    <span>Donor: {item.donor?.name || 'N/A'}</span>
                    <span>Location: {item.location?.city || 'N/A'}</span>
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

        {/* Admin Chat Viewer Modal */}
        {showChat && selectedChat && selectedChatData && (
          <div className="chat-modal-overlay" onClick={() => setShowChat(false)}>
            <div className="admin-chat-modal card" onClick={e => e.stopPropagation()}>
              <div className="admin-chat-modal-header">
                <div>
                  <h3>Chat: {selectedItemName}</h3>
                  <p className="admin-chat-subtitle">
                    👤 Donor: <strong>{selectedChatData.donor.name}</strong> &nbsp;|&nbsp;
                    👤 Receiver: <strong>{selectedChatData.receiver.name}</strong>
                  </p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setShowChat(false)}>
                  Close
                </button>
              </div>

              <div className="admin-chat-messages">
                {selectedChatData.messages?.length === 0 ? (
                  <p className="no-data">No messages yet.</p>
                ) : (
                  selectedChatData.messages?.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`admin-chat-message ${getSenderClass(msg, selectedChatData)}`}
                    >
                      <div className="admin-msg-header">
                        <span className="admin-msg-sender">
                          {getSenderLabel(msg, selectedChatData)}
                        </span>
                        <span className="admin-msg-time">
                          {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="admin-msg-content">{msg.content || msg.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;