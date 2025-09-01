const pool = require('../config/conn');

/**
 * Activity Logger Utility
 * Handles logging activities with proper foreign key validation
 */

class ActivityLogger {
  /**
   * Log an activity with proper user validation
   * @param {string} userType - 'admin', 'staff', or 'user'
   * @param {number} userId - ID of the user
   * @param {string} action - Action performed
   * @param {string} details - Additional details
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent string
   */
  static async logActivity(userType, userId, action, details = null, ipAddress = null, userAgent = null) {
    try {
      // Validate user exists before logging
      const userExists = await this.validateUser(userType, userId);
      
      if (!userExists) {
        console.error(`Activity logging failed: User ${userType} with ID ${userId} not found`);
        return false;
      }

      // Prepare foreign key values based on user type
      let adminId = null;
      let staffId = null;
      let generalUserId = null;

      switch (userType) {
        case 'admin':
          adminId = userId;
          break;
        case 'staff':
          staffId = userId;
          break;
        case 'user':
          generalUserId = userId;
          break;
        default:
          console.error(`Invalid user type: ${userType}`);
          return false;
      }

      // Insert activity log
      const [result] = await pool.execute(`
        INSERT INTO activity_logs (admin_id, staff_id, general_user_id, action, details, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [adminId, staffId, generalUserId, action, details, ipAddress, userAgent]);

      console.log(`Activity logged: ${userType} ${userId} - ${action}`);
      return result.insertId;
      
    } catch (error) {
      console.error('Error logging activity:', error);
      return false;
    }
  }

  /**
   * Validate that user exists in the appropriate table
   * @param {string} userType - 'admin', 'staff', or 'user'
   * @param {number} userId - ID of the user
   * @returns {boolean} - True if user exists
   */
  static async validateUser(userType, userId) {
    try {
      let query = '';
      let params = [userId];

      switch (userType) {
        case 'admin':
          query = 'SELECT admin_id FROM admin WHERE admin_id = ? AND status = "active"';
          break;
        case 'staff':
          query = 'SELECT id FROM staff WHERE id = ? AND status = 1';
          break;
        case 'user':
          query = 'SELECT user_id FROM general_users WHERE user_id = ? AND status = 1';
          break;
        default:
          return false;
      }

      const [rows] = await pool.execute(query, params);
      return rows.length > 0;
      
    } catch (error) {
      console.error('Error validating user:', error);
      return false;
    }
  }

  /**
   * Get user details for activity logs
   * @param {string} userType - 'admin', 'staff', or 'user'
   * @param {number} userId - ID of the user
   * @returns {object} - User details
   */
  static async getUserDetails(userType, userId) {
    try {
      let query = '';
      let params = [userId];

      switch (userType) {
        case 'admin':
          query = 'SELECT admin_id as id, name, email FROM admin WHERE admin_id = ?';
          break;
        case 'staff':
          query = 'SELECT id, name, email FROM staff WHERE id = ?';
          break;
        case 'user':
          query = 'SELECT user_id as id, CONCAT(first_name, " ", last_name) as name, email FROM general_users WHERE user_id = ?';
          break;
        default:
          return null;
      }

      const [rows] = await pool.execute(query, params);
      return rows.length > 0 ? rows[0] : null;
      
    } catch (error) {
      console.error('Error getting user details:', error);
      return null;
    }
  }

  /**
   * Get activity logs with user details
   * @param {object} filters - Filter options
   * @returns {array} - Activity logs with user details
   */
  static async getActivityLogs(filters = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        userType = 'all',
        action = 'all',
        dateFrom = '',
        dateTo = ''
      } = filters;

      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (userType !== 'all') {
        if (userType === 'admin') {
          whereClause += ' AND al.admin_id IS NOT NULL';
        } else if (userType === 'staff') {
          whereClause += ' AND al.staff_id IS NOT NULL';
        } else if (userType === 'user') {
          whereClause += ' AND al.general_user_id IS NOT NULL';
        }
      }

      if (action !== 'all') {
        whereClause += ' AND al.action LIKE ?';
        queryParams.push(`%${action}%`);
      }

      if (dateFrom) {
        whereClause += ' AND DATE(al.created_at) >= ?';
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND DATE(al.created_at) <= ?';
        queryParams.push(dateTo);
      }

      const offset = (page - 1) * limit;
      queryParams.push(limit, offset);

      const [logs] = await pool.execute(`
        SELECT 
          al.*,
          CASE 
            WHEN al.admin_id IS NOT NULL THEN a.name
            WHEN al.staff_id IS NOT NULL THEN s.name
            WHEN al.general_user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
            ELSE 'Unknown User'
          END as user_name,
          CASE 
            WHEN al.admin_id IS NOT NULL THEN a.email
            WHEN al.staff_id IS NOT NULL THEN s.email
            WHEN al.general_user_id IS NOT NULL THEN u.email
            ELSE NULL
          END as user_email,
          CASE 
            WHEN al.admin_id IS NOT NULL THEN 'admin'
            WHEN al.staff_id IS NOT NULL THEN 'staff'
            WHEN al.general_user_id IS NOT NULL THEN 'user'
            ELSE 'unknown'
          END as user_type
        FROM activity_logs al
        LEFT JOIN admin a ON al.admin_id = a.admin_id
        LEFT JOIN staff s ON al.staff_id = s.id
        LEFT JOIN general_users u ON al.general_user_id = u.user_id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `, queryParams);

      return logs;
      
    } catch (error) {
      console.error('Error getting activity logs:', error);
      return [];
    }
  }
}

module.exports = ActivityLogger;
