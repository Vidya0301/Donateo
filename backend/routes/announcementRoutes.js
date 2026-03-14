const express = require('express');
const router = express.Router();
const {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');
const { protect, admin } = require('../middleware/auth');

router.get('/',              getActiveAnnouncements);          // public
router.get('/admin/all',     protect, admin, getAllAnnouncements);
router.post('/',             protect, admin, createAnnouncement);
router.put('/:id/toggle',   protect, admin, toggleAnnouncement);
router.delete('/:id',        protect, admin, deleteAnnouncement);

module.exports = router;