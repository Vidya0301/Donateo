import React, { useState } from 'react';
import { ratingAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiX, FiStar } from 'react-icons/fi';
import './RatingModal.css';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const DONOR_QUESTIONS = [
  { key: 'communication',      q: 'How was the communication with the receiver?',          options: ['😞 Poor', '😐 Average', '😊 Good', '🌟 Excellent'] },
  { key: 'punctuality',        q: 'Was the receiver on time for pickup?',                  options: ['😞 Late', '😐 Slightly late', '😊 On time', '⚡ Early'] },
  { key: 'carefulness',        q: 'Did they handle the item with care?',                   options: ['😞 Not careful', '😐 Somewhat', '😊 Careful', '💎 Very careful'] },
  { key: 'wouldRecommend',     q: 'Would you suggest this app to your friends?',      options: ['😞 No', '🤔 Maybe', '😊 Yes', '🙌 Absolutely!'] },
  { key: 'wouldDonateAgain',   q: 'Would you like to donate more items in the future?',   options: ['😞 No', '🤔 Maybe', '😊 Yes', '🎁 Definitely!'] },
  { key: 'overallExperience',  q: 'How was your overall donation experience?',             options: ['😞 Bad', '😐 Okay', '😊 Good', '🌟 Amazing!'] },
];

const RECEIVER_QUESTIONS = [
  { key: 'itemConditionMatch', q: 'Was the item as described by the donor?',               options: ['😞 Not at all', '😐 Somewhat', '😊 Mostly', '🤩 Perfectly'] },
  { key: 'communication',      q: "How was the donor's communication?",                    options: ['😞 Poor', '😐 Average', '😊 Good', '🌟 Excellent'] },
  { key: 'punctuality',        q: 'Was the donor on time for the handover?',               options: ['😞 Late', '😐 Slightly late', '😊 On time', '⚡ Early'] },
  { key: 'wouldRecommend',     q: 'Would you suggest this app to your friends?',         options: ['😞 No', '🤔 Maybe', '😊 Yes', '🙌 Absolutely!'] },
  { key: 'wouldReceiveAgain',  q: 'Would you like to receive more items from Donateo?',   options: ['😞 No', '🤔 Maybe', '😊 Yes', '🎁 Definitely!'] },
  { key: 'overallExperience',  q: 'How was your overall experience receiving this item?',  options: ['😞 Bad', '😐 Okay', '😊 Good', '🌟 Amazing!'] },
];

const RatingModal = ({ itemId, role, itemName, onClose, onSubmitted }) => {
  const [stars, setStars]     = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview]   = useState('');
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);

  const isDonorRating = role === 'donor_rates_receiver';
  const title    = isDonorRating ? 'Rate the Receiver' : 'Rate the Donor';
  const prompt   = isDonorRating ? 'How was your experience with the receiver?' : 'How was your experience with the donor?';
  const QUESTIONS = isDonorRating ? DONOR_QUESTIONS : RECEIVER_QUESTIONS;

  const handleAnswer = (key, value) => setAnswers(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!stars) { toast.error('Please select a star rating'); return; }
    try {
      setLoading(true);
      await ratingAPI.submit({ itemId, rating: stars, review, role, extraAnswers: answers });
      toast.success('Thank you for your rating! 🌟');
      onSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally { setLoading(false); }
  };

  return (
    <div className="rating-overlay" onClick={onClose}>
      <div className="rating-modal rating-modal--extended" onClick={e => e.stopPropagation()}>
        <button className="rating-close" onClick={onClose}><FiX /></button>

        <div className="rating-header">
          <div className="rating-icon">⭐</div>
          <h2>{title}</h2>
          <p className="rating-item-name">for "{itemName}"</p>
        </div>

        <p className="rating-prompt">{prompt}</p>

        {/* Overall Stars */}
        <div className="star-row">
          {[1,2,3,4,5].map(n => (
            <button key={n}
              className={`star-btn ${n <= (hovered || stars) ? 'filled' : ''}`}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setStars(n)}>
              <FiStar />
            </button>
          ))}
        </div>
        {(hovered || stars) > 0 && <p className="star-label">{LABELS[hovered || stars]}</p>}

        {/* Extra Questions */}
        <div className="extra-questions">
          {QUESTIONS.map(({ key, q, options }) => (
            <div key={key} className="extra-question">
              <p className="extra-question-text">{q}</p>
              <div className="extra-options">
                {options.map((opt, i) => (
                  <button key={i}
                    className={`extra-option-btn ${answers[key] === i ? 'extra-option-btn--active' : ''}`}
                    onClick={() => handleAnswer(key, i)}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Review */}
        <div className="rating-review-group">
          <label>Write a review <span className="optional">(optional)</span></label>
          <textarea value={review} onChange={e => setReview(e.target.value)}
            placeholder="Share your experience..." maxLength={500} rows={3}
            className="rating-textarea" />
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