const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Store = require('../models/Store');
const path = require('path');
const fs = require('fs');
const {
  createProduct,
  getProductsByStore,
  getUserProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controller/productController');

const uploadPath = path.join(__dirname, '../Uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Validate ObjectId
const isValidObjectId = (id) => mongoose.isValidObjectId(id);

// Public routes
router.get(
  '/public/latest',
  asyncHandler(async (req, res) => {
    const products = await Product.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('store', 'name description featuredImage bannerImage logo')
      .populate('collection', 'name');
    res.json({ success: true, data: products });
  })
);

router.get(
  '/public/categories',
  asyncHandler(async (req, res) => {
    const categories = Product.schema.path('category').enumValues;
    res.json({ success: true, data: categories });
  })
);

router.get(
  '/public',
  asyncHandler(async (req, res) => {
    const { category } = req.query;
    const query = { deletedAt: null };
    if (category) query.category = category;
    const products = await Product.find(query)
      .limit(5)
      .populate('store', 'name description featuredImage bannerImage logo')
      .populate('collection', 'name');
    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No products found for category: ${category || 'all'}`,
      });
    }
    res.json({ success: true, data: products });
  })
);

router.get(
  '/public/category/:category',
  asyncHandler(async (req, res) => {
    const { category } = req.params;
    const products = await Product.find({ category, deletedAt: null })
      .populate('store', 'name description featuredImage bannerImage logo')
      .populate('collection', 'name');
    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No products found in this category',
      });
    }
    res.json({ success: true, data: products });
  })
);

// Authenticated routes
router.get('/', authMiddleware, getProductsByStore);
router.get('/user', authMiddleware, getUserProducts);
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID',
      });
    }
    const product = await getProductById(req, res);
    res.json({ success: true, data: product });
  })
);

router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const productData = req.body;
    if (req.files && req.files.generalImage) {
      const file = req.files.generalImage;
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `/Uploads/${fileName}`;
      const serverPath = path.join(uploadPath, fileName);
      await file.mv(serverPath);
      if (!fs.existsSync(serverPath)) {
        throw new Error('Failed to save product image');
      }
      productData.generalImage = filePath;
    } else {
      // Use store's featuredImage as fallback if no image provided
      const store = await Store.findById(productData.storeId);
      if (store && store.featuredImage) {
        productData.generalImage = store.featuredImage;
      } else {
        throw new Error('Product image or store featured image required');
      }
      
    }
    const product = await createProduct(req, res, productData);
    res.status(201).json({ success: true, data: product });
  })
);

router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const productData = req.body;
    if (req.files && req.files.generalImage) {
      const file = req.files.generalImage;
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `/Uploads/${fileName}`;
      const serverPath = path.join(uploadPath, fileName);
      await file.mv(serverPath);
      if (!fs.existsSync(serverPath)) {
        throw new Error('Failed to save product image');
      }
      productData.generalImage = filePath;
    }
    const product = await updateProduct(req, res, id, productData);
    res.json({ success: true, data: product });
  })
);

router.delete('/:id', authMiddleware, deleteProduct);

module.exports = router;