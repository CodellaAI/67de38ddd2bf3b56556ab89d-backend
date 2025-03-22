
const asyncHandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');
const Plugin = require('../models/pluginModel');

// @desc    Create a new plugin
// @route   POST /api/plugins
// @access  Private
const createPlugin = asyncHandler(async (req, res) => {
  const { name, description, price, version, category } = req.body;

  // Check if files were uploaded
  if (!req.files || !req.files.jarFile) {
    res.status(400);
    throw new Error('Please upload a JAR file');
  }

  const jarFilePath = `/uploads/plugins/${req.files.jarFile[0].filename}`;
  let thumbnailPath = null;

  // Check if thumbnail was uploaded
  if (req.files.thumbnail) {
    thumbnailPath = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
  }

  const plugin = await Plugin.create({
    name,
    description,
    price,
    version,
    category,
    author: req.user._id,
    jarFile: jarFilePath,
    thumbnail: thumbnailPath,
    versions: [
      {
        version,
        changelog: 'Initial release',
        jarFile: jarFilePath,
        date: Date.now(),
      },
    ],
  });

  res.status(201).json(plugin);
});

// @desc    Get all plugins
// @route   GET /api/plugins
// @access  Public
const getPlugins = asyncHandler(async (req, res) => {
  const { category, sort } = req.query;
  
  // Build query
  const query = {};
  if (category) {
    query.category = category;
  }
  
  // Build sort options
  let sortOptions = {};
  switch (sort) {
    case 'newest':
      sortOptions = { createdAt: -1 };
      break;
    case 'oldest':
      sortOptions = { createdAt: 1 };
      break;
    case 'price_asc':
      sortOptions = { price: 1 };
      break;
    case 'price_desc':
      sortOptions = { price: -1 };
      break;
    case 'rating':
      sortOptions = { averageRating: -1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }
  
  const plugins = await Plugin.find(query)
    .sort(sortOptions)
    .populate('author', 'username')
    .select('-jarFile');

  res.json(plugins);
});

// @desc    Get featured plugins
// @route   GET /api/plugins/featured
// @access  Public
const getFeaturedPlugins = asyncHandler(async (req, res) => {
  const plugins = await Plugin.find()
    .sort({ averageRating: -1, createdAt: -1 })
    .limit(3)
    .populate('author', 'username')
    .select('-jarFile');

  res.json(plugins);
});

// @desc    Get user's plugins
// @route   GET /api/plugins/my-plugins
// @access  Private
const getUserPlugins = asyncHandler(async (req, res) => {
  const plugins = await Plugin.find({ author: req.user._id })
    .populate('author', 'username')
    .select('-jarFile');

  res.json(plugins);
});

// @desc    Get a plugin by ID
// @route   GET /api/plugins/:id
// @access  Public
const getPluginById = asyncHandler(async (req, res) => {
  const plugin = await Plugin.findById(req.params.id)
    .populate('author', 'username')
    .select('-jarFile');

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  // Check if user has purchased this plugin
  if (req.user) {
    const hasPurchased = plugin.purchases.some(
      (purchase) => purchase.user.toString() === req.user._id.toString()
    );
    plugin._doc.hasPurchased = hasPurchased;
  }

  res.json(plugin);
});

// @desc    Update a plugin
// @route   PUT /api/plugins/:id
// @access  Private
const updatePlugin = asyncHandler(async (req, res) => {
  const plugin = await Plugin.findById(req.params.id);

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  // Check if user is the plugin author
  if (plugin.author.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to update this plugin');
  }

  const { name, description, price, version, category } = req.body;
  let jarFilePath = plugin.jarFile;
  let thumbnailPath = plugin.thumbnail;

  // Check if a new JAR file was uploaded
  if (req.file) {
    jarFilePath = `/uploads/plugins/${req.file.filename}`;
    
    // Add new version to version history
    plugin.versions.push({
      version,
      changelog: req.body.changelog || `Updated to version ${version}`,
      jarFile: jarFilePath,
      date: Date.now(),
    });
  }

  // Check if a new thumbnail was uploaded
  if (req.files && req.files.thumbnail) {
    // Remove old thumbnail if exists
    if (plugin.thumbnail) {
      const oldThumbnailPath = path.join(__dirname, '..', plugin.thumbnail);
      if (fs.existsSync(oldThumbnailPath)) {
        fs.unlinkSync(oldThumbnailPath);
      }
    }
    thumbnailPath = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
  }

  // Update plugin
  plugin.name = name || plugin.name;
  plugin.description = description || plugin.description;
  plugin.price = price || plugin.price;
  plugin.version = version || plugin.version;
  plugin.category = category || plugin.category;
  plugin.jarFile = jarFilePath;
  plugin.thumbnail = thumbnailPath;

  const updatedPlugin = await plugin.save();

  res.json(updatedPlugin);
});

// @desc    Delete a plugin
// @route   DELETE /api/plugins/:id
// @access  Private
const deletePlugin = asyncHandler(async (req, res) => {
  const plugin = await Plugin.findById(req.params.id);

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  // Check if user is the plugin author
  if (plugin.author.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to delete this plugin');
  }

  // Delete JAR file
  if (plugin.jarFile) {
    const jarFilePath = path.join(__dirname, '..', plugin.jarFile);
    if (fs.existsSync(jarFilePath)) {
      fs.unlinkSync(jarFilePath);
    }
  }

  // Delete thumbnail if exists
  if (plugin.thumbnail) {
    const thumbnailPath = path.join(__dirname, '..', plugin.thumbnail);
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }
  }

  // Delete all version JAR files
  plugin.versions.forEach((version) => {
    if (version.jarFile) {
      const versionJarPath = path.join(__dirname, '..', version.jarFile);
      if (fs.existsSync(versionJarPath)) {
        fs.unlinkSync(versionJarPath);
      }
    }
  });

  await plugin.deleteOne();

  res.json({ message: 'Plugin removed' });
});

// @desc    Rate a plugin
// @route   POST /api/plugins/:id/rate
// @access  Private
const ratePlugin = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    res.status(400);
    throw new Error('Rating must be between 1 and 5');
  }

  const plugin = await Plugin.findById(req.params.id);

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  // Check if user has already rated this plugin
  const existingRatingIndex = plugin.ratings.findIndex(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (existingRatingIndex !== -1) {
    // Update existing rating
    plugin.ratings[existingRatingIndex].rating = rating;
    plugin.ratings[existingRatingIndex].comment = comment || plugin.ratings[existingRatingIndex].comment;
  } else {
    // Add new rating
    plugin.ratings.push({
      user: req.user._id,
      rating,
      comment,
    });
  }

  await plugin.save();

  res.json({ message: 'Rating added successfully' });
});

// @desc    Get user's rating for a plugin
// @route   GET /api/plugins/:id/rating
// @access  Private
const getUserRating = asyncHandler(async (req, res) => {
  const plugin = await Plugin.findById(req.params.id);

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  const userRating = plugin.ratings.find(
    (rating) => rating.user.toString() === req.user._id.toString()
  );

  if (!userRating) {
    return res.json({ rating: 0 });
  }

  res.json({
    rating: userRating.rating,
    comment: userRating.comment,
  });
});

// @desc    Purchase a plugin
// @route   POST /api/plugins/:id/purchase
// @access  Private
const purchasePlugin = asyncHandler(async (req, res) => {
  const plugin = await Plugin.findById(req.params.id);

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  // Check if user has already purchased this plugin
  const alreadyPurchased = plugin.purchases.some(
    (purchase) => purchase.user.toString() === req.user._id.toString()
  );

  if (alreadyPurchased) {
    res.status(400);
    throw new Error('You have already purchased this plugin');
  }

  // Add purchase record
  plugin.purchases.push({
    user: req.user._id,
    price: plugin.price,
    purchaseDate: Date.now(),
  });

  await plugin.save();

  res.json({ message: 'Plugin purchased successfully' });
});

// @desc    Download a plugin
// @route   GET /api/plugins/:id/download
// @access  Private
const downloadPlugin = asyncHandler(async (req, res) => {
  const plugin = await Plugin.findById(req.params.id);

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  // Check if user is the author or has purchased the plugin
  const isAuthor = plugin.author.toString() === req.user._id.toString();
  const hasPurchased = plugin.purchases.some(
    (purchase) => purchase.user.toString() === req.user._id.toString()
  );

  if (!isAuthor && !hasPurchased) {
    res.status(401);
    throw new Error('You must purchase this plugin to download it');
  }

  // Get the file path
  const filePath = path.join(__dirname, '..', plugin.jarFile);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.status(404);
    throw new Error('Plugin file not found');
  }

  // Set Content-Disposition header to force download
  res.setHeader('Content-Disposition', `attachment; filename="${plugin.name}.jar"`);
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

module.exports = {
  createPlugin,
  getPlugins,
  getFeaturedPlugins,
  getUserPlugins,
  getPluginById,
  updatePlugin,
  deletePlugin,
  ratePlugin,
  getUserRating,
  purchasePlugin,
  downloadPlugin,
};
