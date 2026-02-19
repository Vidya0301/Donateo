import React from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiPackage, FiUsers, FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Share What You Don't Need.
                <span className="highlight"> Help Someone Who Does.</span>
              </h1>
              <p className="hero-subtitle">
                Join our community-driven platform where kindness meets sustainability. 
                Donate unused items, reduce waste, and make a real difference in someone's life.
              </p>
              <div className="hero-buttons">
                <Link to="/browse" className="btn btn-primary">
                  Browse Items <FiArrowRight />
                </Link>
                <Link to="/register" className="btn btn-secondary">
                  Start Donating
                </Link>
              </div>
            </div>
            <div className="hero-image">
              <div className="floating-card card-1">
                <FiHeart />
                <span>1000+ Items Donated</span>
              </div>
              <div className="floating-card card-2">
                <FiUsers />
                <span>500+ Active Members</span>
              </div>
              <div className="floating-card card-3">
                <FiTrendingUp />
                <span>Growing Daily</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Simple steps to make a difference</p>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-icon">
                <FiUsers />
              </div>
              <h3>Sign Up</h3>
              <p>Create your account as a donor or receiver in just a few clicks</p>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-icon">
                <FiPackage />
              </div>
              <h3>Post or Browse</h3>
              <p>Donors post items with photos. Receivers browse and request what they need</p>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-icon">
                <FiHeart />
              </div>
              <h3>Connect & Share</h3>
              <p>Admin approves posts. Donors and receivers connect to arrange pickup</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="categories">
        <div className="container">
          <h2 className="section-title">What You Can Share</h2>
          <div className="category-grid">
            <div className="category-card">
              <div className="category-icon">👕</div>
              <h3>Clothes</h3>
              <p>Gently used clothing for all ages and seasons</p>
            </div>
            <div className="category-card">
              <div className="category-icon">📚</div>
              <h3>Books</h3>
              <p>Educational materials, novels, and textbooks</p>
            </div>
            <div className="category-card">
              <div className="category-icon">🎒</div>
              <h3>Bags</h3>
              <p>Backpacks, handbags, and travel bags</p>
            </div>
            <div className="category-card">
              <div className="category-icon">🍎</div>
              <h3>Food</h3>
              <p>Non-perishable food items and groceries</p>
            </div>
            <div className="category-card">
              <div className="category-icon">🏠</div>
              <h3>Household</h3>
              <p>Furniture, appliances, and home essentials</p>
            </div>
            <div className="category-card">
              <div className="category-icon">✨</div>
              <h3>More</h3>
              <p>Electronics, toys, and other useful items</p>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="impact">
        <div className="container">
          <div className="impact-content">
            <div className="impact-text">
              <h2>Making a Real Impact</h2>
              <p>
                Every item donated through Wall of Kindness directly helps students, 
                families in need, and contributes to a more sustainable planet. We believe 
                in the power of community and the ripple effect of small acts of kindness.
              </p>
              <ul className="impact-list">
                <li>
                  <FiHeart />
                  <span>Supporting students and families in need</span>
                </li>
                <li>
                  <FiPackage />
                  <span>Reducing waste and promoting reuse</span>
                </li>
                <li>
                  <FiUsers />
                  <span>Building stronger communities</span>
                </li>
                <li>
                  <FiTrendingUp />
                  <span>Creating a culture of giving</span>
                </li>
              </ul>
            </div>
            <div className="impact-stats">
              <div className="stat-card">
                <h3>1,234</h3>
                <p>Items Donated</p>
              </div>
              <div className="stat-card">
                <h3>567</h3>
                <p>Lives Touched</p>
              </div>
              <div className="stat-card">
                <h3>2.5 Tons</h3>
                <p>Waste Reduced</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Make a Difference?</h2>
            <p>Join our community today and be part of the change you want to see</p>
            <Link to="/register" className="btn btn-primary btn-large">
              Get Started Now <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
