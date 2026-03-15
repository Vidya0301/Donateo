import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { itemsAPI, chatAPI, ratingAPI } from '../services/api';
import { getBadge, getNextBadge } from '../utils/badges';
import { toast } from 'react-toastify';
import { FiPlus, FiPackage, FiGift, FiTrendingUp, FiMapPin, FiUser, FiCalendar, FiClock, FiAward, FiHeart, FiTrash2 } from 'react-icons/fi';
import ChatModal from '../components/ChatModal';
import { ZoomableImage } from '../components/ImagePreviewModal';
import { downloadCertificate } from '../utils/generateCertificate';
import RatingModal from '../components/RatingModal';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [myDonations, setMyDonations]         = useState([]);
  const [myReceivedItems, setMyReceivedItems] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [showChat, setShowChat]               = useState(false);
  const [selectedChat, setSelectedChat]       = useState(null);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [donationChats, setDonationChats]     = useState({});
  const [wishlist, setWishlist]               = useState([]);
  const [ratingModal, setRatingModal]         = useState(null);
  const [editItem, setEditItem]               = useState(null); // item being edited
  const [editLoading, setEditLoading]         = useState(false);
  const [ratedItems, setRatedItems]           = useState({});

  useEffect(() => { fetchUserItems(); }, []);

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
      myChatsRes.data.forEach(chat => { if (chat.item?._id) chatMap[chat.item._id] = chat; });
      setDonationChats(chatMap);

      // Fetch wishlist
      try {
        const wRes = await itemsAPI.getWishlist();
        setWishlist(wRes.data);
      } catch {}

      // Check which completed items have already been rated
      const completed = [...donationsRes.data, ...receivedRes.data].filter(
        i => i.donorConfirmed && i.receiverConfirmed
      );
      const ratedMap = {};
      await Promise.all(completed.map(async (item) => {
        try {
          const r = await ratingAPI.check(item._id);
          ratedMap[item._id] = r.data;
        } catch {}
      }));
      setRatedItems(ratedMap);

    } catch { toast.error('Failed to load your items'); }
    finally { setLoading(false); }
  };

  const handleApproveRequest = async (itemId, userId, itemName) => {
    try {
      if (!userId) { toast.error('Invalid user ID'); return; }
      await itemsAPI.donateItem(itemId, userId);
      const chatResponse = await chatAPI.createChat({ itemId, receiverId: userId });
      toast.success('Request approved! Opening chat...');
      setSelectedChat(chatResponse.data._id);
      setSelectedItemName(itemName);
      setShowChat(true);
      fetchUserItems();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to approve request'); }
  };

  const handleDenyRequest = async (itemId, userId, userName) => {
    if (!window.confirm(`Deny request from ${userName}?`)) return;
    try {
      await itemsAPI.denyRequest(itemId, userId);
      toast.success(`Request from ${userName} denied`);
      fetchUserItems();
    } catch (error) { toast.error('Failed to deny request'); }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try { await itemsAPI.deleteItem(itemId); toast.success('Item deleted'); fetchUserItems(); }
    catch { toast.error('Failed to delete item'); }
  };

  const handleEditSave = async () => {
    try {
      setEditLoading(true);
      await itemsAPI.updateItem(editItem._id, {
        itemName:    editItem.itemName,
        description: editItem.description,
        condition:   editItem.condition,
        category:    editItem.category,
      });
      toast.success('✅ Item updated!');
      setEditItem(null);
      fetchUserItems();
    } catch (err) { toast.error('Failed to update item'); }
    finally { setEditLoading(false); }
  };

  const handleOpenDonorChat = (itemId, itemName) => {
    const chat = donationChats[itemId];
    if (chat) { setSelectedChat(chat._id); setSelectedItemName(itemName); setShowChat(true); }
    else toast.error('Chat not found for this item.');
  };

  const handleOpenReceiverChat = async (itemId, itemName) => {
    try {
      const response = await chatAPI.getMyChats();
      const chat = response.data.find(c => c.item._id === itemId);
      if (chat) { setSelectedChat(chat._id); setSelectedItemName(itemName); setShowChat(true); }
      else toast.error('Chat not found. The donor may not have created it yet.');
    } catch { toast.error('Failed to open chat'); }
  };

  const handleMarkAsDonated = async (itemId) => {
    if (!window.confirm('Confirm that you have physically handed over this item?')) return;
    try { await itemsAPI.markAsDonated(itemId); toast.success('Marked as handed over!'); fetchUserItems(); }
    catch (error) { toast.error(error.response?.data?.message || 'Failed to update status'); }
  };

  const handleMarkAsReceived = async (itemId) => {
    if (!window.confirm('Confirm that you have received this item?')) return;
    try { await itemsAPI.markAsReceived(itemId); toast.success('Item marked as received!'); fetchUserItems(); }
    catch (error) { toast.error(error.response?.data?.message || 'Failed to update status'); }
  };

  const handleRemoveWishlist = async (itemId) => {
    try {
      await itemsAPI.toggleWishlist(itemId);
      setWishlist(prev => prev.filter(i => i._id !== itemId));
      toast.success('💔 Removed from wishlist');
    } catch { toast.error('Failed to remove'); }
  };

  const handleDownloadCertificate = (item) => {
    try {
      downloadCertificate({
        donorName:    user?.name || 'Donor',
        itemName:     item.itemName,
        receiverName: item.receiver?.name || 'Recipient',
        donatedAt:    item.donorConfirmedAt || item.updatedAt,
        adminName:    'Nila'
      });
      toast.success('🏅 Certificate downloaded!');
    } catch (err) {
      toast.error('Failed to generate certificate');
      console.error(err);
    }
  };

  const getStatusBadge = (status, chat, item) => {
    if (status === 'donated' && item?.receiverConfirmed && item?.donorConfirmed)
      return <span className="badge badge-completed">✅ Completed</span>;
    if (status === 'donated' && item?.donorConfirmed && !item?.receiverConfirmed)
      return <span className="badge badge-handover">📦 Awaiting Receipt</span>;
    if (status === 'donated' && chat?.pickupDetails?.confirmedByReceiver && !item?.donorConfirmed)
      return <span className="badge badge-confirmed">✅ Pickup Confirmed</span>;
    if (status === 'donated' && chat?.pickupDetails?.location && !item?.donorConfirmed)
      return <span className="badge badge-scheduled">📅 Pickup Scheduled</span>;
    if (status === 'donated' && !item?.donorConfirmed)
      return <span className="badge badge-info">🤝 Request Approved</span>;
    return {
      pending:   <span className="badge badge-warning">Pending Approval</span>,
      available: <span className="badge badge-success">Available</span>,
      requested: <span className="badge badge-info">Requested</span>,
      donated:   <span className="badge badge-secondary">Donated</span>,
      expired:   <span className="badge" style={{background:'#f0f0f0',color:'#888'}}>⏱ Expired</span>
    }[status];
  };


  const getPickupReminderBadge = (pickupDate) => {
    if (!pickupDate) return null;
    const pickup = new Date(pickupDate);
    const today  = new Date();
    // Strip time — compare calendar dates only
    pickup.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((pickup - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0)  return null; // past
    if (diffDays === 0) return <span className="pickup-reminder-badge">⏰ Today!</span>;
    if (diffDays === 1) return <span className="pickup-reminder-badge pickup-reminder-soon">⏰ Tomorrow</span>;
    return <span className="pickup-reminder-badge pickup-reminder-future">📅 Reminder Set</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };


  const CONDITION_STYLES = {
    'new':      { label: '🌟 New',       cls: 'condition-new' },
    'like-new': { label: '✨ Like New',  cls: 'condition-likenew' },
    'good':     { label: '👍 Good',      cls: 'condition-good' },
    'fair':     { label: '🔄 Fair',      cls: 'condition-fair' },
  };

  const completedDonations = myDonations.filter(i => i.donorConfirmed && i.receiverConfirmed); // for certificates
  const donatedCount = myDonations.filter(i => i.status === 'donated').length; // for badges

  return (
    <div className="dashboard-page">
      <div className="container">

        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1>Welcome back, {user?.name}!</h1>
            {(() => {
              const badge = getBadge(donatedCount);
              const next  = getNextBadge(donatedCount);
              return (
                <div className="dashboard-badge-row">
                  {badge ? (
                    <span className="dash-badge" style={{ background: badge.color + '22', border: `1.5px solid ${badge.color}`, color: badge.color }}>
                      {badge.emoji} {badge.label}
                    </span>
                  ) : (
                    <span className="dash-badge dash-badge--none">🌱 Donate your first item to earn a badge!</span>
                  )}
                  {next && (
                    <span className="dash-badge-next">
                      🎯 {next.min - donatedCount} more → {next.emoji} {next.label}
                    </span>
                  )}
                </div>
              );
            })()}
            <p className="dashboard-subtitle">Manage your donations and items you've received</p>
          </div>
          <Link to="/donate" className="btn btn-primary"><FiPlus /> Donate New Item</Link>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card card">
            <div className="stat-icon"><FiPackage /></div>
            <div className="stat-content"><h3>{myDonations.length}</h3><p>Items Donated</p></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon"><FiGift /></div>
            <div className="stat-content"><h3>{myDonations.filter(i => i.status === 'donated').length}</h3><p>Successfully Donated</p></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon"><FiTrendingUp /></div>
            <div className="stat-content"><h3>{myReceivedItems.length}</h3><p>Items Received</p></div>
          </div>
          <div className="stat-card card cert-stat-card">
            <div className="stat-icon cert-icon"><FiAward /></div>
            <div className="stat-content"><h3>{completedDonations.length}</h3><p>Certificates Earned</p></div>
          </div>
        </div>

        {/* ── My Donations ── */}
        <div className="items-section">
          <h2>My Donations</h2>
          {loading ? <div className="spinner"></div>
          : myDonations.length === 0 ? (
            <div className="empty-state card">
              <FiPackage /><h3>No donations yet</h3><p>Start sharing items with your community</p>
              <Link to="/donate" className="btn btn-primary">Donate Your First Item</Link>
            </div>
          ) : (
            <div className="items-list">
              {myDonations.map(item => {
                const chat = donationChats[item._id];
                const pickup = chat?.pickupDetails;
                const isCompleted = item.donorConfirmed && item.receiverConfirmed;
                return (
                  <div key={item._id} className={`item-row card ${isCompleted ? 'item-row-completed' : ''}`}>
                    <ZoomableImage src={item.image} name={item.itemName} className="item-row-img"
                      style={{ width: '120px', height: '120px', borderRadius: '12px', flexShrink: 0, background: '#f8f8f8' }} />
                    <div className="item-info">
                      <h3>{item.itemName}</h3>
                      <p className="item-desc">{item.description}</p>
                      <div className="item-details">
                        <span className="category-tag">{item.category}</span>
                        <span className="location-tag"><FiMapPin /> {item.location.city}</span>
                      </div>
                      {item.category === 'clothes' && (item.gender || item.clothingSize) && (
                        <div className="item-extra-tags">
                          {item.condition && CONDITION_STYLES[item.condition] && (
                            <span className={`extra-tag ${CONDITION_STYLES[item.condition].cls}`}>{CONDITION_STYLES[item.condition].label}</span>
                          )}
                          {item.gender && <span className="extra-tag gender-tag">{item.gender === 'male' ? '👨' : item.gender === 'female' ? '👩' : '👧'} {item.gender.charAt(0).toUpperCase() + item.gender.slice(1)}</span>}
                          {item.clothingSize && <span className="extra-tag size-tag">Size: {item.clothingSize}</span>}
                        </div>
                      )}
                      {item.category === 'food' && item.quantity && (
                        <div className="item-extra-tags">
                          <span className="extra-tag food-tag">🍱 Qty: {item.quantity} {item.foodQuantityUnit || ''}</span>
                        </div>
                      )}
                      {pickup?.location && !item.donorConfirmed && (
                        <div className="pickup-details-card">
                          <p className="pickup-title">📦 Pickup Details</p>
                          <p><FiMapPin /> <strong>Location:</strong> {pickup.location}</p>
                          {pickup.date && <p><FiCalendar /> <strong>Date:</strong> {formatDate(pickup.date)}</p>}
                          {pickup.time && <p><FiClock /> <strong>Time:</strong> {pickup.time}</p>}
                          {getPickupReminderBadge(pickup.date)}
                          <span className={`pickup-status-badge ${pickup.confirmedByReceiver ? 'confirmed' : 'pending'}`}>
                            {pickup.confirmedByReceiver ? '✅ Receiver Confirmed' : '⏳ Awaiting Confirmation'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="item-status">
                      {getStatusBadge(item.status, chat, item)}
                      {item.requests?.length > 0 && item.status !== 'donated' && (
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
                              <div style={{ display:'flex', gap:'0.4rem' }}>
                                <button onClick={() => handleApproveRequest(item._id, req.user?._id, item.itemName)}
                                  className="btn btn-sm btn-primary" disabled={!req.user?._id}>
                                  Approve & Chat
                                </button>
                                <button onClick={() => handleDenyRequest(item._id, req.user?._id, req.user?.name)}
                                  className="btn btn-sm btn-deny" disabled={!req.user?._id}>
                                  ✗ Deny
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.requests?.filter(r => r.user?._id !== item.receiver?._id).length > 0 && item.status === 'donated' && (
                        <div className="requests-info requests-info--denied">
                          <p><strong>Other Requests ({item.requests.filter(r => r.user?._id !== item.receiver?._id).length} denied)</strong></p>
                          {item.requests.filter(r => r.user?._id !== item.receiver?._id).map((req, index) => (
                            <div key={req._id || index} className="request-item request-item--denied">
                              <div className="requester-info">
                                <FiUser />
                                <div>
                                  <p><strong>{req.user?.name || 'Unknown User'}</strong></p>
                                  {req.message && <p className="request-message">"{req.message}"</p>}
                                </div>
                              </div>
                              <span className="denied-badge">✗ Not selected</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.status === 'donated' && item.receiver && (
                        <div className="donated-to">
                          <p>{item.donorConfirmed ? 'Donated to:' : 'Scheduled to:'}</p>
                          <p><strong>{item.receiver.name}</strong></p>
                          <div className="donated-actions">
                            {chat && !item.donorConfirmed && (
                              <button onClick={() => handleOpenDonorChat(item._id, item.itemName)} className="btn btn-sm btn-primary">💬 Chat with Receiver</button>
                            )}
                            {!item.donorConfirmed && (
                              <button onClick={() => handleMarkAsDonated(item._id)} className="btn btn-sm btn-success">✅ Mark as Handed Over</button>
                            )}
                          </div>
                          {item.donorConfirmed && <p className="confirmed-note">✔ You marked this as handed over</p>}
                          {isCompleted && (
                            <button onClick={() => handleDownloadCertificate(item)} className="btn btn-sm btn-certificate">
                              🏅 Download Certificate
                            </button>
                          )}
                          {isCompleted && !ratedItems[item._id]?.ratedAsDonor && (
                            <button
                              onClick={() => setRatingModal({ itemId: item._id, role: 'donor_rates_receiver', itemName: item.itemName })}
                              className="btn btn-sm btn-rate"
                            >⭐ Rate Receiver</button>
                          )}
                          {isCompleted && ratedItems[item._id]?.ratedAsDonor && (
                            <p className="confirmed-note" style={{ color: '#b8860b' }}>⭐ You rated this receiver</p>
                          )}
                        </div>
                      )}
                      {(item.status === 'pending' || item.status === 'available') && (
                        <div style={{display:'flex',gap:'0.4rem'}}>
                          <button onClick={() => setEditItem({...item})} className="btn btn-sm btn-primary">✏️ Edit</button>
                          {item.status === 'pending' && (
                            <button onClick={() => handleDeleteItem(item._id)} className="btn btn-sm btn-outline">Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pending Pickups ── */}
        {myReceivedItems.filter(i => !i.receiverConfirmed).length > 0 && (
          <div className="items-section" style={{ marginTop: '3rem' }}>
            <h2>Pending Pickups</h2>
            <div className="items-list">
              {myReceivedItems.filter(i => !i.receiverConfirmed).map(item => {
                const rchat = donationChats[item._id];
                const rpickup = rchat?.pickupDetails;
                return (
                  <div key={item._id} className="item-row card">
                    <ZoomableImage src={item.image} name={item.itemName} className="item-row-img"
                      style={{ width: '120px', height: '120px', borderRadius: '12px', flexShrink: 0, background: '#f8f8f8' }} />
                    <div className="item-info">
                      <h3>{item.itemName}</h3>
                      <p className="item-desc">{item.description}</p>
                      <div className="item-details">
                        <span className="category-tag">{item.category}</span>
                        <span className="location-tag"><FiMapPin /> {item.location?.city}</span>
                      </div>
                      {item.condition && CONDITION_STYLES[item.condition] && (
                        <div className="item-extra-tags">
                          <span className={`extra-tag ${CONDITION_STYLES[item.condition].cls}`}>{CONDITION_STYLES[item.condition].label}</span>
                        </div>
                      )}
                      <p className="donor-info"><FiUser /> Donated by: <strong>{item.donor?.name}</strong></p>
                      {(rpickup?.location || item.pickupScheduled) && (
                        <div className="pickup-details-card">
                          <p className="pickup-title">📦 Pickup Details</p>
                          <p><FiMapPin /> <strong>Location:</strong> {rpickup?.location || item.pickupLocation}</p>
                          {(rpickup?.date || item.pickupDate) && <p><FiCalendar /> <strong>Date:</strong> {formatDate(rpickup?.date || item.pickupDate)}</p>}
                          {(rpickup?.time || item.pickupTime) && <p><FiClock /> <strong>Time:</strong> {rpickup?.time || item.pickupTime}</p>}
                          {getPickupReminderBadge(rpickup?.date || item.pickupDate)}
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
                            <button onClick={() => handleOpenReceiverChat(item._id, item.itemName)} className="btn btn-sm btn-primary">💬 Chat with Donor</button>
                          )}
                          {!item.receiverConfirmed && (
                            <button onClick={() => handleMarkAsReceived(item._id)} className="btn btn-sm btn-success">✅ Mark as Received</button>
                          )}
                        </div>
                        {!item.donorConfirmed && !rpickup?.location && (
                          <p className="confirmed-note" style={{ color: '#856404' }}>⏳ Waiting for pickup details</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Items I've Received ── */}
        <div className="items-section" style={{ marginTop: '3rem' }}>
          <h2>Items I've Received</h2>
          {loading ? <div className="spinner"></div>
          : myReceivedItems.filter(i => i.receiverConfirmed).length === 0 ? (
            <div className="empty-state card">
              <FiGift /><h3>No items received yet</h3><p>Browse available items to get started</p>
              <Link to="/browse" className="btn btn-primary">Browse Items</Link>
            </div>
          ) : (
            <div className="items-list">
              {myReceivedItems.filter(i => i.receiverConfirmed).map(item => (
                <div key={item._id} className="item-row card">
                  <ZoomableImage src={item.image} name={item.itemName} className="item-row-img"
                    style={{ width: '120px', height: '120px', borderRadius: '12px', flexShrink: 0, background: '#f8f8f8' }} />
                  <div className="item-info">
                    <h3>{item.itemName}</h3>
                    <p className="item-desc">{item.description}</p>
                    <p className="donor-info"><FiUser /> Donated by: <Link to={`/donor/${item.donor?._id}`} className="donor-profile-link"><strong>{item.donor?.name}</strong></Link></p>
                  </div>
                  <div className="item-status">
                    {getStatusBadge(item.status, null, item)}
                    {(() => {
                      const rchat = donationChats[item._id];
                      const isClosed = rchat?.status === 'completed';
                      return rchat ? (
                        <button onClick={() => handleOpenReceiverChat(item._id, item.itemName)}
                          className={`btn btn-sm ${isClosed ? 'btn-outline' : 'btn-primary'}`} style={{ marginTop: '0.5rem' }}>
                          {isClosed ? '📖 View Chat History' : '💬 Chat with Donor'}
                        </button>
                      ) : null;
                    })()}
                    {!ratedItems[item._id]?.ratedAsReceiver && (
                      <button
                        onClick={() => setRatingModal({ itemId: item._id, role: 'receiver_rates_donor', itemName: item.itemName })}
                        className="btn btn-sm btn-rate" style={{ marginTop: '0.5rem' }}
                      >⭐ Rate Donor</button>
                    )}
                    {ratedItems[item._id]?.ratedAsReceiver && (
                      <p className="confirmed-note" style={{ color: '#b8860b' }}>⭐ You rated this donor</p>
                    )}
                    <p className="confirmed-note">✔ You marked this as received</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── My Wishlist ── */}
        <div className="items-section" style={{ marginTop: '3rem' }}>
          <h2><FiHeart style={{ color: '#e74c3c', marginRight: '0.5rem' }} /> My Wishlist</h2>
          {wishlist.length === 0 ? (
            <div className="empty-state card">
              <FiHeart /><h3>No saved items</h3>
              <p>Tap the ❤️ on any item in Browse to save it here</p>
              <Link to="/browse" className="btn btn-primary">Browse Items</Link>
            </div>
          ) : (
            <div className="items-list">
              {wishlist.map(item => (
                <div key={item._id} className="item-row card wishlist-item-row">
                  <ZoomableImage src={item.image} name={item.itemName} className="item-row-img"
                    style={{ width: '120px', height: '120px', borderRadius: '12px', flexShrink: 0, background: '#f8f8f8' }} />
                  <div className="item-info">
                    <h3>{item.itemName}</h3>
                    <p className="item-desc">{item.description}</p>
                    <div className="item-details">
                      <span className="category-tag">{item.category}</span>
                      <span className="location-tag"><FiMapPin /> {item.location?.city}</span>
                    </div>
                    <p className="donor-info"><FiUser /> By: <Link to={`/donor/${item.donor?._id}`} className="donor-profile-link"><strong>{item.donor?.name}</strong></Link></p>
                  </div>
                  <div className="item-status">
                    <span className="badge badge-success">Available</span>
                    <Link to="/browse" className="btn btn-sm btn-primary" style={{ marginTop: '0.5rem' }}>
                      View on Browse
                    </Link>
                    <button onClick={() => handleRemoveWishlist(item._id)}
                      className="btn btn-sm btn-outline wishlist-remove-btn" style={{ marginTop: '0.5rem' }}>
                      <FiTrash2 /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Item Modal */}
        {editItem && (
          <div className="rating-overlay" onClick={() => setEditItem(null)}>
            <div className="rating-modal" style={{maxWidth:'500px'}} onClick={e => e.stopPropagation()}>
              <h2 style={{color:'var(--forest-green)',marginBottom:'1.25rem'}}>✏️ Edit Item</h2>
              <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                <div>
                  <label style={{display:'block',fontWeight:'600',fontSize:'0.88rem',marginBottom:'0.4rem'}}>Item Name</label>
                  <input className="form-control" value={editItem.itemName}
                    onChange={e => setEditItem(p => ({...p, itemName: e.target.value}))} />
                </div>
                <div>
                  <label style={{display:'block',fontWeight:'600',fontSize:'0.88rem',marginBottom:'0.4rem'}}>Description</label>
                  <textarea className="form-control" rows={3} value={editItem.description}
                    onChange={e => setEditItem(p => ({...p, description: e.target.value}))} />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                  <div>
                    <label style={{display:'block',fontWeight:'600',fontSize:'0.88rem',marginBottom:'0.4rem'}}>Condition</label>
                    <select className="form-control" value={editItem.condition}
                      onChange={e => setEditItem(p => ({...p, condition: e.target.value}))}>
                      <option value="new">New</option>
                      <option value="like-new">Like New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontWeight:'600',fontSize:'0.88rem',marginBottom:'0.4rem'}}>Category</label>
                    <input className="form-control" value={editItem.category}
                      onChange={e => setEditItem(p => ({...p, category: e.target.value}))} />
                  </div>
                </div>
              </div>
              <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end',marginTop:'1.5rem'}}>
                <button className="btn btn-outline" onClick={() => setEditItem(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleEditSave} disabled={editLoading}>
                  {editLoading ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Modal */}
        {showChat && selectedChat && (
          <ChatModal chatId={selectedChat} itemName={selectedItemName}
            onClose={() => { setShowChat(false); setSelectedChat(null); fetchUserItems(); }} />
        )}

        {/* Rating Modal */}
        {ratingModal && (
          <RatingModal
            itemId={ratingModal.itemId}
            role={ratingModal.role}
            itemName={ratingModal.itemName}
            onClose={() => setRatingModal(null)}
            onSubmitted={() => { setRatingModal(null); fetchUserItems(); }}
          />
        )}

      </div>
    </div>
  );
};

export default Dashboard;