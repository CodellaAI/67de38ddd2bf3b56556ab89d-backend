
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create upload directories
createDirIfNotExists('./uploads/plugins');
createDirIfNotExists('./uploads/thumbnails');

// Configure storage for plugin JAR files
const pluginStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/plugins/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for thumbnail images
const thumbnailStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/thumbnails/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for JAR files
const jarFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/java-archive' || path.extname(file.originalname).toLowerCase() === '.jar') {
    cb(null, true);
  } else {
    cb(new Error('Only JAR files are allowed!'), false);
  }
};

// File filter for images
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Setup multer for plugin upload
const uploadPlugin = multer({
  storage: pluginStorage,
  fileFilter: jarFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
}).single('jarFile');

// Setup multer for thumbnail upload
const uploadThumbnail = multer({
  storage: thumbnailStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB max file size
}).single('thumbnail');

// Combined upload middleware for both JAR and thumbnail
const uploadPluginFiles = (req, res, next) => {
  uploadPlugin(req, res, function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    // If no thumbnail, continue
    if (!req.files || !req.files.thumbnail) {
      return next();
    }

    uploadThumbnail(req, res, function (err) {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  });
};

module.exports = { uploadPlugin, uploadThumbnail };
