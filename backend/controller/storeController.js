const asyncHandler = require('express-async-handler');
const Store = require('../models/Store');
const path = require('path');
const fs = require('fs').promises;

// @desc    Get all stores for the authenticated user
// @route   GET /stores
// @access  Private
const getStores = asyncHandler(async (req, res) => {
  const stores = await Store.find({ owner: req.user._id });
  const normalizedStores = stores.map(store => ({
    ...store.toObject(),
    bannerImage: store.bannerImage ? store.bannerImage.replace('/uploads/', '') : null,
    featuredImage: store.featuredImage ? store.featuredImage.replace('/uploads/', '') : null,
    logo: store.logo ? store.logo.replace('/uploads/', '') : null,
  }));
  res.json(normalizedStores);
});


// @desc    Get a single store by ID
// @route   GET /stores/:id
// @access  Private
const getStoreById = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) {
    res.status(404);
    throw new Error('Store not found');
  }
  if (store.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this store');
  }
  const normalizedStore = {
    ...store.toObject(),
    bannerImage: store.bannerImage ? store.bannerImage.replace('/uploads/', '') : null,
    featuredImage: store.featuredImage ? store.featuredImage.replace('/uploads/', '') : null,
    logo: store.logo ? store.logo.replace('/uploads/', '') : null,
  };
  console.log('Store: Fetched store:', normalizedStore);
  res.json(normalizedStore);
});

// @desc    Create a new store
// @route   POST /stores
// @access  Private
const createStore = asyncHandler(async (req, res) => {
  const { name, description, slogan } = req.body;
  const owner = req.user._id;

  if (!name || !description) {
    res.status(400);
    throw new Error('Name and description are required');
  }

  const storeData = { name, description, slogan, owner };
  const uploadPath = path.join(__dirname, '..', 'uploads');

  if (req.files) {
    if (req.files.bannerImage) {
      const fileName = `${Date.now()}-${req.files.bannerImage.name}`;
      const filePath = path.join(uploadPath, fileName);
      await req.files.bannerImage.mv(filePath);
      storeData.bannerImage = fileName; // Filename only
    }
    if (req.files.featuredImage) {
      const fileName = `${Date.now()}-${req.files.featuredImage.name}`;
      const filePath = path.join(uploadPath, fileName);
      await req.files.featuredImage.mv(filePath);
      storeData.featuredImage = fileName; // Filename only
    }
    if (req.files.logo) {
      const fileName = `${Date.now()}-${req.files.logo.name}`;
      const filePath = path.join(uploadPath, fileName);
      await req.files.logo.mv(filePath);
      storeData.logo = fileName; // Filename only
    }
  }

  const store = new Store(storeData);
  const createdStore = await store.save();
  res.status(201).json(createdStore);
});

// @desc    Update a store
// @route   PUT /stores/:id
// @access  Private
const updateStore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, slogan } = req.body;

  const store = await Store.findById(id);
  if (!store) {
    res.status(404);
    throw new Error('Store not found');
  }
  if (store.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this store');
  }

  const uploadPath = path.join(__dirname, '..', 'uploads');
  if (req.files) {
    if (req.files.bannerImage) {
      const fileName = `${Date.now()}-${req.files.bannerImage.name}`;
      const filePath = path.join(uploadPath, fileName);
      await req.files.bannerImage.mv(filePath);
      store.bannerImage = fileName; // Filename only
    }
    if (req.files.featuredImage) {
      const fileName = `${Date.now()}-${req.files.featuredImage.name}`;
      const filePath = path.join(uploadPath, fileName);
      await req.files.featuredImage.mv(filePath);
      store.featuredImage = fileName; // Filename only
    }
    if (req.files.logo) {
      const fileName = `${Date.now()}-${req.files.logo.name}`;
      const filePath = path.join(uploadPath, fileName);
      await req.files.logo.mv(filePath);
      store.logo = fileName; // Filename only
    }
  }

  store.name = name || store.name;
  store.description = description || store.description;
  store.slogan = slogan || store.slogan;

  const updatedStore = await store.save();
  res.json(updatedStore);
});

// @desc    Delete a store
// @route   DELETE /stores/:id
// @access  Private
const deleteStore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const store = await Store.findById(id);
  if (!store) {
    res.status(404);
    throw new Error('Store not found');
  }
  if (store.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this store');
  }

  const uploadPath = path.join(__dirname, '..', 'uploads');
  for (const field of ['bannerImage', 'featuredImage', 'logo']) {
    if (store[field]) {
      const filePath = path.join(uploadPath, store[field].replace('/uploads/', ''));
      try {
        await fs.unlink(filePath);
        console.log(`Deleted ${field} file:`, filePath);
      } catch (err) {
        console.error(`Error deleting ${field} file (ignored):`, err.message);
      }
    }
  }

  await Store.deleteOne({ _id: id });
  res.status(204).send();
});

module.exports = {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
};

