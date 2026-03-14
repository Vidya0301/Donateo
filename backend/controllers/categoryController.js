const Category = require('../models/Category');

// Default categories to seed if none exist
const DEFAULT_CATEGORIES = [
  { value: 'clothes',   label: 'Clothes',   icon: '👕', order: 1 },
  { value: 'books',     label: 'Books',     icon: '📚', order: 2 },
  { value: 'bags',      label: 'Bags',      icon: '🎒', order: 3 },
  { value: 'food',      label: 'Food',      icon: '🍎', order: 4 },
  { value: 'household', label: 'Household', icon: '🏠', order: 5 },
  { value: 'other',     label: 'Other',     icon: '✨', order: 6 },
];

// Seed defaults if collection is empty
const seedDefaults = async () => {
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany(DEFAULT_CATEGORIES);
  }
};

// @desc   Get active categories (public — for dropdowns)
// @route  GET /api/categories
// @access Public
const getActiveCategories = async (req, res) => {
  try {
    await seedDefaults();
    const categories = await Category.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get all categories (admin)
// @route  GET /api/categories/admin/all
// @access Private (Admin)
const getAllCategories = async (req, res) => {
  try {
    await seedDefaults();
    const categories = await Category.find({}).sort({ order: 1, createdAt: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Create category
// @route  POST /api/categories
// @access Private (Admin)
const createCategory = async (req, res) => {
  try {
    const { label, icon, order } = req.body;
    if (!label) return res.status(400).json({ message: 'Label is required' });

    // Auto-generate value from label
    const value = label.trim().toLowerCase().replace(/\s+/g, '-');

    const exists = await Category.findOne({ value });
    if (exists) return res.status(400).json({ message: 'Category already exists' });

    const category = await Category.create({
      value,
      label: label.trim(),
      icon: icon || '✨',
      order: order || 0
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Update category
// @route  PUT /api/categories/:id
// @access Private (Admin)
const updateCategory = async (req, res) => {
  try {
    const { label, icon, order } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (label) category.label = label.trim();
    if (icon)  category.icon  = icon;
    if (order !== undefined) category.order = order;

    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Toggle category active/inactive
// @route  PUT /api/categories/:id/toggle
// @access Private (Admin)
const toggleCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.isActive = !category.isActive;
    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Delete category
// @route  DELETE /api/categories/:id
// @access Private (Admin)
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    await category.deleteOne();
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getActiveCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  toggleCategory,
  deleteCategory
};