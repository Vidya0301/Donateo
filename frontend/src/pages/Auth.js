import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Auth.css';


// ─────────────────────────────────────────────────────
// Simple Math CAPTCHA — no API key needed
// ─────────────────────────────────────────────────────
const MathCaptcha = ({ onVerify }) => {
  const generate = () => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    return { a, b, answer: a + b };
  };

  const [q, setQ] = useState(generate());
  const [input, setInput] = useState('');
  const [verified, setVerified] = useState(false);

  const handleInput = (val) => {
    setInput(val);
    if (val === String(q.answer)) {
      setVerified(true);
      onVerify(true);
    } else {
      setVerified(false);
      onVerify(false);
    }
  };

  const refresh = () => {
    setQ(generate());
    setInput('');
    setVerified(false);
    onVerify(false);
  };

  return (
    <div className={`captcha-box ${verified ? 'captcha-ok' : ''}`}>
      <p className="captcha-label">🤖 Prove you're human</p>
      <div className="captcha-row">
        <span className="captcha-question">
          What is <strong>{q.a}</strong> + <strong>{q.b}</strong> ?
        </span>
        <input
          type="number"
          className="captcha-input"
          value={input}
          onChange={e => handleInput(e.target.value)}
          placeholder="?"
          min="1"
          max="18"
        />
        <button type="button" className="captcha-refresh" onClick={refresh} title="New question">
          🔄
        </button>
      </div>
      {verified
        ? <p className="captcha-success">✅ Verified</p>
        : input && <p className="captcha-wrong">❌ Incorrect</p>
      }
    </div>
  );
};

// ─────────────────────────────────────────────────────
// Auth Page — Login + Register
// ─────────────────────────────────────────────────────
const Auth = () => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'donor',
    phone: '',
    address: { street: '', city: '', state: '', zipCode: '' }
  });

  const [loading, setLoading] = useState(false);
  const [captchaPassed, setCaptchaPassed] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // ── LOGIN — handles result instead of thrown error ──
        const result = await login(formData.email, formData.password);
        if (result.success) {
          toast.success('Welcome back!');
          navigate('/dashboard');
        } else if (result.requiresVerification) {
          toast.warn('Please verify your email first.');
          navigate('/verify-otp', { state: { email: formData.email } });
        } else {
          toast.error(result.message);
        }

      } else {
        // ── REGISTER — with CAPTCHA + OTP ─────────────────

        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (!captchaPassed) {
          toast.error('Please complete the CAPTCHA first');
          setLoading(false);
          return;
        }

        // Call register API directly → sends OTP to email
        await axios.post('/api/auth/register', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          phone: formData.phone,
          address: formData.address
        });

        toast.success('OTP sent to your email! Please verify.');

        // Redirect to OTP verification page
        navigate('/verify-otp', { state: { email: formData.email } });
      }

    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-container">

          {/* Left image panel */}
          <div className="auth-image">
            <div className="auth-image-content">
              <h2>Join Our Community</h2>
              <p>Every item shared creates a ripple of kindness in our community</p>
              <div className="auth-features">
                <div className="feature">✓ Share unused items easily</div>
                <div className="feature">✓ Help those in need</div>
                <div className="feature">✓ Reduce waste together</div>
                <div className="feature">✓ Build stronger communities</div>
              </div>
            </div>
          </div>

          {/* Right form panel */}
          <div className="auth-form-container">
            <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="auth-subtitle">
              {isLogin
                ? 'Log in to continue sharing kindness'
                : 'Join us in making a difference'}
            </p>

            <form onSubmit={handleSubmit} className="auth-form">

              {/* ── REGISTER ONLY FIELDS ── */}
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-control"
                      required
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">I want to</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      <option value="donor">🎁 Donate Items</option>
                      <option value="receiver">🤲 Receive Items</option>
                    </select>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-control"
                  required
                  placeholder="your.email@example.com"
                />
                {!isLogin && (
                  <small className="form-hint">
                    📧 A 6-digit OTP will be sent to verify this email
                  </small>
                )}
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-control"
                  required
                  placeholder="Enter password"
                  minLength="6"
                />
              </div>

              {/* ── REGISTER ONLY FIELDS (continued) ── */}
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="form-control"
                      required
                      placeholder="Confirm password"
                      minLength="6"
                    />
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <small style={{ color: '#e24b4b', fontWeight: 600 }}>❌ Passwords do not match</small>
                    )}
                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                      <small style={{ color: '#2e8b57', fontWeight: 600 }}>✅ Passwords match</small>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Your contact number"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Your city"
                    />
                  </div>

                  {/* ── CAPTCHA — only shown on register ── */}
                  <MathCaptcha onVerify={setCaptchaPassed} />
                </>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading || (!isLogin && !captchaPassed)}
              >
                {loading
                  ? (isLogin ? 'Logging in...' : 'Sending OTP...')
                  : (isLogin ? 'Log In' : '📧 Register & Verify Email')
                }
              </button>
            </form>

            <div className="auth-footer">
              {isLogin ? (
                <p>Don't have an account? <Link to="/register">Sign up here</Link></p>
              ) : (
                <p>Already have an account? <Link to="/login">Log in here</Link></p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;