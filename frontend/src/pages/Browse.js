import React, { useState, useEffect, useCallback } from 'react';
import { itemsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiFilter, FiMapPin, FiUser, FiPackage } from 'react-icons/fi';
import { ZoomableImage } from '../components/ImagePreviewModal';
import './Browse.css';

const Browse = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: 'all', city: '', search: '' });

  const categories = [
    { value: 'all',       label: 'All Categories', icon: '🎯' },
    { value: 'clothes',   label: 'Clothes',         icon: '👕' },
    { value: 'books',     label: 'Books',           icon: '📚' },
    { value: 'bags',      label: 'Bags',            icon: '🎒' },
    { value: 'food',      label: 'Food',            icon: '🍎' },
    { value: 'household', label: 'Household',       icon: '🏠' },
    { value: 'other',     label: 'Other',           icon: '✨' }
  ];

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...(filters.category !== 'all' && { category: filters.category }),
        ...(filters.city   && { city:   filters.city   }),
        ...(filters.search && { search: filters.search })
      };
      const response = await itemsAPI.getItems(params);
      setItems(response.data);
    } catch (error) {
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

  const getStatusBadge = (status) => {
    const badges = {
      available: <span className="badge badge-success">Available</span>,
      requested: <span className="badge badge-warning">Requested</span>,
      donated:   <span className="badge badge-secondary">Donated</span>
    };
    return badges[status] || null;
  };

  // Check if logged-in user is the donor of this item
  const isOwnItem = (item) => user && item.donor?._id === user._id;

  return (
    <div className="browse-page">
      <div className="container">
        <div className="page-header">
          <h1>Browse Available Items</h1>
          <p>Find what you need from our community of donors</p>
        </div>

        {/* Filters */}
        <div className="filters-section card">
          <div className="filter-group">
            <label><FiFilter /> Category</label>
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="form-select">
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label><FiMapPin /> City</label>
            <input type="text" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} placeholder="Enter city" className="form-control" />
          </div>
          <div className="filter-group">
            <label><FiPackage /> Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search items..." className="form-control" />
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="spinner"></div>
        ) : items.length === 0 ? (
          <div className="empty-state card">
            <FiPackage />
            <h3>No items found</h3>
            <p>Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="items-grid">
            {items.map(item => (
              <div key={item._id} className="item-card card">

                {/* Image + status badge */}
                <div className="item-image-wrapper">
                  <ZoomableImage
                    src={item.image}
                    name={item.itemName}
                    style={{ width: '100%', height: '140px', borderRadius: '12px 12px 0 0' }}
                  />
                  <div className="item-status-badge">
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                <div className="item-content">
                  <h3>{item.itemName}</h3>
                  <p className="item-description">{item.description}</p>

                  {/* ── Clothes: gender + size tags ── */}
                  {item.category === 'clothes' && (item.gender || item.clothingSize) && (
                    <div className="item-extra-tags">
                      {item.gender && (
                        <span className="extra-tag gender-tag">
                          {item.gender === 'male' ? '👨' : item.gender === 'female' ? '👩' : '👧'}
                          {' '}{item.gender.charAt(0).toUpperCase() + item.gender.slice(1)}
                        </span>
                      )}
                      {item.clothingSize && (
                        <span className="extra-tag size-tag">Size: {item.clothingSize}</span>
                      )}
                    </div>
                  )}

                  {/* ── Food: quantity + unit ── */}
                  {item.category === 'food' && item.quantity && (
                    <div className="item-extra-tags">
                      <span className="extra-tag food-tag">
                        🍱 Qty: {item.quantity} {item.foodQuantityUnit || ''}
                      </span>
                    </div>
                  )}

                  <div className="item-meta">
                    <span className="item-category">
                      {categories.find(c => c.value === item.category)?.icon} {item.category}
                    </span>
                    <span className="item-location">
                      <FiMapPin /> {item.location.city}
                    </span>
                  </div>

                  <div className="item-donor">
                    <FiUser /> Donated by: {item.donor.name}
                  </div>

                  {/* Hide Request button for donor's own items */}
                  {item.status === 'available' && !isOwnItem(item) && (
                    <button onClick={() => handleRequest(item._id)} className="btn btn-primary btn-block">
                      Request Item
                    </button>
                  )}

                  {/* Show "Your Item" label if it's theirs */}
                  {isOwnItem(item) && (
                    <div className="own-item-label">📦 Your donated item</div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;