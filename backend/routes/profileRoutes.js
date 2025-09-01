const express = require('express');
const router = express.Router();
const pool = require('../config/conn');
const { authenticateUser } = require('../middleware/authMiddleware');

// Get current user profile (authenticated user)
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const [users] = await pool.execute(
      `SELECT user_id, first_name as firstName, last_name as lastName, 
              email, phone, address, city, state, zip_code as zipCode,
              profile_picture as profilePicture, created_at, updated_at
       FROM general_users 
       WHERE user_id = ? AND status = 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Update user profile (authenticated user)
router.put('/update', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zipCode
    } = req.body;

    console.log('Profile update request from user ID:', userId, req.body);

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Check if email is being changed and if it's already taken by another user
    if (email) {
      const [existingUsers] = await pool.execute(
        'SELECT user_id FROM general_users WHERE email = ? AND user_id != ?',
        [email, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email already taken by another user'
        });
      }
    }

    // Update user profile
    await pool.execute(
      `UPDATE general_users 
       SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, 
           city = ?, state = ?, zip_code = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [
        firstName,
        lastName,
        email,
        phone || null,
        address || null,
        city || null,
        state || null,
        zipCode || null,
        userId
      ]
    );

    console.log('Profile updated for user ID:', userId);

    // Log profile update
    try {
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
      await pool.execute(`
        INSERT INTO activity_logs (general_user_id, action, details, ip_address, created_at)
        VALUES (?, 'profile_update', ?, ?, NOW())
      `, [userId, `Profile updated for user: ${email}`, clientIP]);
      console.log('✅ Activity logged: profile_update');
    } catch (logError) {
      console.error('❌ Failed to log profile update activity:', logError.message);
    }

    // Get updated user data
    const [updatedUsers] = await pool.execute(
      `SELECT user_id, first_name as firstName, last_name as lastName, 
              email, phone, address, city, state, zip_code as zipCode,
              profile_picture as profilePicture, created_at, updated_at
       FROM general_users 
       WHERE user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUsers[0]
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile. Please try again.'
    });
  }
});

// Get user profile by email (admin only - keep for backward compatibility)
router.get('/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const [users] = await pool.execute(
      `SELECT user_id, first_name as firstName, last_name as lastName, 
              email, phone, address, city, state, zip_code as zipCode, created_at, updated_at
       FROM general_users 
       WHERE email = ? AND status = 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

module.exports = router;
