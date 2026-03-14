import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './AnnouncementBanner.css';

const TYPE_CONFIG = {
  info:        { icon: 'ℹ️', className: 'banner-info' },
  warning:     { icon: '⚠️', className: 'banner-warning' },
  maintenance: { icon: '🔧', className: 'banner-maintenance' },
  success:     { icon: '✅', className: 'banner-success' },
};

const AnnouncementBanner = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  // Each user gets their own sessionStorage key — so dismissing for one
  // user does NOT affect any other user's session
  const storageKey = user?._id
    ? `dismissed_announcements_${user._id}`
    : 'dismissed_announcements_guest';

  // Reload dismissed list whenever the logged-in user changes
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
      setDismissed(stored);
    } catch {
      setDismissed([]);
    }
  }, [storageKey]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get('/announcements');
        setAnnouncements(res.data);
      } catch {
        // silently fail — banner is non-critical
      }
    };
    fetchAnnouncements();
  }, []);

  const handleDismiss = (id) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    // Save under this user's own key
    sessionStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const visible = announcements.filter(a => !dismissed.includes(a._id));
  if (visible.length === 0) return null;

  return (
    <div className="announcement-stack">
      {visible.map(a => {
        const config = TYPE_CONFIG[a.type] || TYPE_CONFIG.info;
        return (
          <div key={a._id} className={`announcement-banner ${config.className}`}>
            <div className="banner-content">
              <span className="banner-icon">{config.icon}</span>
              <div className="banner-text">
                <strong className="banner-title">{a.title}</strong>
                <span className="banner-message">{a.message}</span>
              </div>
            </div>
            <button
              className="banner-dismiss"
              onClick={() => handleDismiss(a._id)}
              aria-label="Dismiss announcement"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementBanner;