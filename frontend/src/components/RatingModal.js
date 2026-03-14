import React, { useState } from 'react';
import { ratingAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiX, FiStar } from 'react-icons/fi';
import './RatingModal.css';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const RatingModal = ({ itemId, role, itemName, onClose, onSubmitted }) => {
  const [stars, setStars]     = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview]   = useState('');
  const [loading, setLoading] = useState(false);

  const isDonorRating = role === 'donor_rates_receiver';
  const title = isDonorRating ? 'Rate the Receiver' : 'Rate the Donor';
  const prompt = isDonorRating
    ? 'How was your experience with the receiver?'
    : 'How was your experience with the donor?';

  const handleSubmit = async () => {
    if (!stars) { toast.error('Please select a star rating'); return; }
    try {
      setLoading(true);
      await ratingAPI.submit({ itemId, rating: stars, review, role });
      toast.success('Thank you for your rating!');
      onSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rating-overlay" onClick={onClose}>
      <div className="rating-modal" onClick={e => e.stopPropagation()}>
        <button className="rating-close" onClick={onClose}><FiX /></button>

        <div className="rating-header">
          <div className="rating-icon">⭐</div>
          <h2>{title}</h2>
          <p className="rating-item-name">for "{itemName}"</p>
        </div>

        <p className="rating-prompt">{prompt}</p>

        {/* Star row */}
        <div className="star-row">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              className={`star-btn ${n <= (hovered || stars) ? 'filled' : ''}`}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setStars(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              <FiStar />
            </button>
          ))}
        </div>

        {(hovered || stars) > 0 && (
          <p className="star-label">{LABELS[hovered || stars]}</p>
        )}

        {/* Review textarea */}
        <div className="rating-review-group">
          <label>Leave a review <span className="optional">(optional)</span></label>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Share your experience..."
            maxLength={500}
            rows={3}
            className="rating-textarea"
          />
          <span className="char-count">{review.length}/500</span>
        </div>

        <div className="rating-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !stars}>
            {loading ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;