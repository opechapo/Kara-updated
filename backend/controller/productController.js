const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Store = require('../models/Store');
const Collection = require('../models/Collection');
const Escrow = require('../models/Escrow');
const path = require('path');
const fs = require('fs').promises;


const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    shortDescription,
    price,
    amount,
    category,
    paymentToken,
    storeId,
    collection,
    escrowSystem,
    vendorDeposit,
    customerDeposit,
  } = req.body;
  const owner = req.user._id;

  if (!name || !shortDescription || !price || !amount || !category || !paymentToken || !storeId || !collection) {
    res.status(400);
    throw new Error('All required fields must be provided');
  }

  const store = await Store.findById(storeId);
  if (!store || store.owner.toString() !== owner.toString()) {
    res.status(403);
    throw new Error('Store not found or not authorized');
  }

  const collectionExists = await Collection.findById(collection);
  if (!collectionExists || collectionExists.owner.toString() !== owner.toString() || collectionExists.store.toString() !== storeId) {
    res.status(403);
    throw new Error('Collection not found, not authorized, or not tied to the store');
  }

  const uploadPath = path.join(__dirname, '..', 'Uploads');
  let generalImage = '';
  if (req.files && req.files.generalImage) {
    const fileName = `${Date.now()}-${req.files.generalImage.name}`;
    const filePath = path.join(uploadPath, fileName);
    await req.files.generalImage.mv(filePath);
    generalImage = `/Uploads/${fileName}`;
  } else {
    res.status(400);
    throw new Error('General image is required');
  }

  const product = await Product.create({
    owner,
    name,
    shortDescription,
    price,
    amount,
    category,
    paymentToken,
    storeId,
    store: storeId,
    collection,
    escrowSystem: escrowSystem || 'Deposit',
    vendorDeposit: escrowSystem === 'Deposit' ? vendorDeposit : undefined,
    customerDeposit: escrowSystem === 'Deposit' ? customerDeposit : undefined,
    generalImage,
  });

  const populatedProduct = await Product.findById(product._id)
    .populate('store', 'name description')
    .populate('collection', 'name');
  res.status(201).json({ success: true, data: populatedProduct });
});

const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ owner: req.user._id, deletedAt: null })
    .populate('store', 'name description')
    .populate('collection', 'name');
  res.json({ success: true, data: products });
});

const getProductsByStore = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    res.status(400);
    throw new Error('Store ID is required');
  }
  const store = await Store.findById(storeId);
  if (!store) {
    res.status(404);
    throw new Error('Store not found');
  }
  const products = await Product.find({ store: storeId, deletedAt: null })
    .populate('store', 'name description')
    .populate('collection', 'name');
  res.json({ success: true, data: products });
});

const getUserProducts = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error('User not authenticated');
  }
  const products = await Product.find({ owner: req.user._id, deletedAt: null })
    .populate('store', 'name description')
    .populate('collection', 'name');
  res.json({ success: true, data: products });
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, deletedAt: null })
    .populate('store', 'name description')
    .populate('collection', 'name')
    .populate('owner', 'walletAddress');
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json({ success: true, data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, deletedAt: null });
  if (!product || product.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Product not found or not authorized');
  }

  const {
    name,
    shortDescription,
    price,
    amount,
    category,
    paymentToken,
    storeId,
    collection,
    escrowSystem,
    vendorDeposit,
    customerDeposit,
  } = req.body;

  const uploadPath = path.join(__dirname, '..', 'Uploads');
  if (req.files && req.files.generalImage) {
    if (product.generalImage) {
      const oldFilePath = path.join(uploadPath, product.generalImage.replace('/Uploads/', ''));
      try {
        await fs.unlink(oldFilePath);
        console.log('Deleted old product image:', oldFilePath);
      } catch (err) {
        console.error('Error deleting old product image (ignored):', err.message);
      }
    }
    const fileName = `${Date.now()}-${req.files.generalImage.name}`;
    const filePath = path.join(uploadPath, fileName);
    await req.files.generalImage.mv(filePath);
    product.generalImage = `/Uploads/${fileName}`;
  }

  if (storeId) {
    const store = await Store.findById(storeId);
    if (!store || store.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Store not found or not authorized');
    }
    product.storeId = storeId;
    product.store = storeId;
  }

  if (collection) {
    const collectionExists = await Collection.findById(collection);
    if (!collectionExists || collectionExists.owner.toString() !== req.user._id.toString() || collectionExists.store.toString() !== product.storeId.toString()) {
      res.status(403);
      throw new Error('Collection not found, not authorized, or not tied to the store');
    }
    product.collection = collection;
  }

  product.name = name || product.name;
  product.shortDescription = shortDescription || product.shortDescription;
  product.price = price !== undefined ? price : product.price;
  product.amount = amount !== undefined ? amount : product.amount;
  product.category = category || product.category;
  product.paymentToken = paymentToken || product.paymentToken;
  product.escrowSystem = escrowSystem || product.escrowSystem;
  product.vendorDeposit = escrowSystem === 'Deposit' ? vendorDeposit || product.vendorDeposit : undefined;
  product.customerDeposit = escrowSystem === 'Deposit' ? customerDeposit || product.customerDeposit : undefined;

  const updatedProduct = await product.save();
  const populatedProduct = await Product.findById(updatedProduct._id)
    .populate('store', 'name description')
    .populate('collection', 'name');
  res.json({ success: true, data: populatedProduct });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, deletedAt: null });
  if (!product || product.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Product not found or not authorized');
  }

  const uploadPath = path.join(__dirname, '..', 'Uploads');
  if (product.generalImage) {
    const filePath = path.join(uploadPath, product.generalImage.replace('/Uploads/', ''));
    try {
      await fs.unlink(filePath);
      console.log('Deleted product image:', filePath);
    } catch (err) {
      console.error('Error deleting product image (ignored):', err.message);
    }
  }

  // Soft delete product
  product.deletedAt = new Date();
  await product.save();

  // Soft delete associated escrow records
  const escrowUpdate = await Escrow.updateMany(
    { productId: product._id, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
  console.log(`Soft deleted ${escrowUpdate.modifiedCount} escrow records for product ${product._id}`);

  res.json({ success: true, data: { message: 'Product and associated escrow records soft deleted' } });
});

module.exports = {
  createProduct,
  getProducts,
  getProductsByStore,
  getUserProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};