import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiX, FiCheck } from 'react-icons/fi';
import api from '../services/api';
import './Notificationbell.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      // silently fail
    }
  };

  const handleOpen = async () => {
    setOpen(prev => !prev);
    if (!open && unreadCount > 0) {
      // Mark all as read when opening
      try {
        await api.put('/notifications/read-all');
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (error) {}
    }
  };

  const handleNotificationClick = (notification) => {
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const handleClear = async (e) => {
    e.stopPropagation();
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {}
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  const getIcon = (type) => {
    const icons = {
      welcome: '🌱',
      new_item_posted: '🆕',
      item_approved: '✅',
      item_requested: '🔔',
      request_approved: '🎉',
      pickup_details_set: '📍',
      item_handed_over: '📦',
      item_received: '💚',
      new_user_registered: '👤'
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button className="bell-btn" onClick={handleOpen} aria-label="Notifications">
        <FiBell />
        {unreadCount > 0 && (
          <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notifications</h4>
            {notifications.length > 0 && (
              <button className="clear-btn" onClick={handleClear} title="Clear all">
                <FiX /> Clear all
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <FiBell />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="notification-icon">{getIcon(notification.type)}</span>
                  <div className="notification-content">
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">{timeAgo(notification.createdAt)}</span>
                  </div>
                  {!notification.isRead && <span className="unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;