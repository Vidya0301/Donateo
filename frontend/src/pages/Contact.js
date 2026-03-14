import React, { useState } from 'react';
import { supportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiMail, FiUser, FiMessageSquare, FiSend, FiCheckCircle } from 'react-icons/fi';
import './Contact.css';

const SUBJECTS = [
  'General Inquiry',
  'Problem with a donation',
  'Account issue',
  'Report a user',
  'Suggest a feature',
  'Other',
];

const Contact = () => {
  const { user, isAuthenticated } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [form, setForm] = useState({
    name:    user?.name  || '',
    email:   user?.email || '',
    subject: SUBJECTS[0],
    message: '',
  });

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      if (isAuthenticated) {
        await supportAPI.submitAuth(form);
      } else {
        await supportAPI.submit(form);
      }
      setSubmitted(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="contact-page">
        <div className="contact-success">
          <div className="success-icon"><FiCheckCircle /></div>
          <h2>Message Sent! 💚</h2>
          <p>Thanks for reaching out. We'll get back to you at <strong>{form.email}</strong> within 1–2 business days.</p>
          <button className="btn btn-primary" onClick={() => { setSubmitted(false); setForm({ name: user?.name||'', email: user?.email||'', subject: SUBJECTS[0], message: '' }); }}>
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-page">
      <div className="container">
        <div className="contact-layout">

          {/* Left — info panel */}
          <div className="contact-info">
            <h1>Get in Touch</h1>
            <p>Have a question, issue, or suggestion? We'd love to hear from you.</p>
            <div className="contact-info-items">
              <div className="contact-info-item">
                <span className="contact-info-icon">📬</span>
                <div>
                  <strong>Support Inbox</strong>
                  <p>We typically respond within 1–2 business days.</p>
                </div>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-icon">🛡️</span>
                <div>
                  <strong>Safe & Private</strong>
                  <p>Your message goes directly to our admin team.</p>
                </div>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-icon">💚</span>
                <div>
                  <strong>Community First</strong>
                  <p>We care about every Donateo member's experience.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="contact-form-wrap card">
            <h2><FiMail /> Send us a Message</h2>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="contact-form-row">
                <div className="form-group">
                  <label><FiUser /> Your Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your name"
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label><FiMail /> Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>📋 Subject</label>
                <select name="subject" value={form.subject} onChange={handleChange} className="form-select">
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label><FiMessageSquare /> Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Describe your issue or question in detail..."
                  className="form-control contact-textarea"
                  rows={6}
                  required
                  maxLength={2000}
                />
                <div className="contact-char-count">{form.message.length}/2000</div>
              </div>

              <button type="submit" className="btn btn-primary contact-submit" disabled={loading}>
                {loading ? <span className="spinner-sm"></span> : <><FiSend /> Send Message</>}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Contact;