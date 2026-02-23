import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (userData) => api.put('/auth/profile', userData)
};

// Items API
export const itemsAPI = {
  getItems: (params) => api.get('/items', { params }),
  getItemById: (id) => api.get(`/items/${id}`),
  createItem: (itemData) => api.post('/items', itemData),
  updateItem: (id, itemData) => api.put(`/items/${id}`, itemData),
  deleteItem: (id) => api.delete(`/items/${id}`),
  requestItem: (id, message) => api.post(`/items/${id}/request`, { message }),
  donateItem: (id, userId) => api.put(`/items/${id}/donate/${userId}`),
  getMyDonations: () => api.get('/items/my/donations'),
  getMyReceivedItems: () => api.get('/items/my/received'),
  markAsDonated: (id) => api.put(`/items/${id}/mark-donated`),
  markAsReceived: (id) => api.put(`/items/${id}/mark-received`)
};

// Admin API
export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  updateUserStatus: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getItems: (params) => api.get('/admin/items', { params }),
  approveItem: (id) => api.put(`/admin/items/${id}/approve`),
  removeItem: (id) => api.delete(`/admin/items/${id}`),
  getStats: () => api.get('/admin/stats'),
  getPublicStats: () => api.get('/admin/public-stats') // ✅ No auth required
};

// Chat API
export const chatAPI = {
  createChat: (data) => api.post('/chat', data),
  getMyChats: () => api.get('/chat/my'),
  getChatById: (id) => api.get(`/chat/${id}`),
  sendMessage: (id, content) => api.post(`/chat/${id}/message`, { content }),
  updatePickupDetails: (id, details) => api.put(`/chat/${id}/pickup`, details),
  getAllChats: () => api.get('/chat/admin/all')
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAllRead: () => api.put('/notifications/read-all'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  clear: () => api.delete('/notifications')
};

export default api;