import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  register:      (userData)    => api.post('/auth/register', userData),
  login:         (credentials) => api.post('/auth/login', credentials),
  getProfile:    ()            => api.get('/auth/me'),
  updateProfile: (userData)    => api.put('/auth/profile', userData),
  getNotifPrefs:    ()         => api.get('/auth/notification-preferences'),
  updateNotifPrefs: (data)     => api.put('/auth/notification-preferences', data),
  getPublicProfile: (userId)   => api.get(`/auth/user/${userId}/public`)
};

export const itemsAPI = {
  getItems:         (params)       => api.get('/items', { params }),
  getItemById:      (id)           => api.get(`/items/${id}`),
  createItem:       (itemData)     => api.post('/items', itemData),
  updateItem:       (id, itemData) => api.put(`/items/${id}`, itemData),
  deleteItem:       (id)           => api.delete(`/items/${id}`),
  requestItem:      (id, message)  => api.post(`/items/${id}/request`, { message }),
  donateItem:       (id, userId)   => api.put(`/items/${id}/donate/${userId}`),
  getMyDonations:   ()             => api.get('/items/my/donations'),
  getMyReceivedItems: ()           => api.get('/items/my/received'),
  markAsDonated:    (id)           => api.put(`/items/${id}/mark-donated`),
  markAsReceived:   (id)           => api.put(`/items/${id}/mark-received`),
  toggleWishlist:   (itemId)       => api.post(`/items/my/wishlist/${itemId}`),
  getWishlist:      ()             => api.get('/items/my/wishlist'),
  geocodeItems:     ()             => api.post('/items/admin/geocode'),
  denyRequest:      (itemId, userId) => api.delete(`/items/${itemId}/request/${userId}`)
};

export const adminAPI = {
  getUsers:        ()             => api.get('/admin/users'),
  updateUserStatus:(id, data)     => api.put(`/admin/users/${id}`, data),
  deleteUser:      (id)           => api.delete(`/admin/users/${id}`),
  getItems:        (params)       => api.get('/admin/items', { params }),
  approveItem:     (id)           => api.put(`/admin/items/${id}/approve`),
  removeItem:      (id)           => api.delete(`/admin/items/${id}`),
  getStats:        ()             => api.get('/admin/stats'),
  getPublicStats:  ()             => api.get('/admin/public-stats')
};

export const chatAPI = {
  createChat:          (data)           => api.post('/chat', data),
  getMyChats:          ()               => api.get('/chat/my'),
  getChatById:         (id)             => api.get(`/chat/${id}`),
  sendMessage:         (id, content)    => api.post(`/chat/${id}/message`, { content }),
  sendQuickReply:      (id, quickReply) => api.post(`/chat/${id}/message`, { quickReply }),
  updatePickupDetails: (id, details)    => api.put(`/chat/${id}/pickup`, details),
  markAsRead:          (id)             => api.put(`/chat/${id}/read`),
  endChat:             (id)             => api.put(`/chat/${id}/end`),
  reportChat:          (id, reason)     => api.put(`/chat/${id}/report`, { reason }),
  getAllChats:          ()               => api.get('/chat/admin/all')
};

export const announcementAPI = {
  getActive: ()     => api.get('/announcements'),
  getAll:    ()     => api.get('/announcements/admin/all'),
  create:    (data) => api.post('/announcements', data),
  toggle:    (id)   => api.put(`/announcements/${id}/toggle`),
  remove:    (id)   => api.delete(`/announcements/${id}`),
};

export const categoryAPI = {
  getActive: ()         => api.get('/categories'),
  getAll:    ()         => api.get('/categories/admin/all'),
  create:    (data)     => api.post('/categories', data),
  update:    (id, data) => api.put(`/categories/${id}`, data),
  toggle:    (id)       => api.put(`/categories/${id}/toggle`),
  remove:    (id)       => api.delete(`/categories/${id}`),
};

export const supportAPI = {
  submit:       (data) => api.post('/support/guest', data),   // guest (no auth)
  submitAuth:   (data) => api.post('/support', data),         // logged-in user
  getAll:       ()     => api.get('/support'),
  getUnreadCount: ()   => api.get('/support/unread-count'),
  markAsRead:   (id)   => api.put(`/support/${id}/read`),
  reply:        (id, reply) => api.post(`/support/${id}/reply`, { reply }),
  resolve:      (id)   => api.put(`/support/${id}/resolve`),
  remove:       (id)   => api.delete(`/support/${id}`),
};

export const notificationsAPI = {
  getAll:      () => api.get('/notifications'),
  markAllRead: () => api.put('/notifications/read-all'),
  markRead:    (id) => api.put(`/notifications/${id}/read`),
  clear:       () => api.delete('/notifications')
};

export const ratingAPI = {
  submit:       (data)   => api.post('/ratings', data),
  check:        (itemId) => api.get(`/ratings/check/${itemId}`),
  getForUser:   (userId) => api.get(`/ratings/user/${userId}`),
  getAll:       ()       => api.get('/ratings/admin/all'),
  remove:       (id)     => api.delete(`/ratings/${id}`),
};

export const wishlistAPI = {
  toggle:  (itemId) => api.post(`/items/my/wishlist/${itemId}`),
  getAll:  ()       => api.get('/items/my/wishlist'),
};

export const appReviewAPI = {
  submit:   (data) => api.post('/app-reviews', data),
  getMine:  ()     => api.get('/app-reviews/mine'),
  getAll:   ()     => api.get('/app-reviews/admin/all'),
  remove:   (id)   => api.delete(`/app-reviews/${id}`),
};


export default api;