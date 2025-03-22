const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create directories
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

createDirIfNotExists('./uploads/plugins');
createDirIfNotExists('./uploads/thumbnails');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Direct files to different folders based on field name
    if (file.fieldname === 'jarFile') {
      cb(null, './uploads/plugins/');
    } else if (file.fieldname === 'thumbnail') {
      cb(null, './uploads/thumbnails/');
    } else {
      cb(new Error('Unknown file field'));
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Combined file filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'jarFile') {
    // JAR file validation
    if (file.mimetype === 'application/java-archive' || path.extname(file.originalname).toLowerCase() === '.jar') {
      cb(null, true);
    } else {
      cb(new Error('Only JAR files are allowed for plugin files!'), false);
    }
  } else if (file.fieldname === 'thumbnail') {
    // Image validation
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnails!'), false);
    }
  } else {
    cb(new Error('Unexpected field name'), false);
  }
};

// Create the upload middleware that handles multiple fields
const uploadPluginFiles = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
}).fields([
  { name: 'jarFile', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

module.exports = { uploadPluginFiles };
