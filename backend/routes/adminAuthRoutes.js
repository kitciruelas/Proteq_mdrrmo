const express = require('express');
const router = express.Router();
const pool = require('../config/conn');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// POST - Admin registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    console.log('Admin registration attempt:', { name, email });
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }
    
    // Check if admin already exists
    const [existingAdmins] = await pool.execute(
      'SELECT admin_id FROM admin WHERE email = ?',
      [email]
    );
    
    if (existingAdmins.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new admin
    const [result] = await pool.execute(
      'INSERT INTO admin (name, email, password, role, status) VALUES (?, ?, ?, "admin", "active")',
      [name, email, hashedPassword]
    );
    
    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      admin: {
        id: result.insertId,
        name,
        email,
        role: 'admin',
        status: 'active'
      }
    });
    
  } catch (error) {
    console.error('Error during admin registration:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// POST - Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Admin login attempt:', { email });
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find admin by email
    const [admins] = await pool.execute(
      'SELECT * FROM admin WHERE email = ? AND status = "active"',
      [email]
    );
    
    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    const admin = admins[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin.admin_id, 
        email: admin.email, 
        role: admin.role,
        type: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Update last login (if column exists)
    try {
      await pool.execute(
        'UPDATE admin SET updated_at = NOW() WHERE admin_id = ?',
        [admin.admin_id]
      );
    } catch (updateError) {
      console.log('Could not update last login:', updateError.message);
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin.admin_id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status
      }
    });
    
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// POST - Admin logout (optional - mainly for logging)
router.post('/logout', async (req, res) => {
  try {
    // In a real app, you might want to blacklist the token
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error during admin logout:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
});

// GET - Get current admin profile
router.get('/profile', authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.admin.id;
    
    const [admins] = await pool.execute(
      'SELECT admin_id, name, email, role, status, created_at FROM admin WHERE admin_id = ?',
      [adminId]
    );
    
    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    res.json({
      success: true,
      admin: admins[0]
    });
    
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

// Middleware to authenticate admin
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

// POST - Change admin password
router.post('/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin.id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }
    
    // Get current admin
    const [admins] = await pool.execute(
      'SELECT password FROM admin WHERE admin_id = ?',
      [adminId]
    );
    
    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, admins[0].password);
    
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.execute(
      'UPDATE admin SET password = ?, updated_at = NOW() WHERE admin_id = ?',
      [hashedNewPassword, adminId]
    );
    
    // Log the password change
    try {
      await pool.execute(`
        INSERT INTO activity_logs (admin_id, action, details, created_at)
        VALUES (?, 'admin_password_change', ?, NOW())
      `, [adminId, 'Admin changed password successfully']);
    } catch (logError) {
      console.warn('Failed to log admin password change activity:', logError.message);
    }
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Error changing admin password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
});

module.exports = router;
