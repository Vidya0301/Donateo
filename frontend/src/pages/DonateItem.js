import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemsAPI, categoryAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiUpload, FiPackage, FiMapPin } from 'react-icons/fi';
import './DonateItem.css';

const DonateItem = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    description: '',
    image: '',
    condition: 'good',
    quantity: 1,
    gender: '',
    clothingSize: '',
    foodQuantityUnit: 'kg',
    location: { address: '', city: '', state: '', zipCode: '', lat: null, lng: null }
  });
  const [loading, setLoading]           = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [locating, setLocating]         = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryAPI.getActive();
        setCategories(res.data);
        if (res.data.length > 0) setFormData(prev => ({ ...prev, category: res.data[0].value }));
      } catch {
        const fallback = [
          { value: 'clothes',   label: 'Clothes',   icon: '👕' },
          { value: 'books',     label: 'Books',     icon: '📚' },
          { value: 'bags',      label: 'Bags',      icon: '🎒' },
          { value: 'food',      label: 'Food',      icon: '🍎' },
          { value: 'household', label: 'Household', icon: '🏠' },
          { value: 'other',     label: 'Other',     icon: '✨' },
        ];
        setCategories(fallback);
        setFormData(prev => ({ ...prev, category: 'clothes' }));
      }
    };
    fetchCategories();
  }, []);

  // ── Auto-detect location using browser geolocation ──
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          // Reverse geocode using free OpenStreetMap Nominatim API
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          const addr = data.address || {};
          setFormData(prev => ({
            ...prev,
            location: {
              address: addr.road || addr.suburb || addr.neighbourhood || '',
              city:    addr.city || addr.town || addr.village || addr.county || '',
              state:   addr.state || '',
              zipCode: addr.postcode || '',
              lat,
              lng
            }
          }));
          toast.success('📍 Location detected and filled in!');
        } catch {
          setFormData(prev => ({ ...prev, location: { ...prev.location, lat, lng } }));
          toast.info('📍 Coordinates saved — please verify address details');
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) toast.error('Location permission denied. Please allow access and try again.');
        else toast.error('Could not detect location. Please enter manually.');
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const conditions = [
    { value: 'new',      label: 'New' },
    { value: 'like-new', label: 'Like New' },
    { value: 'good',     label: 'Good' },
    { value: 'fair',     label: 'Fair' }
  ];

  const clothingSizes = {
    male:   ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    female: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    kids:   ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y', '12-13Y', '14-15Y']
  };

  const foodUnits = ['kg', 'g', 'litre', 'ml', 'packets', 'pieces', 'boxes', 'bags'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('location.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, location: { ...prev.location, [field]: value } }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        ...(name === 'gender' ? { clothingSize: '' } : {})
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image too large. Max 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_W = 800, MAX_H = 600;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX_W) { h *= MAX_W / w; w = MAX_W; } }
        else        { if (h > MAX_H) { w *= MAX_H / h; h = MAX_H; } }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        setImagePreview(compressed);
        setFormData(prev => ({ ...prev, image: compressed }));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.category === 'clothes' && !formData.gender) { toast.error('Please select gender'); return; }
    if (formData.category === 'clothes' && !formData.clothingSize) { toast.error('Please select size'); return; }
    setLoading(true);
    try {
      await itemsAPI.createItem(formData);
      toast.success('Item submitted for approval!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit item');
    } finally { setLoading(false); }
  };

  const isClothes = formData.category === 'clothes';
  const isFood    = formData.category === 'food';

  return (
    <div className="donate-page">
      <div className="container">
        <div className="page-header">
          <h1>Donate an Item</h1>
          <p>Share what you don't need with someone who does</p>
        </div>

        <div className="donate-container">
          <div className="donate-info card">
            <FiPackage className="info-icon" />
            <h3>Donation Guidelines</h3>
            <ul>
              <li>Ensure items are clean and in good condition</li>
              <li>Provide clear photos and descriptions</li>
              <li>Be honest about item condition</li>
              <li>Include accurate location information</li>
              <li>Respond promptly to requests</li>
            </ul>
            <div className="info-note">
              <p><strong>Note:</strong> All donations are reviewed before being published.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="donate-form card">

            {/* Image Upload */}
            <div className="form-group">
              <label className="form-label">Item Photo *</label>
              <div className="image-upload">
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button type="button" className="btn btn-sm btn-outline"
                      onClick={() => { setImagePreview(''); setFormData(prev => ({ ...prev, image: '' })); }}>
                      Change Image
                    </button>
                  </div>
                ) : (
                  <label className="upload-label">
                    <FiUpload />
                    <span>Click to upload image</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} required hidden />
                  </label>
                )}
              </div>
            </div>

            {/* Item Name */}
            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input type="text" name="itemName" value={formData.itemName} onChange={handleChange}
                className="form-control" placeholder="e.g., Winter Jacket, Math Textbook" required />
            </div>

            {/* Category + Condition + Quantity */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select name="category" value={formData.category} onChange={handleChange} className="form-select" required>
                  {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Condition *</label>
                <select name="condition" value={formData.condition} onChange={handleChange} className="form-select" required>
                  {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <div className={isFood ? 'food-quantity-row' : ''}>
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleChange}
                    className="form-control" min="1" required />
                  {isFood && (
                    <select name="foodQuantityUnit" value={formData.foodQuantityUnit} onChange={handleChange}
                      className="form-select food-unit-select">
                      {foodUnits.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Clothes extras */}
            {isClothes && (
              <div className="form-row clothes-extras">
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <div className="gender-options">
                    {['male', 'female', 'kids'].map(g => (
                      <button key={g} type="button"
                        className={`gender-btn ${formData.gender === g ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, gender: g, clothingSize: '' }))}>
                        {g === 'male' ? '👨 Male' : g === 'female' ? '👩 Female' : '👧 Kids'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Size *</label>
                  <div className="size-options">
                    {(formData.gender ? clothingSizes[formData.gender] : clothingSizes.male).map(size => (
                      <button key={size} type="button"
                        className={`size-btn ${formData.clothingSize === size ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, clothingSize: size }))}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea name="description" value={formData.description} onChange={handleChange}
                className="form-textarea" placeholder="Provide detailed information about the item..." required />
            </div>

            {/* Location */}
            <div className="form-section-title">
              <h3>Location Information</h3>
              <button type="button" className="btn-detect-location" onClick={handleDetectLocation} disabled={locating}>
                <FiMapPin /> {locating ? 'Detecting...' : 'Use My Location'}
              </button>
            </div>

            {formData.location.lat && (
              <div className="location-detected-note">
                ✅ GPS coordinates saved — this item will appear in nearby searches
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Address *</label>
              <input type="text" name="location.address" value={formData.location.address} onChange={handleChange}
                className="form-control" placeholder="Street address or area" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City *</label>
                <input type="text" name="location.city" value={formData.location.city} onChange={handleChange}
                  className="form-control" placeholder="City" required />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input type="text" name="location.state" value={formData.location.state} onChange={handleChange}
                  className="form-control" placeholder="State" />
              </div>
              <div className="form-group">
                <label className="form-label">Zip Code</label>
                <input type="text" name="location.zipCode" value={formData.location.zipCode} onChange={handleChange}
                  className="form-control" placeholder="Zip code" />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-large btn-block" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DonateItem;