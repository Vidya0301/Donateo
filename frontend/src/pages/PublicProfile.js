import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { getBadge } from '../utils/badges';
import { ZoomableImage } from '../components/ImagePreviewModal';
import { FiMapPin, FiPackage, FiGift, FiStar, FiCalendar, FiArrowLeft, FiUser } from 'react-icons/fi';
import './PublicProfile.css';

const PublicProfile = () => {
  const { userId } = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('active'); // active | donated | ratings

  useEffect(() => {
    authAPI.getPublicProfile(userId)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  if (loading) return <div className="public-profile-loading"><div className="spinner"></div></div>;
  if (!data)   return (
    <div className="public-profile-page">
      <div className="container">
        <div className="empty-state card" style={{ marginTop: '4rem' }}>
          <FiUser /><h3>User not found</h3>
          <Link to="/browse" className="btn btn-primary">Back to Browse</Link>
        </div>
      </div>
    </div>
  );

  const { user, completedCount, activeItems, donatedItems, ratings } = data;
  const badge = getBadge(completedCount);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < rating ? '#f59e0b' : '#ddd', fontSize: '1rem' }}>★</span>
    ));
  };

  return (
    <div className="public-profile-page">
      <div className="container">

        {/* Back link */}
        <Link to="/browse" className="profile-back-link">
          <FiArrowLeft /> Back to Browse
        </Link>

        {/* ── Profile Header ── */}
        <div className="public-profile-header card">
          <div className="public-profile-avatar">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="public-profile-info">
            <h1>{user.name}</h1>
            <div className="public-profile-meta">
              {user.city && <span><FiMapPin /> {user.city}</span>}
              <span><FiCalendar /> Member since {formatDate(user.memberSince)}</span>
            </div>
            {badge && (
              <span className="public-profile-badge"
                style={{ background: badge.color + '22', border: `1.5px solid ${badge.color}`, color: badge.color }}>
                {badge.emoji} {badge.label}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="public-profile-stats">
            <div className="pub-stat">
              <span className="pub-stat-num">{completedCount}</span>
              <span className="pub-stat-label">Donated</span>
            </div>
            <div className="pub-stat">
              <span className="pub-stat-num">{activeItems.length}</span>
              <span className="pub-stat-label">Active</span>
            </div>
            <div className="pub-stat">
              <span className="pub-stat-num">{ratings.average || '—'}</span>
              <span className="pub-stat-label">⭐ Rating</span>
            </div>
            <div className="pub-stat">
              <span className="pub-stat-num">{ratings.total}</span>
              <span className="pub-stat-label">Reviews</span>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="pub-tabs">
          <button className={`pub-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
            <FiPackage /> Active Items ({activeItems.length})
          </button>
          <button className={`pub-tab ${tab === 'donated' ? 'active' : ''}`} onClick={() => setTab('donated')}>
            <FiGift /> Donated ({completedCount})
          </button>
          <button className={`pub-tab ${tab === 'ratings' ? 'active' : ''}`} onClick={() => setTab('ratings')}>
            <FiStar /> Reviews ({ratings.total})
          </button>
        </div>

        {/* ── Active Items ── */}
        {tab === 'active' && (
          <div className="pub-items-grid">
            {activeItems.length === 0 ? (
              <div className="empty-state card">
                <FiPackage /><h3>No active items</h3>
                <p>This user has no items available right now.</p>
              </div>
            ) : activeItems.map(item => (
              <div key={item._id} className="pub-item-card card">
                <div className="pub-item-img-wrap">
                  <ZoomableImage src={item.image} name={item.itemName}
                    style={{ width: '100%', height: '160px', objectFit: 'contain', borderRadius: '8px', background: '#f8f8f8' }} />
                  <span className={`pub-item-status ${item.status}`}>{item.status}</span>
                </div>
                <div className="pub-item-info">
                  <h3>{item.itemName}</h3>
                  <p>{item.description}</p>
                  <div className="pub-item-tags">
                    <span className="category-tag">{item.category}</span>
                    {item.location?.city && <span className="location-tag"><FiMapPin /> {item.location.city}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Donated Items ── */}
        {tab === 'donated' && (
          <div className="pub-items-grid">
            {donatedItems.length === 0 ? (
              <div className="empty-state card">
                <FiGift /><h3>No completed donations yet</h3>
              </div>
            ) : donatedItems.map(item => (
              <div key={item._id} className="pub-item-card card pub-item-donated">
                <div className="pub-item-img-wrap">
                  <ZoomableImage src={item.image} name={item.itemName}
                    style={{ width: '100%', height: '160px', objectFit: 'contain', borderRadius: '8px', background: '#f8f8f8' }} />
                  <span className="pub-item-status donated">✅ Donated</span>
                </div>
                <div className="pub-item-info">
                  <h3>{item.itemName}</h3>
                  <p>{item.description}</p>
                  <div className="pub-item-tags">
                    <span className="category-tag">{item.category}</span>
                    {item.location?.city && <span className="location-tag"><FiMapPin /> {item.location.city}</span>}
                  </div>
                  <p className="pub-donated-date">🗓 {formatDate(item.updatedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Ratings ── */}
        {tab === 'ratings' && (
          <div className="pub-ratings-section">
            {ratings.total === 0 ? (
              <div className="empty-state card">
                <FiStar /><h3>No reviews yet</h3>
              </div>
            ) : (
              <>
                <div className="pub-rating-summary card">
                  <div className="pub-rating-big">{ratings.average}</div>
                  <div className="pub-rating-stars">{renderStars(Math.round(ratings.average))}</div>
                  <div className="pub-rating-count">Based on {ratings.total} review{ratings.total !== 1 ? 's' : ''}</div>
                </div>
                <div className="pub-reviews-list">
                  {ratings.list.map(r => (
                    <div key={r._id} className="pub-review-card card">
                      <div className="pub-review-header">
                        <div className="pub-review-avatar">{r.reviewer?.name?.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="pub-reviewer-name">{r.reviewer?.name || 'Anonymous'}</p>
                          <p className="pub-review-item">for: {r.item?.itemName}</p>
                        </div>
                        <div className="pub-review-stars">{renderStars(r.rating)}</div>
                      </div>
                      {r.review && <p className="pub-review-text">"{r.review}"</p>}
                      <p className="pub-review-date">{formatDate(r.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default PublicProfile;