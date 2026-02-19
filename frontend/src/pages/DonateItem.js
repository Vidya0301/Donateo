import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiUpload, FiPackage } from 'react-icons/fi';
import './DonateItem.css';

const DonateItem = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'clothes',
    description: '',
    image: '',
    condition: 'good',
    quantity: 1,
    location: {
      address: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const categories = [
    { value: 'clothes', label: 'Clothes', icon: '👕' },
    { value: 'books', label: 'Books', icon: '📚' },
    { value: 'bags', label: 'Bags', icon: '🎒' },
    { value: 'food', label: 'Food', icon: '🍎' },
    { value: 'household', label: 'Household', icon: '🏠' },
    { value: 'other', label: 'Other', icon: '✨' }
  ];

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like-new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('location.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: { ...prev.location, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image too large. Please use an image under 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress image
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedImage = canvas.toDataURL('image/jpeg', 0.7);
          setImagePreview(compressedImage);
          setFormData(prev => ({ ...prev, image: compressedImage }));
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await itemsAPI.createItem(formData);
      toast.success('Item submitted for approval!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit item');
    } finally {
      setLoading(false);
    }
  };

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
              <p><strong>Note:</strong> All donations are reviewed by our admin team before being published.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="donate-form card">
            <div className="form-group">
              <label className="form-label">Item Photo *</label>
              <div className="image-upload">
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button 
                      type="button" 
                      onClick={() => {
                        setImagePreview('');
                        setFormData(prev => ({ ...prev, image: '' }));
                      }}
                      className="btn btn-sm btn-outline"
                    >
                      Change Image
                    </button>
                  </div>
                ) : (
                  <label className="upload-label">
                    <FiUpload />
                    <span>Click to upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      required
                      hidden
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g., Winter Jacket, Math Textbook"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Condition *</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  {conditions.map(cond => (
                    <option key={cond.value} value={cond.value}>
                      {cond.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="form-control"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Provide detailed information about the item..."
                required
              />
            </div>

            <div className="form-section-title">
              <h3>Location Information</h3>
            </div>

            <div className="form-group">
              <label className="form-label">Address *</label>
              <input
                type="text"
                name="location.address"
                value={formData.location.address}
                onChange={handleChange}
                className="form-control"
                placeholder="Street address or area"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  name="location.city"
                  value={formData.location.city}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="City"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  name="location.state"
                  value={formData.location.state}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="State"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Zip Code</label>
                <input
                  type="text"
                  name="location.zipCode"
                  value={formData.location.zipCode}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Zip code"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-large btn-block"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DonateItem;
