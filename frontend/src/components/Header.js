import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHeart, FiUser, FiLogOut, FiMenu, FiX, FiShoppingBag, FiSettings } from 'react-icons/fi';
import './Header.css';

const Header = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <FiHeart className="logo-icon" />
            <span className="logo-text">Donateo</span>
          </Link>

          <button 
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>

          <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
            <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/browse" onClick={() => setMenuOpen(false)}>Browse Items</Link>
            
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
                  <FiShoppingBag /> Dashboard
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMenuOpen(false)}>
                    <FiSettings /> Admin
                  </Link>
                )}
                <div className="user-menu">
                  <span className="user-name">
                    <FiUser /> {user?.name}
                  </span>
                  <button onClick={handleLogout} className="btn-logout">
                    <FiLogOut /> Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn btn-outline" onClick={() => setMenuOpen(false)}>
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
                  Join Us
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
