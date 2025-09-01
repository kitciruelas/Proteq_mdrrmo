const express = require('express');
const router = express.Router();
const pool = require('../config/conn');

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin dashboard routes are working!'
  });
});

// GET - Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('Fetching dashboard statistics...');
    
    // Get total counts
    const [userStats] = await pool.execute(`
      SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_users_month
      FROM general_users
      WHERE status = 1
    `);

    const [staffStats] = await pool.execute(`
      SELECT
        COUNT(*) as total_staff,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_staff
      FROM staff
      WHERE status = 1
    `);

    const [incidentStats] = await pool.execute(`
      SELECT
        COUNT(*) as total_incidents,
        SUM(CASE WHEN status = 'pending' OR status = 'in_progress' THEN 1 ELSE 0 END) as active_incidents,
        SUM(CASE WHEN priority_level = 'high' OR priority_level = 'critical' THEN 1 ELSE 0 END) as high_priority_incidents,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as incidents_this_week
      FROM incident_reports
    `);

    const [alertStats] = await pool.execute(`
      SELECT
        COUNT(*) as total_alerts,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_alerts,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as alerts_this_week
      FROM alerts
    `);
    
    // Get recent activity (using incident reports as activity proxy)
    const [recentActivity] = await pool.execute(`
      SELECT
        'incident_report' as action,
        CONCAT('New incident: ', ir.incident_type) as details,
        ir.created_at,
        'user' as user_type,
        ir.reported_by as user_id,
        CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name
      FROM incident_reports ir
      LEFT JOIN general_users gu ON ir.reported_by = gu.user_id
      ORDER BY ir.created_at DESC
      LIMIT 10
    `);

    // Get incident trends (last 7 days)
    const [incidentTrends] = await pool.execute(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM incident_reports
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get user registration trends (last 30 days)
    const [userTrends] = await pool.execute(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM general_users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      AND status = 1
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    res.json({
      success: true,
      stats: {
        users: userStats[0],
        staff: staffStats[0],
        incidents: incidentStats[0],
        alerts: alertStats[0]
      },
      recentActivity,
      trends: {
        incidents: incidentTrends,
        users: userTrends
      }
    });
    
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
});

// GET - System overview
router.get('/overview', async (req, res) => {
  try {
    console.log('Fetching system overview...');
    
    // Get user type distribution
    const [userTypeStats] = await pool.execute(`
      SELECT user_type, COUNT(*) as user_count
      FROM general_users
      WHERE status = 1
      GROUP BY user_type
      ORDER BY user_count DESC
    `);

    // Get incident types distribution
    const [incidentTypes] = await pool.execute(`
      SELECT incident_type, COUNT(*) as count
      FROM incident_reports
      GROUP BY incident_type
      ORDER BY count DESC
    `);

    // Get alert types distribution
    const [alertTypes] = await pool.execute(`
      SELECT alert_type, COUNT(*) as count
      FROM alerts
      GROUP BY alert_type
      ORDER BY count DESC
    `);

    // Get evacuation centers status
    const [evacuationCenters] = await pool.execute(`
      SELECT
        COUNT(*) as total_centers,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_centers,
        SUM(CASE WHEN status = 'full' THEN 1 ELSE 0 END) as full_centers,
        SUM(capacity) as total_capacity,
        SUM(current_occupancy) as total_occupancy
      FROM evacuation_centers
    `);
    
    res.json({
      success: true,
      overview: {
        userTypeDistribution: userTypeStats,
        incidentTypes,
        alertTypes,
        evacuationCenters: evacuationCenters[0]
      }
    });
    
  } catch (error) {
    console.error('Error fetching system overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system overview',
      error: error.message
    });
  }
});

// GET - Analytics data for charts
router.get('/analytics', async (req, res) => {
  try {
    console.log('Fetching analytics data for charts...');
    
    // Get incident trends for last 30 days
    const [incidentTrends30Days] = await pool.execute(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM incident_reports
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get user registration trends for last 90 days
    const [userTrends90Days] = await pool.execute(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM general_users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      AND status = 1
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get incident status distribution
    const [incidentStatus] = await pool.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM incident_reports
      GROUP BY status
      ORDER BY count DESC
    `);

    // Get incident priority distribution
    const [incidentPriority] = await pool.execute(`
      SELECT 
        priority_level as priority,
        COUNT(*) as count
      FROM incident_reports
      GROUP BY priority_level
      ORDER BY count DESC
    `);

    // Get evacuation center occupancy rates
    const [evacuationOccupancy] = await pool.execute(`
      SELECT 
        name,
        capacity,
        current_occupancy,
        ROUND((current_occupancy / capacity) * 100, 2) as occupancy_rate
      FROM evacuation_centers
      WHERE status = 'open'
      ORDER BY occupancy_rate DESC
      LIMIT 10
    `);

    // Get monthly incident summary
    const [monthlyIncidents] = await pool.execute(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as total_incidents,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_incidents,
        SUM(CASE WHEN priority_level = 'high' OR priority_level = 'critical' THEN 1 ELSE 0 END) as high_priority_incidents
      FROM incident_reports
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    res.json({
      success: true,
      analytics: {
        incidentTrends30Days,
        userTrends90Days,
        incidentStatus,
        incidentPriority,
        evacuationOccupancy,
        monthlyIncidents
      }
    });
    
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
});

module.exports = router;
