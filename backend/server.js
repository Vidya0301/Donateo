require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes         = require('./routes/authRoutes');
const itemRoutes         = require('./routes/itemRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const chatRoutes         = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const categoryRoutes     = require('./routes/categoryRoutes');
const supportRoutes      = require('./routes/supportRoutes');
const ratingRoutes       = require('./routes/ratingRoutes');
const appReviewRoutes    = require('./routes/appReviewRoutes');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { startPickupReminderCron } = require('./utils/pickupReminder');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    startPickupReminderCron();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Donateo API',
    version: '1.0.0',
    endpoints: {
      auth:          '/api/auth',
      items:         '/api/items',
      admin:         '/api/admin',
      chat:          '/api/chat',
      notifications: '/api/notifications',
      announcements: '/api/announcements',
      categories:    '/api/categories',
      support:       '/api/support',
      ratings:       '/api/ratings',
      appReviews:    '/api/app-reviews'
    }
  });
});

app.use('/api/auth',          authRoutes);
app.use('/api/items',         itemRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/support',       supportRoutes);
app.use('/api/ratings',       ratingRoutes);
app.use('/api/app-reviews',   appReviewRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;