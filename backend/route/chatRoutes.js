// route/chatRoutes.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('express-async-handler');

// Get all messages for a product
router.get('/product/:productId', authMiddleware, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;

  // Verify the product exists
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if the user is the seller or a buyer
  const isSeller = product.owner.toString() === userId.toString();

  // Fetch messages for the product where the user is either sender or receiver
  const messages = await Message.find({
    productId,
    $or: [
      { senderId: userId },
      { receiverId: userId },
    ],
  })
    .populate('senderId', 'walletAddress email')
    .populate('receiverId', 'walletAddress email')
    .sort({ timestamp: 1 });

  res.json(messages);
}));

// Send a new message
router.post('/send', authMiddleware, asyncHandler(async (req, res) => {
  const { productId, message } = req.body;
  const senderId = req.user._id;

  // Validate input
  if (!productId || !message) {
    res.status(400);
    throw new Error('Product ID and message are required');
  }

  // Verify product exists
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Receiver is the product owner (seller) if sender isn’t the owner
  const receiverId = product.owner.toString() === senderId.toString() ? null : product.owner;
  if (!receiverId) {
    res.status(400);
    throw new Error('Cannot send message to yourself');
  }

  const newMessage = new Message({
    productId,
    senderId,
    receiverId,
    message,
  });

  await newMessage.save();
  const populatedMessage = await Message.findById(newMessage._id)
    .populate('senderId', 'walletAddress email')
    .populate('receiverId', 'walletAddress email');

  // Emit Socket.IO event to the product room
  req.app.get('io').to(productId).emit('newMessage', populatedMessage);

  res.status(201).json({ message: 'Message sent', data: populatedMessage });
}));

module.exports = router;