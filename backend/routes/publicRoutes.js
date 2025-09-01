const express = require('express');
const router = express.Router();
const pool = require('../config/conn');

// GET - Public stats for home page
router.get('/stats', async (req, res) => {
  try {
    // Get total active responders (staff with status=1)
    const [responders] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM staff
      WHERE status = 1
    `);

    // Get total evacuation centers
    const [evacCenters] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM evacuation_centers
    `);

    // Get total residents covered (total users)
    const [residents] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM general_users
      WHERE status = 1
    `);

    // Get total incidents count
    const [incidents] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM incident_reports
    `);

    res.json({
      success: true,
      stats: {
        responders: responders[0].count,
        evacuationCenters: evacCenters[0].count,
        residentsCovered: residents[0].count,
        totalIncidents: incidents[0].count
      }
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public stats',
      error: error.message
    });
  }
});

module.exports = router;
