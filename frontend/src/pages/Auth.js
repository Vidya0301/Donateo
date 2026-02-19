import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Auth.css';

const Auth = () => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const navigate = useNavigate();
  const { login, register } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'donor',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  const [loading, setLoading] = useState(false);

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
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }
        await register(formData);
        toast.success('Account created successfully!');
        navigate('/dashboard');
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

          <div className="auth-form-container">
            <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="auth-subtitle">
              {isLogin 
                ? 'Log in to continue sharing kindness' 
                : 'Join us in making a difference'}
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
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
                      <option value="donor">Donate Items</option>
                      <option value="receiver">Receive Items</option>
                    </select>
                  </div>
                </>
              )}

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
              </div>

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
                </>
              )}

              <button 
                type="submit" 
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
              </button>
            </form>

            <div className="auth-footer">
              {isLogin ? (
                <p>
                  Don't have an account? <Link to="/register">Sign up here</Link>
                </p>
              ) : (
                <p>
                  Already have an account? <Link to="/login">Log in here</Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
