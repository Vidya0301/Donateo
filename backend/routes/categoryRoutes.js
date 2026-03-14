const express = require('express');
const router = express.Router();
const {
  getActiveCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  toggleCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/auth');

router.get('/',              getActiveCategories);              // public
router.get('/admin/all',     protect, admin, getAllCategories);
router.post('/',             protect, admin, createCategory);
router.put('/:id',           protect, admin, updateCategory);
router.put('/:id/toggle',    protect, admin, toggleCategory);
router.delete('/:id',        protect, admin, deleteCategory);

module.exports = router;