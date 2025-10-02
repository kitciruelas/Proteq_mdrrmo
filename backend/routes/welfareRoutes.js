const express = require('express');
const router = express.Router();
const db = require('../config/conn');
const { authenticateAny } = require('../middleware/authMiddleware');
const NotificationService = require('../services/notificationService');

// Get welfare check system status
router.get('/status', async (req, res) => {
  try {
    console.log('Fetching welfare check status...');
    
    // Check if table exists first and get the active setting
    try {
      const [settings] = await db.execute(
        'SELECT id, is_active, title, description, message_when_disabled FROM welfare_check_settings WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
      );

      console.log('Welfare settings query result:', settings);

      if (settings.length === 0) {
        return res.json({
          success: true,
          isActive: false,
          title: 'Welfare Check System',
          description: 'Emergency welfare status reporting system for citizens',
          messageWhenDisabled: 'The welfare check system is currently disabled. Please try again later or contact emergency services directly.'
        });
      }

      const setting = settings[0];
      const response = {
        success: true,
        isActive: Boolean(setting.is_active),
        settingId: setting.id,
        title: setting.title,
        description: setting.description,
        messageWhenDisabled: setting.message_when_disabled
      };
      
      console.log('Welfare status response:', response);
      res.json(response);
    } catch (tableError) {
      // If table doesn't exist, return default settings
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        console.log('Welfare check settings table does not exist, returning default settings');
        return res.json({
          success: true,
          isActive: false,
          title: 'Welfare Check System',
          description: 'Emergency welfare status reporting system for citizens',
          messageWhenDisabled: 'The welfare check system is currently disabled. Please try again later or contact emergency services directly.'
        });
      }
      throw tableError;
    }
  } catch (error) {
    console.error('Error fetching welfare check status:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch welfare check status',
      error: error.message
    });
  }
});

// Submit welfare check report
router.post('/submit', authenticateAny, async (req, res) => {
  try {
    console.log('Welfare check submit request:', req.body);
    const { status, additional_info } = req.body;
    const userId = req.user.user_id || req.user.id;
    console.log('User ID:', userId);

    // First check if welfare check system is active and get the active setting
    let activeSettingId = null;
    try {
      const [settings] = await db.execute(
        'SELECT id, is_active, message_when_disabled FROM welfare_check_settings WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
      );

      console.log('Welfare settings for submit:', settings);

      if (settings.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Welfare check system is currently disabled. Please contact the administrator.'
        });
      }

      activeSettingId = settings[0].id;
      console.log('Active setting ID:', activeSettingId);
    } catch (tableError) {
      // If table doesn't exist, system is disabled
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        return res.status(403).json({
          success: false,
          message: 'Welfare check system is not configured. Please contact the administrator.'
        });
      }
      throw tableError;
    }

    // Validate required fields
    if (!status || !['safe', 'needs_help'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either "safe" or "needs_help"'
      });
    }

    // Insert welfare report with the active setting ID
    const [result] = await db.execute(
      'INSERT INTO welfare_reports (user_id, setting_id, status, additional_info) VALUES (?, ?, ?, ?)',
      [userId, activeSettingId, status, additional_info || null]
    );

    console.log('Welfare report inserted:', result);

    // Log activity
    try {
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
      await db.execute(`
        INSERT INTO activity_logs (general_user_id, action, details, ip_address, created_at)
        VALUES (?, 'welfare_report_submit', ?, ?, NOW())
      `, [userId, `Welfare check submitted: ${status}${additional_info ? ' - ' + additional_info.substring(0, 50) + (additional_info.length > 50 ? '...' : '') : ''}`, clientIP]);
      console.log('✅ Activity logged: welfare_report_submit');
    } catch (logError) {
      console.error('❌ Failed to log welfare report submission activity:', logError.message);
    }

    // No notification needed for individual welfare reports
    // Only welfare system settings changes will trigger notifications

    res.json({
      success: true,
      message: 'Welfare check submitted successfully',
      reportId: result.insertId
    });

  } catch (error) {
    console.error('Error submitting welfare check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit welfare check'
    });
  }
});

// Get user's latest welfare check report
router.get('/latest', authenticateAny, async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;

    const [reports] = await db.execute(
      `SELECT report_id, status, additional_info, submitted_at 
       FROM welfare_reports 
       WHERE user_id = ? 
       ORDER BY submitted_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (reports.length === 0) {
      return res.json({
        success: true,
        report: null,
        message: 'No welfare reports found'
      });
    }

    res.json({
      success: true,
      report: reports[0]
    });

  } catch (error) {
    console.error('Error fetching latest welfare check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest welfare check'
    });
  }
});

// Get user's welfare check history
router.get('/history', authenticateAny, async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [reports] = await db.execute(
      `SELECT report_id, status, additional_info, submitted_at 
       FROM welfare_reports 
       WHERE user_id = ? 
       ORDER BY submitted_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM welfare_reports WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      reports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(countResult[0].total / limit),
        totalItems: countResult[0].total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error fetching welfare check history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch welfare check history'
    });
  }
});

// Update user's welfare check report
router.put('/update/:reportId', authenticateAny, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, additional_info } = req.body;
    const userId = req.user.user_id || req.user.id;

    console.log('Welfare check update request:', { reportId, status, additional_info, userId });

    // Validate required fields
    if (!status || !['safe', 'needs_help'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either "safe" or "needs_help"'
      });
    }

    // Check if the report exists and belongs to the user
    const [existingReport] = await db.execute(
      'SELECT report_id, user_id, status FROM welfare_reports WHERE report_id = ? AND user_id = ?',
      [reportId, userId]
    );

    if (existingReport.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Welfare report not found or you do not have permission to update it'
      });
    }

    // Get the old status for logging
    const oldStatus = existingReport[0].status;

    // Update the welfare report
    const [result] = await db.execute(
      'UPDATE welfare_reports SET status = ?, additional_info = ?, submitted_at = CURRENT_TIMESTAMP WHERE report_id = ? AND user_id = ?',
      [status, additional_info || null, reportId, userId]
    );

    console.log('Welfare report updated:', result);

    // Log activity
    try {
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
      await db.execute(`
        INSERT INTO activity_logs (general_user_id, action, details, ip_address, created_at)
        VALUES (?, 'welfare_report_update', ?, ?, NOW())
      `, [userId, `Welfare check updated: status changed from "${oldStatus}" to "${status}"${additional_info ? ' - ' + additional_info.substring(0, 50) + (additional_info.length > 50 ? '...' : '') : ''}`, clientIP]);
      console.log('✅ Activity logged: welfare_report_update');
    } catch (logError) {
      console.error('❌ Failed to log welfare report update activity:', logError.message);
    }

    res.json({
      success: true,
      message: 'Welfare check updated successfully',
      reportId: reportId
    });

  } catch (error) {
    console.error('Error updating welfare check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update welfare check'
    });
  }
});

module.exports = router;
