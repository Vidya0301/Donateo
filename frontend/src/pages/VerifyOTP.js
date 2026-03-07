import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './VerifyOTP.css';

const VerifyOTP = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithToken } = useAuth();

  // Email passed from Register page via navigation state
  const email = location.state?.email;

  // Redirect if no email in state
  useEffect(() => {
    if (!email) navigate('/register');
  }, [email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Handle OTP input — move to next box automatically
  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // only numbers
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // only 1 digit per box
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace — go back to previous box
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste — fill all 6 boxes at once
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  // Submit OTP
  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await axios.post('/api/auth/verify-otp', {
        email,
        otp: otpString
      });

      setSuccess('Email verified successfully! Redirecting...');

      // Log user in automatically
      // Auto-login: store token and user in AuthContext
      const { token, ...userData } = data;
      loginWithToken(userData, token);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
      // Clear OTP boxes on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/auth/resend-otp', { email });
      setSuccess('New OTP sent to your email!');
      setOtp(['', '', '', '', '', '']);
      setTimer(600);
      setCanResend(false);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="verify-page">
      <div className="verify-card">

        {/* Icon */}
        <div className="verify-icon">📧</div>

        {/* Title */}
        <h2 className="verify-title">Verify Your Email</h2>
        <p className="verify-subtitle">
          We sent a 6-digit OTP to <br />
          <strong>{email}</strong>
        </p>

        {/* OTP Boxes */}
        <div className="otp-boxes" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              className={`otp-box ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {/* Error / Success */}
        {error && <p className="otp-error">❌ {error}</p>}
        {success && <p className="otp-success">✅ {success}</p>}

        {/* Timer */}
        <p className="otp-timer">
          {canResend
            ? 'OTP expired.'
            : <>OTP expires in <strong style={{ color: timer < 60 ? '#e07b30' : '#2e8b57' }}>{formatTime(timer)}</strong></>
          }
        </p>

        {/* Verify Button */}
        <button
          className="btn-verify"
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
        >
          {loading ? 'Verifying...' : '✅ Verify OTP'}
        </button>

        {/* Resend */}
        <div className="resend-row">
          <span>Didn't receive it?</span>
          <button
            className="btn-resend"
            onClick={handleResend}
            disabled={!canResend || resendLoading}
          >
            {resendLoading ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>

        {/* Back to register */}
        <button className="btn-back" onClick={() => navigate('/register')}>
          ← Back to Register
        </button>

      </div>
    </div>
  );
};

export default VerifyOTP;