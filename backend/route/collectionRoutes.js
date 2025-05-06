const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const asyncHandler = require("express-async-handler");
const {
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
} = require("../controller/collectionController");

const ProductCollection = require("../models/Collection");
const mongoose = require("mongoose");

// Validate ObjectId
const isValidObjectId = (id) => mongoose.isValidObjectId(id);

// Public routes
router.get('/public/store/:storeId', asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  if (!isValidObjectId(storeId)) {
    res.status(400);
    throw new Error("Invalid store ID");
  }
  const collections = await ProductCollection.find({ store: storeId })
    .populate('store', 'name')
    .populate('owner', 'walletAddress _id');
  res.json({ success: true, data: collections });
}));

router.get('/public/all', asyncHandler(async (req, res) => {
  const collections = await ProductCollection.find({})
    .populate('store', 'name')
    .populate('owner', 'walletAddress _id');
  console.log(`Fetched ${collections.length} collections for /public/all`);
  res.json({ success: true, data: collections });
}));

router.get('/public/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400);
    throw new Error("Invalid collection ID");
  }
  const collection = await ProductCollection.findById(id)
    .populate('store', 'name')
    .populate('owner', 'walletAddress _id');
  if (!collection) {
    res.status(404);
    throw new Error("Collection not found");
  }
  const normalizedCollection = {
    ...collection.toObject(),
    generalImage: collection.generalImage ? collection.generalImage.replace('/uploads/', '') : null,
  };
  res.json({ success: true, data: normalizedCollection });
}));

// Authenticated routes
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const collections = await ProductCollection.find({ owner: req.user._id })
    .populate('store', 'name')
    .populate('owner', 'walletAddress _id');
  const normalizedCollections = collections.map(collection => ({
    ...collection.toObject(),
    generalImage: collection.generalImage ? collection.generalImage.replace('/uploads/', '') : null,
  }));
  res.json({ success: true, data: normalizedCollections });
}));

router.get('/store/:storeId', authMiddleware, asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  if (!isValidObjectId(storeId)) {
    res.status(400);
    throw new Error("Invalid store ID");
  }
  const collections = await ProductCollection.find({
    store: storeId,
    owner: req.user._id,
  })
    .populate('store', 'name')
    .populate('owner', 'walletAddress _id');
  const normalizedCollections = collections.map(collection => ({
    ...collection.toObject(),
    generalImage: collection.generalImage ? collection.generalImage.replace('/uploads/', '') : null,
  }));
  res.json({ success: true, data: normalizedCollections });
}));

router.get('/:id', authMiddleware, getCollectionById);

router.post("/", authMiddleware, createCollection);

router.put("/:id", authMiddleware, updateCollection);

router.delete("/:id", authMiddleware, deleteCollection);

module.exports = router;