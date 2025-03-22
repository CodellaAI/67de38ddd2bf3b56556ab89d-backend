
const express = require('express');
const router = express.Router();
const { updateUserProfile, getUserPurchases } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.put('/profile', protect, updateUserProfile);
router.get('/purchases', protect, getUserPurchases);

module.exports = router;
