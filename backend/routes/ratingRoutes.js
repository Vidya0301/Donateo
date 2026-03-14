const express = require('express');
const router  = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  submitRating,
  getUserRatings,
  checkRating,
  getAllRatings,
  deleteRating
} = require('../controllers/ratingController');

router.post('/',                    protect,    submitRating);
router.get('/check/:itemId',        protect,    checkRating);
router.get('/user/:userId',                     getUserRatings);   // public
router.get('/admin/all',            protect, admin, getAllRatings);
router.delete('/:id',               protect, admin, deleteRating);

module.exports = router;