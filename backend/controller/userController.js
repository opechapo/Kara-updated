const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const mongoose = require('mongoose');
const { SiweMessage, generateNonce } = require('siwe');
const ethers = require('ethers');
const generateToken = require('../utils/generateToken');
const nodemailer = require('nodemailer');
const path = require('path');

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'phonemask000@gmail.com',
    pass: 'qpmcddpxmhfdidfv',
  },
});


const sendWelcomeEmail = async (email) => {
  try {
    await transporter.sendMail({
      from: '"KARA" <phonemask000@gmail.com>',
      to: email,
      subject: 'Welcome to KARA!',
      text: 'Thanks for joining KARA! We’re excited to have you on board.',
      html: '<h1>Welcome to KARA!</h1><p>Thanks for joining us! We’re excited to have you on board.</p>',
    });
    console.log('Welcome email sent to:', email);
  } catch (error) {
    console.error('Error sending welcome email:', error.message, error.stack);
    throw new Error('Failed to send welcome email');
  }
};

// Get Nonce
const getNonce = asyncHandler(async (req, res) => {
  const { walletAddress } = req.params;
  console.log('getNonce called for walletAddress:', walletAddress);

  if (!ethers.utils.isAddress(walletAddress)) {
    console.warn('Invalid wallet address:', walletAddress);
    res.status(400);
    throw new Error('Invalid wallet address');
  }

  const normalizedAddress = walletAddress.toLowerCase();
  const nonce = generateNonce();

  try {
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected, state:', mongoose.connection.readyState);
      res.status(500);
      throw new Error('Database connection unavailable');
    }

    console.log('Attempting to find or create user for:', normalizedAddress);
    let user = await User.findOneAndUpdate(
      { walletAddress: normalizedAddress },
      {
        $setOnInsert: {
          walletAddress: normalizedAddress,
          isAdmin: false,
          createdAt: new Date(),
          email: null,
        },
        $set: {
          nonce,
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    if (!user) {
      console.error('Failed to find or create user:', normalizedAddress);
      res.status(500);
      throw new Error('Failed to process user');
    }

    console.log('User processed:', normalizedAddress, 'nonce:', user.nonce);
    res.json({ success: true, data: { nonce: user.nonce } });
  } catch (error) {
    console.error('Error in getNonce:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    if (error.code === 11000) {
      console.warn('Duplicate key error on walletAddress, fetching existing user:', normalizedAddress);
      try {
        const existingUser = await User.findOne({ walletAddress: normalizedAddress }).lean();
        if (existingUser) {
          console.log('Found existing user:', normalizedAddress, 'nonce:', existingUser.nonce);
          return res.json({ success: true, data: { nonce: existingUser.nonce || nonce } });
        }
      } catch (retryError) {
        console.error('Retry failed:', retryError.message);
      }
      res.status(500);
      throw new Error('Failed to generate nonce: Unable to resolve duplicate wallet address');
    }
    res.status(500);
    throw new Error(`Failed to generate nonce: ${error.message}`);
  }
});

// Connect Wallet
const connectWallet = asyncHandler(async (req, res) => {
  console.log('connectWallet called:', req.method, req.url);
  const { walletAddress, signature, message, email } = req.body;
  console.log('Request body:', { walletAddress, signature, message, email });

  if (!walletAddress || !signature || !message || !ethers.utils.isAddress(walletAddress)) {
    console.warn('Invalid request parameters:', { walletAddress, signature, message });
    res.status(400);
    throw new Error('Wallet address, signature, and message are required');
  }

  const normalizedAddress = walletAddress.toLowerCase();

  try {
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected, state:', mongoose.connection.readyState);
      res.status(500);
      throw new Error('Database connection unavailable');
    }

    let user = await User.findOne({ walletAddress: normalizedAddress });
    if (!user) {
      console.error('User not found for:', normalizedAddress);
      res.status(404);
      throw new Error('User not found. Please try connecting again.');
    }
    console.log('Existing user found:', normalizedAddress, 'nonce:', user.nonce);

    if (!user.nonce) {
      console.warn('User nonce is null or undefined:', normalizedAddress);
      user.nonce = generateNonce();
      await user.save();
      console.log('Assigned new nonce:', user.nonce);
    }

    console.log('Verifying SIWE message for:', normalizedAddress);
    console.log('Received message:', message);

    // Validate and parse SIWE message
    let siweMessage;
    try {
      siweMessage = new SiweMessage(message);
      console.log('SIWE message parsed:', siweMessage);
    } catch (parseError) {
      console.error('Error parsing SIWE message:', parseError.message, parseError.stack);
      res.status(400);
      throw new Error(`Failed to parse SIWE message: ${parseError.message}`);
    }

    // Verify SIWE message
    try {
      await siweMessage.verify({
        signature,
        nonce: user.nonce,
        domain: process.env.NODE_ENV === 'development' ? 'localhost:5173' : req.headers.host,
      });
      console.log('SIWE message verified successfully');
    } catch (verifyError) {
      console.error('SIWE verification error:', {
        message: verifyError.message || 'Unknown error',
        error: verifyError,
        stack: verifyError.stack,
        receivedNonce: message.nonce,
        expectedNonce: user.nonce,
      });
      res.status(401);
      throw new Error(`Invalid SIWE message or signature: ${verifyError.message || 'Verification failed'}`);
    }

    if (siweMessage.address.toLowerCase() !== normalizedAddress) {
      console.warn('Address mismatch:', {
        siweAddress: siweMessage.address,
        normalizedAddress,
      });
      res.status(401);
      throw new Error('SIWE address does not match provided wallet address');
    }

    if (email && email.toLowerCase() !== user.email) {
      console.log('Updating email for:', normalizedAddress);
      user.email = email.toLowerCase();
      if (!user.welcomeEmailSent) {
        try {
          await sendWelcomeEmail(email);
          user.welcomeEmailSent = true;
          console.log('Welcome email sent for:', normalizedAddress);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError.message, emailError.stack);
        }
      }
    }

    console.log('Clearing nonce for:', normalizedAddress);
    user.nonce = null;
    await user.save();
    console.log('User saved after login:', normalizedAddress);

    console.log('Generating token for:', normalizedAddress);
    const token = generateToken(user._id);
    console.log('Generated token:', token);

    res.json({
      success: true,
      data: {
        token,
        isAdmin: user.isAdmin,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error) {
    console.error('Error in connectWallet:', error.message, error.stack);
    res.status(error.status || 500);
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
});

// Get User
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-nonce');
  if (!user) {
    console.warn('User not found for ID:', req.user._id);
    res.status(404);
    throw new Error('User not found');
  }
  res.json({
    success: true,
    data: {
      _id: user._id,
      walletAddress: user.walletAddress,
      email: user.email,
      avatarUrl: user.avatarUrl,
      ordersCreated: user.ordersCreated || 0,
      ordersReceived: user.ordersReceived || 0,
      createdAt: user.createdAt,
      welcomeEmailSent: user.welcomeEmailSent,
      isAdmin: user.isAdmin,
    },
  });
});

// Update User
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    console.warn('User not found for ID:', req.user._id);
    res.status(404);
    throw new Error('User not found');
  }

  const { email } = req.body;
  if (email) {
    console.log('Updating email for user:', user.walletAddress);
    user.email = email.toLowerCase();
  }

  if (req.files && req.files.avatar) {
    console.log('Received avatar file for:', user.walletAddress);
    const avatar = req.files.avatar;
    const avatarUrl = `/Uploads/${Date.now()}-${avatar.name}`;
    const filePath = path.join(__dirname, '..', 'Uploads', avatarUrl.split('/Uploads/')[1]);
    await avatar.mv(filePath);
    user.avatarUrl = avatarUrl;
    console.log('Avatar saved, new avatarUrl:', user.avatarUrl);
  }

  const updatedUser = await user.save();
  console.log('User updated:', updatedUser.walletAddress);
  res.json({
    success: true,
    data: {
      _id: updatedUser._id,
      walletAddress: updatedUser.walletAddress,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
      ordersCreated: updatedUser.ordersCreated || 0,
      ordersReceived: updatedUser.ordersReceived || 0,
      createdAt: updatedUser.createdAt,
      welcomeEmailSent: updatedUser.welcomeEmailSent,
      isAdmin: updatedUser.isAdmin,
    },
  });
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  console.log('Logging out user');
  res.clearCookie('token', {
    path: '/',
    httpOnly: true,
    sameSite: 'none',
    secure: true,
  });
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});


module.exports = { getNonce, connectWallet, getUser, updateUser, logoutUser };