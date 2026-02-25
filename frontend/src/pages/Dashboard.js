import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { itemsAPI, chatAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiPackage, FiGift, FiTrendingUp, FiMapPin, FiUser, FiCalendar, FiClock } from 'react-icons/fi';
import ChatModal from '../components/ChatModal';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [myDonations, setMyDonations] = useState([]);
  const [myReceivedItems, setMyReceivedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [donationChats, setDonationChats] = useState({});

  useEffect(() => {
    fetchUserItems();
  }, []);

  const fetchUserItems = async () => {
    try {
      setLoading(true);
      const [donationsRes, receivedRes, myChatsRes] = await Promise.all([
        itemsAPI.getMyDonations(),
        itemsAPI.getMyReceivedItems(),
        chatAPI.getMyChats()
      ]);
      setMyDonations(donationsRes.data);
      setMyReceivedItems(receivedRes.data);

      const chatMap = {};
      myChatsRes.data.forEach(chat => {
        if (chat.item?._id) {
          chatMap[chat.item._id] = chat;
        }
      });
      setDonationChats(chatMap);  // used by both donor and receiver
    } catch (error) {
      toast.error('Failed to load your items');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (itemId, userId, itemName) => {
    try {
      if (!userId) {
        toast.error('Invalid user ID');
        return;
      }
      await itemsAPI.donateItem(itemId, userId);
      const chatResponse = await chatAPI.createChat({ itemId, receiverId: userId });
      toast.success('Request approved! Opening chat...');
      setSelectedChat(chatResponse.data._id);
      setSelectedItemName(itemName);
      setShowChat(true);
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

  const handleOpenDonorChat = (itemId, itemName) => {
    const chat = donationChats[itemId];
    if (chat) {
      setSelectedChat(chat._id);
      setSelectedItemName(itemName);
      setShowChat(true);
    } else {
      toast.error('Chat not found for this item.');
    }
  };

  const handleOpenReceiverChat = async (itemId, itemName) => {
    try {
      const response = await chatAPI.getMyChats();
      const chats = response.data;
      const chat = chats.find(c => c.item._id === itemId);
      if (chat) {
        setSelectedChat(chat._id);
        setSelectedItemName(itemName);
        setShowChat(true);
      } else {
        toast.error('Chat not found. The donor may not have created it yet.');
      }
    } catch (error) {
      toast.error('Failed to open chat');
    }
  };

  const handleMarkAsDonated = async (itemId) => {
    if (!window.confirm('Confirm that you have physically handed over this item?')) return;
    try {
      await itemsAPI.markAsDonated(itemId);
      toast.success('Marked as handed over!');
      fetchUserItems();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleMarkAsReceived = async (itemId) => {
    if (!window.confirm('Confirm that you have received this item?')) return;
    try {
      await itemsAPI.markAsReceived(itemId);
      toast.success('Item marked as received!');
      fetchUserItems();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const getStatusBadge = (status, chat, item) => {
    if (status === 'donated' && item?.receiverConfirmed) {
      return <span className="badge badge-completed">✅ Completed</span>;
    }
    if (status === 'donated' && item?.donorConfirmed && !item?.receiverConfirmed) {
      return <span className="badge badge-handover">📦 Awaiting Receipt</span>;
    }
    if (status === 'donated' && chat?.pickupDetails?.location && !chat?.pickupDetails?.confirmedByReceiver) {
      return <span className="badge badge-scheduled">📅 Pickup Scheduled</span>;
    }
    if (status === 'donated' && chat?.pickupDetails?.confirmedByReceiver) {
      return <span className="badge badge-confirmed">✅ Pickup Confirmed</span>;
    }
    const badges = {
      pending: <span className="badge badge-warning">Pending Approval</span>,
      available: <span className="badge badge-success">Available</span>,
      requested: <span className="badge badge-info">Requested</span>,
      donated: <span className="badge badge-secondary">Donated</span>
    };
    return badges[status];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>Welcome back, {user?.name}!</h1>
            <p className="dashboard-subtitle">Manage your donations and items you've received</p>
          </div>
          <Link to="/donate" className="btn btn-primary">
            <FiPlus /> Donate New Item
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card card">
            <div className="stat-icon"><FiPackage /></div>
            <div className="stat-content">
              <h3>{myDonations.length}</h3>
              <p>Items Donated</p>
            </div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon"><FiGift /></div>
            <div className="stat-content">
              <h3>{myDonations.filter(i => i.status === 'donated').length}</h3>
              <p>Successfully Donated</p>
            </div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon"><FiTrendingUp /></div>
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
              <Link to="/donate" className="btn btn-primary">Donate Your First Item</Link>
            </div>
          ) : (
            <div className="items-list">
              {myDonations.map(item => {
                const chat = donationChats[item._id];
                const pickup = chat?.pickupDetails;
                return (
                  <div key={item._id} className="item-row card">
                    <img src={item.image || '/placeholder.jpg'} alt={item.itemName} />
                    <div className="item-info">
                      <h3>{item.itemName}</h3>
                      <p className="item-desc">{item.description}</p>
                      <div className="item-details">
                        <span className="category-tag">{item.category}</span>
                        <span className="location-tag"><FiMapPin /> {item.location.city}</span>
                      </div>
                      {pickup && pickup.location && !item.donorConfirmed && (
                        <div className="pickup-details-card">
                          <p className="pickup-title">📦 Pickup Details</p>
                          <p><FiMapPin /> <strong>Location:</strong> {pickup.location}</p>
                          {pickup.date && <p><FiCalendar /> <strong>Date:</strong> {formatDate(pickup.date)}</p>}
                          {pickup.time && <p><FiClock /> <strong>Time:</strong> {pickup.time}</p>}
                          <span className={`pickup-status-badge ${pickup.confirmedByReceiver ? 'confirmed' : 'pending'}`}>
                            {pickup.confirmedByReceiver ? '✅ Receiver Confirmed' : '⏳ Awaiting Confirmation'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="item-status">
                      {getStatusBadge(item.status, chat, item)}
                      {item.requests && item.requests.length > 0 && item.status !== 'donated' && (
                        <div className="requests-info">
                          <p><strong>{item.requests.length} Request(s)</strong></p>
                          {item.requests.map((req, index) => (
                            <div key={req._id || index} className="request-item">
                              <div className="requester-info">
                                <FiUser />
                                <div>
                                  <p><strong>{req.user?.name || 'Unknown User'}</strong></p>
                                  {req.message && <p className="request-message">"{req.message}"</p>}
                                </div>
                              </div>
                              <button
                                onClick={() => handleApproveRequest(item._id, req.user?._id, item.itemName)}
                                className="btn btn-sm btn-primary"
                                disabled={!req.user?._id}
                              >
                                Approve & Chat
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.status === 'donated' && item.receiver && (
                        <div className="donated-to">
                          <p>{item.donorConfirmed ? 'Donated to:' : 'Scheduled to:'}</p>
                          <p><strong>{item.receiver.name}</strong></p>
                          <div className="donated-actions">
                            {chat && (
                              <button
                                onClick={() => handleOpenDonorChat(item._id, item.itemName)}
                                className="btn btn-sm btn-primary"
                              >
                                💬 Chat with Receiver
                              </button>
                            )}
                            {!item.donorConfirmed && (
                              <button
                                onClick={() => handleMarkAsDonated(item._id)}
                                className="btn btn-sm btn-success"
                              >
                                ✅ Mark as Handed Over
                              </button>
                            )}
                          </div>
                          {item.donorConfirmed && (
                            <p className="confirmed-note">✔ You marked this as handed over</p>
                          )}
                        </div>
                      )}
                      {item.status === 'pending' && (
                        <button onClick={() => handleDeleteItem(item._id)} className="btn btn-sm btn-outline">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Pickups Section — items assigned but not yet received */}
        {myReceivedItems.filter(i => !i.receiverConfirmed).length > 0 && (
          <div className="items-section" style={{ marginTop: '3rem' }}>
            <h2>Pending Pickups</h2>
            <div className="items-list">
              {myReceivedItems.filter(i => !i.receiverConfirmed).map(item => {
                const rchat = donationChats[item._id];
                const rpickup = rchat?.pickupDetails;
                return (
                  <div key={item._id} className="item-row card">
                    <img src={item.image || '/placeholder.jpg'} alt={item.itemName} />
                    <div className="item-info">
                      <h3>{item.itemName}</h3>
                      <p className="item-desc">{item.description}</p>
                      <div className="item-details">
                        <span className="category-tag">{item.category}</span>
                        <span className="location-tag"><FiMapPin /> {item.location?.city}</span>
                      </div>
                      <p className="donor-info"><FiUser /> Donated by: <strong>{item.donor?.name}</strong></p>
                      {/* Use chat pickup details OR backend-provided pickupScheduled fields */}
                    {(rpickup?.location || item.pickupScheduled) && (
                        <div className="pickup-details-card">
                          <p className="pickup-title">📦 Pickup Details</p>
                          <p><FiMapPin /> <strong>Location:</strong> {rpickup?.location || item.pickupLocation}</p>
                          {(rpickup?.date || item.pickupDate) && <p><FiCalendar /> <strong>Date:</strong> {formatDate(rpickup?.date || item.pickupDate)}</p>}
                          {(rpickup?.time || item.pickupTime) && <p><FiClock /> <strong>Time:</strong> {rpickup?.time || item.pickupTime}</p>}
                          <span className={`pickup-status-badge ${(rpickup?.confirmedByReceiver || item.pickupConfirmed) ? 'confirmed' : 'pending'}`}>
                            {(rpickup?.confirmedByReceiver || item.pickupConfirmed) ? '✅ You Confirmed Pickup' : '⏳ Awaiting Your Confirmation'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="item-status">
                      {getStatusBadge(item.status, rchat, item)}
                      <div className="donated-to">
                        <p>Scheduled from:</p>
                        <p><strong>{item.donor?.name}</strong></p>
                        <div className="donated-actions">
                          {rchat && (
                            <button
                              onClick={() => handleOpenReceiverChat(item._id, item.itemName)}
                              className="btn btn-sm btn-primary"
                            >
                              💬 Chat with Donor
                            </button>
                          )}
                          {!item.receiverConfirmed && (
                            <button
                              onClick={() => handleMarkAsReceived(item._id)}
                              className="btn btn-sm btn-success"
                            >
                              ✅ Mark as Received
                            </button>
                          )}
                        </div>
                        {!item.donorConfirmed && !rpickup?.location && (
                          <p className="confirmed-note" style={{color:'#856404'}}>⏳ Waiting for pickup details</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items I've Received Section — only truly received items */}
        <div className="items-section" style={{ marginTop: '3rem' }}>
          <h2>Items I've Received</h2>
          {loading ? (
            <div className="spinner"></div>
          ) : myReceivedItems.filter(i => i.receiverConfirmed).length === 0 ? (
            <div className="empty-state card">
              <FiGift />
              <h3>No items received yet</h3>
              <p>Browse available items to get started</p>
              <Link to="/browse" className="btn btn-primary">Browse Items</Link>
            </div>
          ) : (
            <div className="items-list">
              {myReceivedItems.filter(i => i.receiverConfirmed).map(item => (
                <div key={item._id} className="item-row card">
                  <img src={item.image || '/placeholder.jpg'} alt={item.itemName} />
                  <div className="item-info">
                    <h3>{item.itemName}</h3>
                    <p className="item-desc">{item.description}</p>
                    <p className="donor-info"><FiUser /> Donated by: <strong>{item.donor?.name}</strong></p>
                  </div>
                  <div className="item-status">
                    {getStatusBadge(item.status, null, item)}
                    <button
                      onClick={() => handleOpenReceiverChat(item._id, item.itemName)}
                      className="btn btn-sm btn-primary"
                      style={{ marginTop: '0.5rem' }}
                    >
                      💬 Chat with Donor
                    </button>
                    <p className="confirmed-note">✔ You marked this as received</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Modal */}
        {showChat && selectedChat && (
          <ChatModal
            chatId={selectedChat}
            itemName={selectedItemName}
            onClose={() => {
              setShowChat(false);
              setSelectedChat(null);
              fetchUserItems();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;