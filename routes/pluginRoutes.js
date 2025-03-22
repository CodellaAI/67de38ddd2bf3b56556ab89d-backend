
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
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
  downloadPlugin
} = require('../controllers/pluginController');
const { protect } = require('../middleware/authMiddleware');

// Ensure upload directories exist
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

createDirIfNotExists('./uploads/plugins');
createDirIfNotExists('./uploads/thumbnails');

// Setup storage for plugin files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'jarFile') {
      cb(null, './uploads/plugins/');
    } else if (file.fieldname === 'thumbnail') {
      cb(null, './uploads/thumbnails/');
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'jarFile') {
    if (path.extname(file.originalname).toLowerCase() === '.jar') {
      cb(null, true);
    } else {
      cb(new Error('Only JAR files are allowed!'), false);
    }
  } else if (file.fieldname === 'thumbnail') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: file => file.fieldname === 'jarFile' ? 50 * 1024 * 1024 : 2 * 1024 * 1024 
  }
});

// Handle both JAR and thumbnail uploads
const uploadFields = upload.fields([
  { name: 'jarFile', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Routes
router.route('/')
  .post(protect, uploadFields, createPlugin)
  .get(getPlugins);

router.get('/featured', getFeaturedPlugins);
router.get('/my-plugins', protect, getUserPlugins);

router.route('/:id')
  .get(getPluginById)
  .put(protect, uploadFields, updatePlugin)
  .delete(protect, deletePlugin);

router.post('/:id/rate', protect, ratePlugin);
router.get('/:id/rating', protect, getUserRating);
router.post('/:id/purchase', protect, purchasePlugin);
router.get('/:id/download', protect, downloadPlugin);

module.exports = router;
