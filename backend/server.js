const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Set NODE_ENV to development if not set (for debugging)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Allow both Vite and React default ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve incident attachments specifically
app.use('/uploads/incidents', express.static(path.join(__dirname, 'uploads', 'incidents')));

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');
const alertsRoutes = require('./routes/alertsRoutes');
const evacuationCentersRoutes = require('./routes/evacuationCentersRoutes');
const evacuationRoutesRoutes = require('./routes/evacuationRoutesRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const profileRoutes = require('./routes/profileRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const safetyProtocolsRoutes = require('./routes/safetyProtocolsRoutes');
const staffManagementRoutes = require('./routes/staffManagementRoutes');
const systemSettingsRoutes = require('./routes/systemSettingsRoutes');
const teamsRoutes = require('./routes/teamsRoutes');
const userManagementRoutes = require('./routes/userManagementRoutes');
const activityLogsRoutes = require('./routes/activityLogsRoutes');
const publicRoutes = require('./routes/publicRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const staffDashboardRoutes = require('./routes/staffDashboardRoutes');

// Routing service proxy
const routingRoutes = require('./routes/routingRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/evacuation-centers', evacuationCentersRoutes);
app.use('/api/evacuation-routes', evacuationRoutesRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/safety-protocols', safetyProtocolsRoutes);
app.use('/api/staff', staffManagementRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/staff/dashboard', staffDashboardRoutes);
app.use('/api/routing', routingRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'MDRRMO Backend API is running',
        timestamp: new Date().toISOString()
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to MDRRMO Backend API',
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`MDRRMO Backend server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
