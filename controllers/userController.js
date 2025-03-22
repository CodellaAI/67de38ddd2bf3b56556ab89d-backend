
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const Plugin = require('../models/pluginModel');
const bcrypt = require('bcryptjs');

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if username is being changed and if it's already taken
  if (req.body.username && req.body.username !== user.username) {
    const userWithUsername = await User.findOne({ username: req.body.username });
    if (userWithUsername) {
      res.status(400);
      throw new Error('Username already taken');
    }
  }

  // Check if email is being changed and if it's already taken
  if (req.body.email && req.body.email !== user.email) {
    const userWithEmail = await User.findOne({ email: req.body.email });
    if (userWithEmail) {
      res.status(400);
      throw new Error('Email already taken');
    }
  }

  // Check if password is being updated
  if (req.body.newPassword) {
    // Verify current password
    if (!req.body.currentPassword) {
      res.status(400);
      throw new Error('Current password is required to set a new password');
    }

    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      res.status(400);
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = req.body.newPassword;
  }

  // Update user fields
  user.username = req.body.username || user.username;
  user.email = req.body.email || user.email;

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    username: updatedUser.username,
    email: updatedUser.email,
  });
});

// @desc    Get user's purchased plugins
// @route   GET /api/users/purchases
// @access  Private
const getUserPurchases = asyncHandler(async (req, res) => {
  const plugins = await Plugin.find({
    'purchases.user': req.user._id,
  }).populate('author', 'username');

  // Format response
  const purchases = plugins.map((plugin) => {
    const userPurchase = plugin.purchases.find(
      (purchase) => purchase.user.toString() === req.user._id.toString()
    );

    return {
      _id: userPurchase._id,
      plugin: {
        _id: plugin._id,
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        author: plugin.author,
        thumbnail: plugin.thumbnail,
        averageRating: plugin.averageRating,
      },
      price: userPurchase.price,
      purchaseDate: userPurchase.purchaseDate,
    };
  });

  res.json(purchases);
});

module.exports = {
  updateUserProfile,
  getUserPurchases,
};
