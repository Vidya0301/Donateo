import React from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiMapPin } from 'react-icons/fi';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/browse">Browse Items</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Get Involved</h4>
            <ul>
              <li><Link to="/register">Become a Donor</Link></li>
              <li><Link to="/register">Request Items</Link></li>
              <li><Link to="/donate">Donate Items</Link></li>
              <li><Link to="/dashboard">My Dashboard</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Contact Us</h4>
            <div className="contact-info">
              <div className="contact-item">
                <FiMail />
                <span>support@donateo.org</span>
              </div>
              <div className="contact-item">
                <FiMapPin />
                <span>Serving communities worldwide</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Donateo. Promoting reuse, reducing waste, supporting communities.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;