import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Browse from './pages/Browse';
import Dashboard from './pages/Dashboard';
import DonateItem from './pages/DonateItem';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';


const PrivateRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) return <div className="spinner"></div>;
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" />;
  
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route 
                path="/dashboard" 
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/donate" 
                element={
                  <PrivateRoute>
                    <DonateItem />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <PrivateRoute adminOnly={true}>
                    <AdminPanel />
                  </PrivateRoute>
                } 
              />
            </Routes>
          </main>
          <Footer />
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
      </AuthProvider>
    </Router>
  );
}

export default App;