import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, ratingAPI, itemsAPI } from '../services/api';
import { getBadge, getNextBadge } from '../utils/badges';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiMapPin, FiLock, FiSave, FiEdit2, FiShield, FiCheckCircle, FiStar, FiBell } from 'react-icons/fi';
import './Profile.css';

const StarDisplay = ({ value, size = '1rem' }) => (
  <span className="star-display" style={{ fontSize: size }}>
    {[1,2,3,4,5].map(n => (
      <span key={n} className={n <= Math.round(value) ? 'star-filled' : 'star-empty'}>★</span>
    ))}
  </span>
);

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading]             = useState(false);
  const [editMode, setEditMode]           = useState(false);
  const [ratings, setRatings]             = useState([]);
  const [ratingStats, setRatingStats]     = useState({ average: null, total: 0 });
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [completedCount, setCompletedCount]   = useState(0);
  const [notifPrefs, setNotifPrefs]           = useState(null);
  const [prefsLoading, setPrefsLoading]       = useState(false);

  const [formData, setFormData] = useState({
    name: '', phone: '',
    address: { city: '', street: '', state: '', zipCode: '' },
    password: '', confirmPassword: ''
  });

  useEffect(() => {
    // Fetch notification preferences
    authAPI.getNotifPrefs().then(r => setNotifPrefs(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: {
          city:    user.address?.city    || '',
          street:  user.address?.street  || '',
          state:   user.address?.state   || '',
          zipCode: user.address?.zipCode || ''
        },
        password: '', confirmPassword: ''
      });
      fetchRatings();
      fetchCompletedCount();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRatings = async () => {
    try {
      setRatingsLoading(true);
      const res = await ratingAPI.getForUser(user._id);
      setRatings(res.data.ratings);
      setRatingStats({ average: res.data.average, total: res.data.total });
    } catch { /* silently fail */ }
    finally { setRatingsLoading(false); }
  };

  const fetchCompletedCount = async () => {
    try {
      const res = await itemsAPI.getMyDonations();
      // Count all items that have been successfully donated (status = 'donated')
      const count = res.data.filter(i => i.status === 'donated').length;
      setCompletedCount(count);
    } catch {}
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    try {
      setLoading(true);
      const updateData = { name: formData.name, phone: formData.phone, address: formData.address };
      if (formData.password) updateData.password = formData.password;
      const response = await authAPI.updateProfile(updateData);
      if (response.data.token) localStorage.setItem('token', response.data.token);
      toast.success('Profile updated successfully!');
      setEditMode(false);
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally { setLoading(false); }
  };

  const handlePrefToggle = (key, channel) => {
    setNotifPrefs(prev => ({
      ...prev,
      [key]: { ...prev[key], [channel]: !prev[key][channel] }
    }));
  };

  const handleSavePrefs = async () => {
    try {
      setPrefsLoading(true);
      await authAPI.updateNotifPrefs(notifPrefs);
      toast.success('✅ Notification preferences saved!');
    } catch { toast.error('Failed to save preferences'); }
    finally { setPrefsLoading(false); }
  };

  const NOTIF_LABELS = [
    { key: 'itemApproved',    label: 'Item Approved',    desc: 'When admin approves your donated item' },
    { key: 'requestReceived', label: 'Request Received', desc: 'When someone requests your item' },
    { key: 'requestApproved', label: 'Request Approved', desc: 'When a donor approves your request' },
    { key: 'pickupScheduled', label: 'Pickup Scheduled', desc: 'When pickup details are set in chat' },
    { key: 'itemHandedOver',  label: 'Item Handed Over', desc: 'When donor marks item as handed over' },
    { key: 'itemReceived',    label: 'Item Received',    desc: 'When receiver confirms item received' },
    { key: 'pickupReminder',  label: 'Pickup Reminder',  desc: 'Day-before reminder for pickups' },
  ];

  const getRoleLabel = (role) => {
    if (role === 'admin') return '🛡️ Admin';
    if (role === 'donor') return '🎁 Donor';
    return '🤲 Receiver';
  };

  const isVerified = user?.isVerified !== false;
  const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="profile-page">
      <div className="container">

        {/* ── Profile Header ── */}
        <div className="profile-header">
          <div className="profile-avatar">
            <span>{user?.name?.charAt(0).toUpperCase()}</span>
            {isVerified && <span className="avatar-verified-badge" title="Email Verified">✓</span>}
          </div>
          <div className="profile-header-info">
            <div className="profile-name-row">
              <h1>{user?.name}</h1>
              {isVerified && <span className="verified-badge"><FiCheckCircle /> Verified</span>}
            </div>
            <span className="role-pill">{getRoleLabel(user?.role)}</span>
            <p className="profile-email"><FiMail /> {user?.email}</p>

            {/* Badge strip */}
            {(() => {
              const badge = getBadge(completedCount);
              const next  = getNextBadge(completedCount);
              return (
                <div className="profile-badge-strip">
                  {badge ? (
                    <span className="profile-badge" style={{ background: badge.color + '22', border: `1.5px solid ${badge.color}`, color: badge.color }}>
                      {badge.emoji} {badge.label}
                    </span>
                  ) : (
                    <span className="profile-badge-next">🎯 Donate your first item to earn a badge!</span>
                  )}
                  {badge && next && (
                    <span className="profile-badge-next">
                      🎯 {next.min - completedCount} more → {next.emoji} {next.label}
                    </span>
                  )}
                </div>
              );
            })()}

            {ratingStats.total > 0 && (
              <div className="profile-rating-summary">
                <StarDisplay value={parseFloat(ratingStats.average)} size="1.1rem" />
                <span className="rating-avg">{ratingStats.average}</span>
                <span className="rating-count">({ratingStats.total} review{ratingStats.total !== 1 ? 's' : ''})</span>
              </div>
            )}
          </div>
          {!editMode && (
            <button className="btn btn-primary edit-btn" onClick={() => setEditMode(true)}>
              <FiEdit2 /> Edit Profile
            </button>
          )}
        </div>

        <div className="profile-body">
          {!editMode ? (
            <>
              <div className="profile-info-grid">
                {/* Personal Info */}
                <div className="info-card card">
                  <div className="info-card-header"><FiUser /> Personal Info</div>
                  <div className="info-row">
                    <span className="info-label">Full Name</span>
                    <span className="info-value">{user?.name || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value">{user?.email || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Role</span>
                    <span className="info-value">{getRoleLabel(user?.role)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <FiShield style={{ marginRight: '4px', verticalAlign: 'middle' }} />Email Status
                    </span>
                    <span className="info-value">
                      <span className="status-verified"><FiCheckCircle /> Email Verified</span>
                    </span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="info-card card">
                  <div className="info-card-header"><FiPhone /> Contact Info</div>
                  <div className="info-row">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{user?.phone || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">City</span>
                    <span className="info-value">{user?.address?.city || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Street</span>
                    <span className="info-value">{user?.address?.street || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">State</span>
                    <span className="info-value">{user?.address?.state || '—'}</span>
                  </div>
                </div>
              </div>

              {/* ── Ratings & Reviews ── */}
              <div className="ratings-section">
                <div className="ratings-section-header">
                  <h2><FiStar /> Ratings & Reviews</h2>
                  {ratingStats.total > 0 && (
                    <div className="ratings-overview">
                      <span className="ratings-avg-big">{ratingStats.average}</span>
                      <div>
                        <StarDisplay value={parseFloat(ratingStats.average)} size="1.4rem" />
                        <p className="ratings-total">{ratingStats.total} review{ratingStats.total !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  )}
                </div>

                {ratingsLoading ? (
                  <div className="spinner" />
                ) : ratings.length === 0 ? (
                  <div className="ratings-empty">
                    <FiStar />
                    <p>No reviews yet</p>
                    <span>Reviews appear here after completed donations</span>
                  </div>
                ) : (
                  <div className="ratings-list">
                    {ratings.map(r => (
                      <div key={r._id} className="rating-card card">
                        <div className="rating-card-top">
                          <div className="rating-avatar-sm">{r.reviewer?.name?.charAt(0).toUpperCase()}</div>
                          <div className="rating-meta">
                            <p className="rating-reviewer-name">{r.reviewer?.name || 'Anonymous'}</p>
                            <p className="rating-item-label">for &ldquo;{r.item?.itemName}&rdquo;</p>
                          </div>
                          <div className="rating-right">
                            <StarDisplay value={r.rating} size="1rem" />
                            <span className="rating-date">{formatDate(r.createdAt)}</span>
                          </div>
                        </div>
                        {r.review && <p className="rating-review-text">&ldquo;{r.review}&rdquo;</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="profile-form card">
              <h2 className="form-section-title"><FiUser /> Personal Information</h2>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    className="form-control" required placeholder="Your full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" value={user?.email} className="form-control" disabled />
                  <small className="form-hint">
                    <FiCheckCircle style={{ color: '#2e8b57', marginRight: '4px' }} />
                    Email verified — cannot be changed
                  </small>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label"><FiPhone /> Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    className="form-control" placeholder="Your contact number" />
                </div>
                <div className="form-group">
                  <label className="form-label"><FiMapPin /> City</label>
                  <input type="text" name="address.city" value={formData.address.city} onChange={handleChange}
                    className="form-control" placeholder="Your city" />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input type="text" name="address.street" value={formData.address.street} onChange={handleChange}
                    className="form-control" placeholder="Street address" />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input type="text" name="address.state" value={formData.address.state} onChange={handleChange}
                    className="form-control" placeholder="State" />
                </div>
              </div>
              <div className="form-divider" />
              <h2 className="form-section-title">
                <FiLock /> Change Password <span className="optional-label">(optional)</span>
              </h2>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange}
                    className="form-control" placeholder="Leave blank to keep current" minLength="6" />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                    className="form-control" placeholder="Confirm new password" minLength="6" />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline"
                  onClick={() => { setEditMode(false); setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <FiSave /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        {/* ── Notification Preferences ── */}
        <div className="profile-card card" style={{ marginTop: '2rem' }}>
          <div className="notif-prefs-header">
            <h2 className="form-section-title"><FiBell /> Notification Preferences</h2>
            <p className="notif-prefs-subtitle">Choose how you want to be notified for each event.</p>
          </div>
          {!notifPrefs ? (
            <div className="spinner"></div>
          ) : (
            <>
              <div className="notif-prefs-table">
                <div className="notif-prefs-thead">
                  <span>Event</span>
                  <span>In-App</span>
                  <span>Email</span>
                </div>
                {NOTIF_LABELS.map(({ key, label, desc }) => (
                  <div key={key} className="notif-pref-row">
                    <div className="notif-pref-label">
                      <span>{label}</span>
                      <small>{desc}</small>
                    </div>
                    <label className="notif-toggle">
                      <input type="checkbox" checked={notifPrefs[key]?.inApp ?? true}
                        onChange={() => handlePrefToggle(key, 'inApp')} />
                      <span className="notif-slider"></span>
                    </label>
                    <label className="notif-toggle">
                      <input type="checkbox" checked={notifPrefs[key]?.email ?? true}
                        onChange={() => handlePrefToggle(key, 'email')} />
                      <span className="notif-slider"></span>
                    </label>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSavePrefs} disabled={prefsLoading}>
                  <FiSave /> {prefsLoading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </>
          )}
        </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;