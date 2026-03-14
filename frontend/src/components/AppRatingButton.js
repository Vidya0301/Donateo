import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { appReviewAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiX, FiStar } from 'react-icons/fi';
import './AppRatingButton.css';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const AppRatingButton = () => {
  const { user } = useAuth();
  const [open, setOpen]         = useState(false);
  const [stars, setStars]       = useState(0);
  const [hovered, setHovered]   = useState(0);
  const [review, setReview]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [myReview, setMyReview] = useState(null); // existing review


  // Fetch this user's review whenever user changes
  useEffect(() => {
    if (!user) {
      setMyReview(null);
      setStars(0);
      setReview('');
      return;
    }
    appReviewAPI.getMine()
      .then(res => {
        if (res.data) {
          setMyReview(res.data);
          setStars(res.data.rating);
          setReview(res.data.review || '');
        } else {
          setMyReview(null);
          setStars(0);
          setReview('');
        }
      })
      .catch(() => {
        setMyReview(null);
        setStars(0);
        setReview('');
      });
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null; // only show for logged-in users

  const handleSubmit = async () => {
    if (!stars) { toast.error('Please select a star rating'); return; }
    try {
      setLoading(true);
      const res = await appReviewAPI.submit({ rating: stars, review });
      setMyReview(res.data.review);
      toast.success(res.data.isUpdate ? '⭐ Review updated!' : '⭐ Thanks for rating Donateo!');
      setOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    // Restore saved values if editing
    if (myReview) {
      setStars(myReview.rating);
      setReview(myReview.review || '');
    } else {
      setStars(0);
      setReview('');
    }
    setOpen(true);
  };

  const active = hovered || stars;

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        className={`app-rate-fab ${myReview ? 'app-rate-fab--rated' : ''}`}
        onClick={handleOpen}
        title={myReview ? `You rated us ${myReview.rating}/5 — click to update` : 'Rate Donateo'}
      >
        <FiStar className="fab-star-icon" />
        <span className="fab-label">{myReview ? `${myReview.rating}/5` : 'Rate App'}</span>
      </button>

      {/* ── Modal ── */}
      {open && (
        <div className="app-rate-overlay" onClick={() => setOpen(false)}>
          <div className="app-rate-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <button className="app-rate-close" onClick={() => setOpen(false)}><FiX /></button>
            <div className="app-rate-header">
              <div className="app-rate-logo">
                <span className="app-rate-heart">♥</span>
              </div>
              <h2>Rate Donateo</h2>
              <p>{myReview ? 'Update your review' : 'How are you enjoying the app?'}</p>
            </div>

            {/* Stars */}
            <div className="app-rate-stars">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  className={`app-star-btn ${n <= active ? 'app-star-filled' : ''}`}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setStars(n)}
                >
                  <FiStar />
                </button>
              ))}
            </div>
            {active > 0 && (
              <p className="app-star-label">{LABELS[active]}</p>
            )}

            {/* Review */}
            <div className="app-rate-review-group">
              <label>Your review <span className="app-rate-optional">(optional)</span></label>
              <textarea
                value={review}
                onChange={e => setReview(e.target.value)}
                placeholder="Tell us what you think about Donateo..."
                maxLength={500}
                rows={3}
                className="app-rate-textarea"
              />
              <span className="app-rate-charcount">{review.length}/500</span>
            </div>

            {/* Actions */}
            <div className="app-rate-actions">
              <button className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading || !stars}
              >
                {loading ? 'Submitting...' : myReview ? 'Update Review' : 'Submit Review'}
              </button>
            </div>

            {myReview && (
              <p className="app-rate-existing-note">
                You last rated us <strong>{myReview.rating}/5</strong> — submitting will update your review.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AppRatingButton;