const express = require('express');
const router  = express.Router();
const { protect, admin } = require('../middleware/auth');
const { submitReview, getMyReview, getAllReviews, deleteReview } = require('../controllers/appReviewController');

router.post('/',            protect,        submitReview);
router.get('/mine',         protect,        getMyReview);
router.get('/admin/all',    protect, admin,  getAllReviews);
router.delete('/:id',       protect, admin,  deleteReview);

module.exports = router;