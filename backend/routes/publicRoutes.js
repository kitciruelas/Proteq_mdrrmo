const express = require('express');
const router = express.Router();

// Public routes that don't require authentication
// These routes are accessible to all users without login

// Health check route (public)
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'MDRRMO Public API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Get public system information
router.get('/system-info', (req, res) => {
    res.json({
        success: true,
        system: 'MDRRMO Disaster Response Management System',
        version: '1.0.0',
        status: 'operational',
        public_endpoints: [
            '/api/public/health',
            '/api/public/system-info'
        ]
    });
});

// Get public alerts (non-sensitive information only)
router.get('/alerts/public', async (req, res) => {
    try {
        const pool = require('../config/conn');

        const [alerts] = await pool.execute(`
            SELECT
                id as alert_id,
                title,
                description as message,
                alert_type,
                alert_severity as severity,
                status,
                created_at
            FROM alerts
            WHERE status = 'active'
            ORDER BY created_at DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            alerts: alerts
        });
    } catch (error) {
        console.error('Error fetching public alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public alerts',
            error: error.message
        });
    }
});

// Get public statistics
router.get('/stats', async (req, res) => {
    try {
        const pool = require('../config/conn');

        // Get various statistics
        const [userStats] = await pool.execute(
            'SELECT COUNT(*) as total_users FROM general_users WHERE status = 1'
        );

        const [staffStats] = await pool.execute(
            'SELECT COUNT(*) as total_staff FROM staff WHERE status = 1'
        );

        const [adminStats] = await pool.execute(
            'SELECT COUNT(*) as total_admins FROM admin WHERE status = "active"'
        );

        const [incidentStats] = await pool.execute(
            'SELECT COUNT(*) as total_incidents FROM incident_reports'
        );

        const [activeIncidents] = await pool.execute(
            'SELECT COUNT(*) as active_incidents FROM incident_reports WHERE status IN ("pending", "in_progress")'
        );

        const [resolvedIncidents] = await pool.execute(
            'SELECT COUNT(*) as resolved_incidents FROM incident_reports WHERE status = "resolved"'
        );

        const [evacuationCenters] = await pool.execute(
            'SELECT COUNT(*) as total_centers FROM evacuation_centers WHERE status IN ("open", "full")'
        );

        const [activeAlerts] = await pool.execute(
            'SELECT COUNT(*) as active_alerts FROM alerts WHERE status = "active"'
        );

        res.json({
            success: true,
            stats: {
                users: {
                    total: userStats[0].total_users || 0
                },
                staff: {
                    total: staffStats[0].total_staff || 0
                },
                admins: {
                    total: adminStats[0].total_admins || 0
                },
                incidents: {
                    total: incidentStats[0].total_incidents || 0,
                    active: activeIncidents[0].active_incidents || 0,
                    resolved: resolvedIncidents[0].resolved_incidents || 0
                },
                evacuation_centers: {
                    total: evacuationCenters[0].total_centers || 0
                },
                alerts: {
                    active: activeAlerts[0].active_alerts || 0
                }
            },
            last_updated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching public stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public statistics',
            error: error.message
        });
    }
});

module.exports = router;
