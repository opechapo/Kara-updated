const asyncHandler = require("express-async-handler");
const Collection = require("../models/Collection");
const Store = require("../models/Store");
const path = require("path");
const fs = require("fs").promises;

// @desc    Get a single collection by ID
// @route   GET /collections/:id
// @access  Private
const getCollectionById = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id)
    .populate('store', 'name')
    .populate('owner', 'walletAddress _id');
  if (!collection) {
    res.status(404);
    throw new Error("Collection not found");
  }
  if (collection.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to view this collection");
  }
  const normalizedCollection = {
    ...collection.toObject(),
    generalImage: collection.generalImage ? collection.generalImage.replace('/uploads/', '') : null,
  };
  console.log('Collection: Fetched collection:', normalizedCollection);
  res.json({ success: true, data: normalizedCollection });
});

// @desc    Create a new collection
// @route   POST /collections
// @access  Private
const createCollection = asyncHandler(async (req, res) => {
  const { name, shortDescription, store, description } = req.body;
  const owner = req.user._id;

  if (!name || !shortDescription || !store) {
    res.status(400);
    throw new Error("Name, short description, and store are required");
  }

  const storeExists = await Store.findById(store);
  if (!storeExists || storeExists.owner.toString() !== owner.toString()) {
    res.status(403);
    throw new Error("Store not found or not authorized");
  }

  const collectionData = { name, shortDescription, store, description, owner };
  const uploadPath = path.join(__dirname, "..", "Uploads");

  if (req.files && req.files.generalImage) {
    const file = req.files.generalImage;
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadPath, fileName);
    console.log("Saving file to:", filePath);

    try {
      await file.mv(filePath);
      console.log("File saved successfully");
      collectionData.generalImage = `/uploads/${fileName}`;
    } catch (err) {
      console.error("File save error:", err);
      throw new Error(`Failed to save file: ${err.message}`);
    }
  }

  const collection = await Collection.create(collectionData);
  const normalizedCollection = {
    ...collection.toObject(),
    generalImage: collection.generalImage ? collection.generalImage.replace('/uploads/', '') : null,
  };
  res.status(201).json({ success: true, data: normalizedCollection });
});

// @desc    Update a collection
// @route   PUT /collections/:id
// @access  Private
const updateCollection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, shortDescription, store, description } = req.body;

  const collection = await Collection.findById(id);
  if (!collection || collection.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Collection not found or not authorized");
  }

  if (store) {
    const storeExists = await Store.findById(store);
    if (!storeExists || storeExists.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Store not found or not authorized");
    }
    collection.store = store;
  }

  collection.name = name || collection.name;
  collection.shortDescription = shortDescription || collection.shortDescription;
  collection.description = description || collection.description;

  const uploadPath = path.join(__dirname, "..", "Uploads");
  if (req.files && req.files.generalImage) {
    const file = req.files.generalImage;
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadPath, fileName);
    console.log("Saving file to:", filePath);

    try {
      await file.mv(filePath);
      console.log("File saved successfully");
      if (collection.generalImage) {
        const oldFilePath = path.join(uploadPath, collection.generalImage.replace('/uploads/', ''));
        try {
          await fs.unlink(oldFilePath);
          console.log("Deleted old file:", oldFilePath);
        } catch (err) {
          console.error("Old file deletion error (ignored):", err.message);
        }
      }
      collection.generalImage = `/uploads/${fileName}`;
    } catch (err) {
      console.error("File save error:", err);
      throw new Error(`Failed to save file: ${err.message}`);
    }
  }

  const updatedCollection = await collection.save();
  const normalizedCollection = {
    ...updatedCollection.toObject(),
    generalImage: updatedCollection.generalImage ? updatedCollection.generalImage.replace('/uploads/', '') : null,
  };
  res.json({ success: true, data: normalizedCollection });
});

// @desc    Delete a collection
// @route   DELETE /collections/:id
// @access  Private
const deleteCollection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const collection = await Collection.findById(id);
  if (!collection || collection.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Collection not found or not authorized");
  }

  if (collection.generalImage) {
    const filePath = path.join(__dirname, "..", "Uploads", collection.generalImage.replace('/uploads/', ''));
    try {
      await fs.unlink(filePath);
      console.log("Deleted file:", filePath);
    } catch (err) {
      console.error("File deletion error (ignored):", err.message);
    }
  }

  await Collection.deleteOne({ _id: id });
  res.status(200).json({ success: true, message: "Collection deleted successfully" });
});

module.exports = { getCollectionById, createCollection, updateCollection, deleteCollection };