require('dotenv').config();
const mongoose = require('mongoose');
const connectDb = require('./config/db');
const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');

const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const categoryRoutes = require('./route/categoryRoutes');
const chatRoutes = require('./route/chatRoutes');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/User'); // Added to manage index and cleanup

const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn’t exist
const uploadDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory:', uploadDir);
}

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization',
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));
console.log('Serving static files from:', path.join(__dirname, 'Uploads'));

// Routes
app.use('/api', categoryRoutes);
app.use('/user', require('./route/userRoutes'));
app.use('/admin', require('./route/adminRoutes'));
app.use('/products', require('./route/productRoutes'));
app.use('/orders', require('./route/orderRoutes'));
app.use('/stores', require('./route/storeRoutes'));
app.use('/collections', require('./route/collectionRoutes'));
app.use('/cart', require('./route/cartRoutes'));
app.use('/notifications', require('./route/notificationRoutes'));
app.use('/search', require('./route/searchRoutes'));
app.use('/chat', chatRoutes);
app.use('/escrow', require('./route/escrowRoutes'));

app.get('/', (req, res) => res.send('Hello World'));

// Error handling middleware
app.use(errorHandler);

// Database connection and server start
connectDb();
mongoose.connection.once('open', async () => {
  console.log('Database connected');

  // Drop email_1 index if it exists
  try {
    await User.collection.dropIndex('email_1');
    console.log('Dropped email_1 index');
  } catch (error) {
    if (error.codeName === 'IndexNotFound') {
      console.log('email_1 index not found, no need to drop');
    } else {
      console.error('Error dropping email_1 index:', error.message);
    }
  }

  // Clean up duplicate users for testing wallet (optional)
  try {
    const duplicates = await User.aggregate([
      { $match: { walletAddress: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc' } },
      { $group: { _id: '$walletAddress', ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicates.length > 0) {
      const idsToDelete = duplicates[0].ids.slice(1); // Keep the first ID
      await User.deleteMany({ _id: { $in: idsToDelete } });
      console.log('Removed duplicate users for walletAddress: 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc');
    } else {
      console.log('No duplicate users found for walletAddress: 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc');
    }
  } catch (error) {
    console.error('Error cleaning up duplicates:', error.message);
  }

  // Start the server
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

mongoose.connection.on('error', (err) => {
  console.error('Database connection error:', err);
});