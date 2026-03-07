import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiMapPin, FiLock, FiSave, FiEdit2, FiShield, FiCheckCircle } from 'react-icons/fi';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: { city: '', street: '', state: '', zipCode: '' },
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: {
          city: user.address?.city || '',
          street: user.address?.street || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || ''
        },
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await authAPI.updateProfile(updateData);

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }

      toast.success('Profile updated successfully!');
      setEditMode(false);
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));

      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    if (role === 'admin') return '🛡️ Admin';
    if (role === 'donor') return '🎁 Donor';
    return '🤲 Receiver';
  };

  // isVerified is true for: existing users (default:true) + new users who verified OTP
  const isVerified = user?.isVerified !== false;

  return (
    <div className="profile-page">
      <div className="container">

        {/* ── Profile Header ── */}
        <div className="profile-header">
          <div className="profile-avatar">
            <span>{user?.name?.charAt(0).toUpperCase()}</span>
            {isVerified && (
              <span className="avatar-verified-badge" title="Email Verified">✓</span>
            )}
          </div>
          <div className="profile-header-info">
            <div className="profile-name-row">
              <h1>{user?.name}</h1>
              {isVerified && (
                <span className="verified-badge">
                  <FiCheckCircle /> Verified
                </span>
              )}
            </div>
            <span className="role-pill">{getRoleLabel(user?.role)}</span>
            <p className="profile-email"><FiMail /> {user?.email}</p>
          </div>
          {!editMode && (
            <button className="btn btn-primary edit-btn" onClick={() => setEditMode(true)}>
              <FiEdit2 /> Edit Profile
            </button>
          )}
        </div>

        <div className="profile-body">
          {!editMode ? (
            <div className="profile-info-grid">

              {/* ── Personal Info ── */}
              <div className="info-card card">
                <div className="info-card-header">
                  <FiUser /> Personal Info
                </div>
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
                {/* Email verification status */}
                <div className="info-row">
                  <span className="info-label">
                    <FiShield style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Email Status
                  </span>
                  <span className="info-value">
                    <span className="status-verified">
                      <FiCheckCircle /> Email Verified
                    </span>
                  </span>
                </div>
              </div>

              {/* ── Contact Info ── */}
              <div className="info-card card">
                <div className="info-card-header">
                  <FiPhone /> Contact Info
                </div>
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
          ) : (
            /* ── Edit Form ── */
            <form onSubmit={handleSubmit} className="profile-form card">
              <h2 className="form-section-title"><FiUser /> Personal Information</h2>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-control"
                    required
                    placeholder="Your full name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={user?.email}
                    className="form-control"
                    disabled
                    title="Email cannot be changed"
                  />
                  <small className="form-hint">
                    <FiCheckCircle style={{ color: '#2e8b57', marginRight: '4px' }} />
                    Email verified — cannot be changed
                  </small>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label"><FiPhone /> Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Your contact number"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label"><FiMapPin /> City</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Your city"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Street address"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="form-divider" />

              <h2 className="form-section-title">
                <FiLock /> Change Password
                <span className="optional-label">(optional)</span>
              </h2>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Leave blank to keep current"
                    minLength="6"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Confirm new password"
                    minLength="6"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setEditMode(false);
                    setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <FiSave /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;