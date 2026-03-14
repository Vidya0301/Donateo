import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { itemsAPI, categoryAPI } from '../services/api';
import { getBadge } from '../utils/badges';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiFilter, FiMapPin, FiUser, FiPackage, FiSearch, FiX, FiChevronDown, FiSliders, FiHeart, FiShare2 } from 'react-icons/fi';
import { ZoomableImage } from '../components/ImagePreviewModal';
import './Browse.css';

const CONDITIONS = [
  { value: 'all',  label: 'Any Condition' },
  { value: 'new',  label: '✨ New' },
  { value: 'good', label: '👍 Good' },
  { value: 'fair', label: '🤝 Fair' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: '🕐 Newest First' },
  { value: 'oldest', label: '🕙 Oldest First' },
  { value: 'az',     label: '🔤 A → Z' },
  { value: 'za',     label: '🔤 Z → A' },
];

// Haversine distance in km
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const RADIUS_OPTIONS = [
  { value: 5,   label: 'Within 5 km'  },
  { value: 10,  label: 'Within 10 km' },
  { value: 25,  label: 'Within 25 km' },
  { value: 50,  label: 'Within 50 km' },
];

const Browse = () => {
  const { user } = useAuth();
  const [items, setItems]             = useState([]);
  const [wishlist, setWishlist]         = useState(new Set()); // Set of saved item IDs
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [userCoords, setUserCoords]   = useState(null);
  const [shareItem, setShareItem]       = useState(null); // item to share // { lat, lng }
  const [locating, setLocating]       = useState(false);
  const [radius, setRadius]           = useState(null);  // null = no limit
  const [searchInput, setSearchInput] = useState('');
  const searchTimer = useRef(null);

  const [filters, setFilters] = useState({
    search: '', category: 'all', city: '', condition: 'all', sortBy: 'newest',
  });

  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: val }));
    }, 400);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        setUserCoords({ lat, lng });
        setRadius(10); // default 10km
        setLocating(false);
        toast.success('📍 Showing items near you!');
      },
      () => { setLocating(false); toast.error('Could not get location'); },
      { timeout: 8000 }
    );
  };

  const handleClearLocation = () => { setUserCoords(null); setRadius(null); };

  // Fetch wishlist IDs for logged-in user
  useEffect(() => {
    if (!user) { setWishlist(new Set()); return; }
    itemsAPI.getWishlist()
      .then(res => setWishlist(new Set(res.data.map(i => i._id))))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    categoryAPI.getActive()
      .then(res => setCategories([{ value: 'all', label: 'All Categories', icon: '🎯' }, ...res.data]))
      .catch(() => setCategories([
        { value: 'all',       label: 'All Categories', icon: '🎯' },
        { value: 'clothes',   label: 'Clothes',        icon: '👕' },
        { value: 'books',     label: 'Books',          icon: '📚' },
        { value: 'bags',      label: 'Bags',           icon: '🎒' },
        { value: 'food',      label: 'Food',           icon: '🍎' },
        { value: 'household', label: 'Household',      icon: '🏠' },
        { value: 'other',     label: 'Other',          icon: '✨' },
      ]));
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...(filters.category  !== 'all'  && { category:  filters.category }),
        ...(filters.condition !== 'all'  && { condition: filters.condition }),
        ...(filters.city.trim()          && { city:      filters.city.trim() }),
        ...(filters.search.trim()        && { search:    filters.search.trim() }),
        ...(filters.sortBy !== 'newest'  && { sortBy:    filters.sortBy }),
      };
      const response = await itemsAPI.getItems(params);
      setItems(response.data);
    } catch {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleRequest = async (itemId) => {
    if (!user) { toast.info('Please login to request items'); return; }
    try {
      await itemsAPI.requestItem(itemId, 'I am interested in this item');
      toast.success('Request sent successfully!');
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request item');
    }
  };

  const clearFilter = (key) => {
    const defaults = { search: '', category: 'all', city: '', condition: 'all', sortBy: 'newest' };
    setFilters(f => ({ ...f, [key]: defaults[key] }));
    if (key === 'search') setSearchInput('');
  };

  const clearAll = () => {
    setFilters({ search: '', category: 'all', city: '', condition: 'all', sortBy: 'newest' });
    setSearchInput('');
  };

  function getCategoryDisplay(value) {
    return categories.find(c => c.value === value) || { icon: '✨', label: value };
  }

  const activeChips = [
    filters.search    && { key: 'search',    label: `🔍 "${filters.search}"` },
    filters.category  !== 'all' && { key: 'category',  label: getCategoryDisplay(filters.category).icon + ' ' + getCategoryDisplay(filters.category).label },
    filters.city.trim()         && { key: 'city',      label: `📍 ${filters.city}` },
    filters.condition !== 'all' && { key: 'condition', label: CONDITIONS.find(c => c.value === filters.condition)?.label },
    filters.sortBy    !== 'newest' && { key: 'sortBy', label: SORT_OPTIONS.find(s => s.value === filters.sortBy)?.label },
  ].filter(Boolean);

  const hasActiveFilters = activeChips.length > 0;

  const getStatusBadge = (status) => ({
    available: <span className="badge badge-success">Available</span>,
    requested: <span className="badge badge-warning">Requested</span>,
    donated:   <span className="badge badge-secondary">Donated</span>,
  }[status] || null);

  // Compute distances and filter/sort by location if userCoords set
  const itemsWithDistance = React.useMemo(() => {
    if (!userCoords) return items.map(i => ({ ...i, distance: null }));
    return items
      .map(i => {
        const dist = (i.location?.lat && i.location?.lng)
          ? getDistance(userCoords.lat, userCoords.lng, i.location.lat, i.location.lng)
          : null;
        return { ...i, distance: dist };
      })
      .filter(i => !radius || i.distance === null || i.distance <= radius)
      .sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
  }, [items, userCoords, radius]);

  const isOwnItem = (item) => user && item.donor?._id?.toString() === user._id?.toString();

  const handleWishlist = async (e, itemId) => {
    e.stopPropagation();
    if (!user) { toast.info('Please log in to save items'); return; }
    try {
      const res = await itemsAPI.toggleWishlist(itemId);
      setWishlist(prev => {
        const next = new Set(prev);
        if (res.data.saved) next.add(itemId);
        else next.delete(itemId);
        return next;
      });
      toast.success(res.data.saved ? '❤️ Saved to wishlist' : '💔 Removed from wishlist');
    } catch { toast.error('Failed to update wishlist'); }
  };

  const handleShare = (e, item) => {
    e.stopPropagation();
    setShareItem(item);
  };

  const handleCopyLink = (itemId) => {
    const url = `${window.location.origin}/browse?item=${itemId}`;
    navigator.clipboard.writeText(url);
    toast.success('🔗 Link copied!');
  };

  const handleWhatsApp = (item) => {
    const url = `${window.location.origin}/browse?item=${item._id}`;
    const text = `Check out "${item.itemName}" on Donateo — available for free! ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleNativeShare = (item) => {
    const url = `${window.location.origin}/browse?item=${item._id}`;
    if (navigator.share) {
      navigator.share({ title: item.itemName, text: `Free item on Donateo: ${item.itemName}`, url });
    } else {
      handleCopyLink(item._id);
    }
  };

  return (
    <div className="browse-page">
      <div className="container">

        <div className="page-header">
          <h1>Browse Available Items</h1>
          <p>Find what you need from our community of donors</p>
        </div>

        {/* Search Bar */}
        <div className="browse-search-bar">
          <div className="search-input-wrap">
            <FiSearch className="search-icon" />
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search by item name or description..."
              className="search-input"
            />
            {searchInput && (
              <button className="search-clear" onClick={() => { setSearchInput(''); setFilters(f => ({ ...f, search: '' })); }}>
                <FiX />
              </button>
            )}
          </div>
          <button
            className={`filter-toggle-btn ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <FiSliders />
            Filters
            {hasActiveFilters && <span className="filter-count">{activeChips.length}</span>}
            <FiChevronDown className={`chevron ${showFilters ? 'open' : ''}`} />
          </button>
          {userCoords ? (
            <div className="location-active-bar">
              <span className="location-active-tag"><FiMapPin /> Nearby</span>
              <select className="radius-select" value={radius} onChange={e => setRadius(Number(e.target.value))}>
                {RADIUS_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button className="btn-clear-location" onClick={handleClearLocation} title="Clear location filter"><FiX /></button>
            </div>
          ) : (
            <button className="btn-use-location" onClick={handleUseMyLocation} disabled={locating}>
              <FiMapPin /> {locating ? 'Locating...' : 'Near Me'}
            </button>
          )}
        </div>

        {/* Expandable Filter Panel */}
        <div className={`filters-panel ${showFilters ? 'open' : ''}`}>
          <div className="filters-grid">
            <div className="filter-group">
              <label><FiFilter /> Category</label>
              <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} className="form-select">
                {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label><FiMapPin /> City</label>
              <input type="text" value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} placeholder="Enter city..." className="form-control" />
            </div>
            <div className="filter-group">
              <label>⭐ Condition</label>
              <select value={filters.condition} onChange={e => setFilters(f => ({ ...f, condition: e.target.value }))} className="form-select">
                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>↕ Sort By</label>
              <select value={filters.sortBy} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))} className="form-select">
                {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <button className="clear-all-btn" onClick={clearAll}><FiX /> Clear all filters</button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="filter-chips-row">
            {activeChips.map(chip => (
              <span key={chip.key} className="filter-chip">
                {chip.label}
                <button onClick={() => clearFilter(chip.key)}><FiX /></button>
              </span>
            ))}
          </div>
        )}

        {/* Result Count */}
        {!loading && (
          <div className="result-count">
            {itemsWithDistance.length === 0
              ? 'No items match your filters'
              : `Showing ${itemsWithDistance.length} item${itemsWithDistance.length !== 1 ? 's' : ''}${hasActiveFilters ? ' with current filters' : ''}`}
          </div>
        )}

        {/* Items Grid */}
        {loading ? (
          <div className="spinner"></div>
        ) : itemsWithDistance.length === 0 ? (
          <div className="empty-state card">
            <FiPackage />
            <h3>No items found</h3>
            <p>Try adjusting your filters or check back later</p>
            {hasActiveFilters && (
              <button className="btn btn-outline" onClick={clearAll} style={{ marginTop: '1rem' }}>
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="items-grid">
            {itemsWithDistance.map(item => {
              const catDisplay = getCategoryDisplay(item.category);
              return (
                <div key={item._id} className="item-card card">
                  <div className="item-image-wrapper">
                    <ZoomableImage
                      src={item.image}
                      name={item.itemName}
                      style={{ width: '100%', height: '140px', borderRadius: '12px 12px 0 0' }}
                    />
                    <div className="item-status-badge">{getStatusBadge(item.status)}</div>
                    {user && item.status === 'available' && !isOwnItem(item) && (
                      <button
                        className={`wishlist-btn ${wishlist.has(item._id) ? 'wishlist-btn--saved' : ''}`}
                        onClick={(e) => handleWishlist(e, item._id)}
                        title={wishlist.has(item._id) ? 'Remove from wishlist' : 'Save to wishlist'}
                      >
                        <FiHeart />
                      </button>
                    )}
                  </div>

                  <div className="item-content">
                    <h3>{item.itemName}</h3>
                    <p className="item-description">{item.description}</p>

                    <div className="item-extra-tags">
                      {item.condition && (
                        <span className={`extra-tag condition-tag condition-${item.condition}`}>
                          {item.condition === 'new' ? '✨ New' : item.condition === 'good' ? '👍 Good' : '🤝 Fair'}
                        </span>
                      )}
                      {item.category === 'clothes' && item.gender && (
                        <span className="extra-tag gender-tag">
                          {item.gender === 'male' ? '👨' : item.gender === 'female' ? '👩' : '👧'}
                          {' '}{item.gender.charAt(0).toUpperCase() + item.gender.slice(1)}
                        </span>
                      )}
                      {item.category === 'clothes' && item.clothingSize && (
                        <span className="extra-tag size-tag">Size: {item.clothingSize}</span>
                      )}
                      {item.category === 'food' && item.quantity && (
                        <span className="extra-tag food-tag">🍱 {item.quantity} {item.foodQuantityUnit || ''}</span>
                      )}
                    </div>

                    <div className="item-meta">
                      <span className="item-category">{catDisplay.icon} {catDisplay.label}</span>
                      <span className="item-location"><FiMapPin /> {item.location?.city}</span>
                      {userCoords && item.distance !== null && item.distance !== undefined && (
                        <span className="item-distance">📍 {item.distance < 1 ? `${(item.distance*1000).toFixed(0)}m` : `${item.distance.toFixed(1)} km`} away</span>
                      )}
                    </div>

                    <div className="item-donor">
                      <FiUser /> Donated by: <Link to={`/donor/${item.donor?._id}`} className="donor-profile-link" onClick={e => e.stopPropagation()}>{item.donor?.name}</Link>
                      {(() => {
                        const b = getBadge(item.donorCompletedCount || 0);
                        return b ? (
                          <span className="browse-donor-badge" style={{ background: b.color + '22', color: b.color, border: `1px solid ${b.color}` }}>
                            {b.emoji}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    <div className="card-action-row">
                      <div className="card-action-main">
                        {item.status === 'available' && !isOwnItem(item) && (
                          <button onClick={() => handleRequest(item._id)} className="btn btn-primary btn-block">
                            Request Item
                          </button>
                        )}
                        {item.status === 'requested' && !item.userHasRequested && !isOwnItem(item) && (
                          <div className="item-requested-note">⏳ Under Review</div>
                        )}
                        {isOwnItem(item) && <div className="own-item-label">📦 Your donated item</div>}
                      </div>
                      <button onClick={(e) => handleShare(e, item)} className="btn-share" title="Share this item">
                        <FiShare2 />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* ── Share Modal ── */}
      {shareItem && (
        <div className="share-modal-overlay" onClick={() => setShareItem(null)}>
          <div className="share-modal card" onClick={e => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>Share Item</h3>
              <button className="share-modal-close" onClick={() => setShareItem(null)}><FiX /></button>
            </div>
            <div className="share-item-preview">
              <img src={shareItem.image} alt={shareItem.itemName} />
              <div>
                <p className="share-item-name">{shareItem.itemName}</p>
                <p className="share-item-loc"><FiMapPin /> {shareItem.location?.city}</p>
              </div>
            </div>
            <div className="share-options">
              <button className="share-option share-whatsapp" onClick={() => handleWhatsApp(shareItem)}>
                <span>💬</span> WhatsApp
              </button>
              <button className="share-option share-copy" onClick={() => handleCopyLink(shareItem._id)}>
                <FiShare2 /> Copy Link
              </button>
              <button className="share-option share-native" onClick={() => handleNativeShare(shareItem)}>
                <span>↗</span> Share
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default Browse;