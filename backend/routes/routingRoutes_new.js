const express = require('express');
const router = express.Router();

// Check for road closures (placeholder - would need external traffic/incident data)
router.post('/check-closures', async (req, res) => {
  try {
    const { coordinates } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates provided'
      });
    }

    // For now, return empty closures array
    // In a real implementation, this would check external traffic/incident APIs
    res.json({
      success: true,
      closures: [],
      message: 'No road closures detected'
    });

  } catch (error) {
    console.error('Error checking road closures:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Calculate distance and estimated time between two coordinates
router.post('/calculate-distance', async (req, res) => {
  try {
    const { origin, destination, saveToDatabase = false, routeData } = req.body;

    // Validate input
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination coordinates are required'
      });
    }

    if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinate format. Required: {lat: number, lng: number}'
      });
    }

    // Haversine formula to calculate distance
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Calculate distance
    const distanceKm = calculateDistance(
      parseFloat(origin.lat),
      parseFloat(origin.lng),
      parseFloat(destination.lat),
      parseFloat(destination.lng)
    );

    // Calculate estimated time (assuming average speed of 30 km/h for evacuation routes)
    const averageSpeedKmh = 30;
    const estimatedTimeMinutes = Math.round((distanceKm / averageSpeedKmh) * 60);

    const result = {
      success: true,
      data: {
        origin: {
          lat: parseFloat(origin.lat),
          lng: parseFloat(origin.lng)
        },
        destination: {
          lat: parseFloat(destination.lat),
          lng: parseFloat(destination.lng)
        },
        distance: {
          km: Math.round(distanceKm * 100) / 100,
          meters: Math.round(distanceKm * 1000)
        },
        estimated_time: {
          minutes: estimatedTimeMinutes,
          hours: Math.round((estimatedTimeMinutes / 60) * 100) / 100
        },
        average_speed_kmh: averageSpeedKmh
      }
    };

    // Optionally save to database
    if (saveToDatabase && routeData) {
      // Import database connection (assuming it's available)
      const db = require('../config/database');

      const insertQuery = `
        INSERT INTO evacuation_routes
        (name, description, center_id, start_location, end_location,
         start_latitude, start_longitude, distance, estimated_time,
         priority, status, waypoints)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const waypointsJson = routeData.waypoints ? JSON.stringify(routeData.waypoints) : '[]';

      const values = [
        routeData.name || 'Calculated Route',
        routeData.description || 'Route calculated via API',
        routeData.center_id,
        routeData.start_location || 'Origin',
        routeData.end_location || 'Destination',
        parseFloat(origin.lat),
        parseFloat(origin.lng),
        result.data.distance.km,
        result.data.estimated_time.minutes,
        routeData.priority || 'primary',
        routeData.status || 'active',
        waypointsJson
      ];

      try {
        const [insertResult] = await db.execute(insertQuery, values);
        result.data.saved_route_id = insertResult.insertId;
        result.message = 'Distance calculated and route saved successfully';
      } catch (dbError) {
        console.error('Error saving route to database:', dbError);
        result.message = 'Distance calculated but failed to save route';
        result.data.save_error = dbError.message;
      }
    } else {
      result.message = 'Distance calculated successfully';
    }

    res.json(result);

  } catch (error) {
    console.error('Error calculating distance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
