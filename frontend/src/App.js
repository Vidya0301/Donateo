import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import AnnouncementBanner from './components/AnnouncementBanner';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Browse from './pages/Browse';
import Dashboard from './pages/Dashboard';
import DonateItem from './pages/DonateItem';
import PublicProfile from './pages/PublicProfile';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import VerifyOTP from './pages/VerifyOTP';
import Contact from './pages/Contact';
import AppRatingButton from './components/AppRatingButton';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <div className="spinner"></div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" />;
  return children;
};

const Layout = ({ children }) => {
  const location = useLocation();
  const hideLayout = location.pathname === '/verify-otp';
  return (
    <div className="App">
      {!hideLayout && <Header />}
      {!hideLayout && <AnnouncementBanner />}
      <main className="main-content">{children}</main>
      {!hideLayout && <Footer />}
      <AppRatingButton />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

const AppRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/"           element={<Home />} />
      <Route path="/login"      element={<Auth />} />
      <Route path="/register"   element={<Auth />} />
      <Route path="/browse"     element={<Browse />} />
      <Route path="/contact"    element={<Contact />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/profile"    element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/donate"     element={<PrivateRoute><DonateItem /></PrivateRoute>} />
      <Route path="/donor/:userId" element={<PublicProfile />} />
          <Route path="/admin"      element={<PrivateRoute adminOnly={true}><AdminPanel /></PrivateRoute>} />
    </Routes>
  </Layout>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;