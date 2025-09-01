const express = require('express');
const router = express.Router();
const { loginUser, loginAdmin, loginStaff, registerUser, forgotPassword, resetPassword, verifyOTP } = require('../controllers/authController');

// User login route
router.post('/login/user', loginUser);

// Admin login route
router.post('/login/admin', loginAdmin);

// Staff login route
router.post('/login/staff', loginStaff);

// User registration route
console.log('Setting up POST /register route...');
router.post('/register', (req, res, next) => {
    console.log('Registration route hit via router!');
    console.log('Request body:', req.body);
    registerUser(req, res, next);
});

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Test route
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Auth routes are working'
    });
});

module.exports = router;
