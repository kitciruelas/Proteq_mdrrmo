const express = require('express');
const router = express.Router();
const pool = require('../config/conn');
const nodemailer = require('nodemailer');
const https = require('https');
const { authenticateAdmin } = require('../middleware/authMiddleware');

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// GET - Get all alerts
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all alerts...');
    const [alerts] = await pool.execute(`
      SELECT * FROM alerts 
      ORDER BY created_at DESC
    `);
    
    console.log('Found alerts:', alerts.length);
    res.json({
      success: true,
      alerts
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
});

// GET - Get alert by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching alert with ID:', id);
    
    const [alerts] = await pool.execute(
      'SELECT * FROM alerts WHERE id = ?',
      [id]
    );
    
    if (alerts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    res.json({
      success: true,
      alert: alerts[0]
    });
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert',
      error: error.message
    });
  }
});

// POST - Create new alert
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      recipients,
      priority = 'medium',
      send_immediately = false,
      // Geographic fields
      latitude,
      longitude,
      radius_km,
      location_text
    } = req.body;

    console.log('Creating new alert:', { title, type, priority, latitude, longitude, radius_km, recipients });

    if (!title || !message || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, and type are required'
      });
    }

    // Store recipients info in description
    const recipientsText = recipients && recipients.length > 0 ? ` [Recipients: ${recipients.join(', ')}]` : ' [Recipients: all_users]';
    const fullDescription = message + recipientsText;

    // Set default coordinates if not provided (for email alerts)
    const defaultLat = latitude || 13.7565;  // San Juan, Batangas coordinates
    const defaultLng = longitude || 121.3851;
    const defaultRadius = radius_km || 5.0;

    // Validate alert severity
    const validSeverities = ['emergency', 'warning', 'info'];
    const alertSeverity = validSeverities.includes(type.toLowerCase()) ? type.toLowerCase() : 'warning';

    // Insert into alerts table using the schema-defined fields
    const [result] = await pool.execute(`
      INSERT INTO alerts (alert_type, alert_severity, title, description, latitude, longitude, radius_km, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `, [type, alertSeverity, title, fullDescription, defaultLat, defaultLng, defaultRadius]);

    const alertId = result.insertId;
    console.log('Created alert with ID:', alertId, 'with recipients:', recipients);

    // Log the alert creation
    try {
      const { created_by } = req.body;
      const finalCreatedBy = created_by !== null && created_by !== undefined
        ? created_by
        : (req.admin?.admin_id || req.user?.id || null);

      console.log('Final created_by value to be inserted:', finalCreatedBy);

      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
      await pool.execute(`
        INSERT INTO activity_logs (admin_id, action, details, ip_address, created_at)
        VALUES (?, 'alert_create', ?, ?, NOW())
      `, [finalCreatedBy, `Created alert: ${title} (ID: ${alertId})`, clientIP]);
      console.log('✅ Activity logged: alert_create');
    } catch (logError) {
      console.warn('Failed to log alert creation activity:', logError.message);
    }

    // If send_immediately is true, send the alert via email with full information
    if (send_immediately) {
      const fullAlertData = {
        title,
        message,
        type,
        recipients,
        severity: alertSeverity,
        priority: priority || 'medium',
        status: 'active',
        latitude: defaultLat,
        longitude: defaultLng,
        radius_km: defaultRadius,
        location_text: location_text,
        created_at: new Date(),
        updated_at: new Date()
      };
      await sendAlertEmail(alertId, fullAlertData);
    }

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      alertId,
      sent: send_immediately,
      geographic: !!(latitude && longitude),
      location: location_text || null
    });

  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create alert',
      error: error.message
    });
  }
});

// PUT - Update alert
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      message,
      type,
      recipients,
      priority,
      status,
      // Geographic fields
      latitude,
      longitude,
      radius_km,
      location_text
    } = req.body;

    console.log('Updating alert:', id);

    // Check if alert exists
    const [existingAlerts] = await pool.execute(
      'SELECT * FROM alerts WHERE id = ?',
      [id]
    );

    if (existingAlerts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    const existingAlert = existingAlerts[0];

    // Validate alert status and severity
    const validStatuses = ['active', 'resolved', 'draft', 'sent'];
    const validSeverities = ['emergency', 'warning', 'info'];

    const alertStatus = validStatuses.includes(status) ? status : existingAlert.status;
    const alertSeverity = validSeverities.includes(type?.toLowerCase()) ? type.toLowerCase() : existingAlert.alert_severity;

    // Prepare update data
    const updateData = {
      title: title !== undefined ? title : existingAlert.title,
      description: message !== undefined ? message : existingAlert.description,
      alert_type: type !== undefined ? type : existingAlert.alert_type,
      alert_severity: alertSeverity,
      status: alertStatus,
      latitude: latitude !== undefined ? latitude : existingAlert.latitude,
      longitude: longitude !== undefined ? longitude : existingAlert.longitude,
      radius_km: radius_km !== undefined ? radius_km : existingAlert.radius_km
    };

    // If recipients are provided, update the description to include them
    if (recipients && Array.isArray(recipients) && recipients.length > 0) {
      const recipientsText = ` [Recipients: ${recipients.join(', ')}]`;
      const cleanMessage = updateData.description.replace(/\s*\[Recipients: [^\]]+\]/, '');
      updateData.description = cleanMessage + recipientsText;
    }

    // Update alert according to schema
    await pool.execute(`
      UPDATE alerts
      SET title = ?, description = ?, alert_type = ?, alert_severity = ?, status = ?, latitude = ?, longitude = ?, radius_km = ?, updated_at = NOW()
      WHERE id = ?
    `, [updateData.title, updateData.description, updateData.alert_type, updateData.alert_severity, updateData.status, updateData.latitude, updateData.longitude, updateData.radius_km, id]);

    // Log the alert update
    try {
      const { created_by } = req.body;
      const finalCreatedBy = created_by !== null && created_by !== undefined
        ? created_by
        : (req.admin?.admin_id || req.user?.id || null);

      console.log('Final created_by value to be inserted:', finalCreatedBy);

      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
      await pool.execute(`
        INSERT INTO activity_logs (admin_id, action, details, ip_address, created_at)
        VALUES (?, 'alert_update', ?, ?, NOW())
      `, [finalCreatedBy, `Updated alert: ${updateData.title} (ID: ${id})`, clientIP]);
      console.log('✅ Activity logged: alert_update');
    } catch (logError) {
      console.warn('Failed to log alert update activity:', logError.message);
    }

    res.json({
      success: true,
      message: 'Alert updated successfully'
    });

  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert',
      error: error.message
    });
  }
});

// POST - Send alert via email
router.post('/:id/send', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🚨 Sending alert via email:', id);

    // Get alert details with full information
    const [alerts] = await pool.execute(
      'SELECT * FROM alerts WHERE id = ?',
      [id]
    );

    if (alerts.length === 0) {
      console.log('❌ Alert not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    const alert = alerts[0];
    console.log('📋 Raw alert data:', alert);

    // Map database columns to expected format
    // Extract recipients from description if stored there
    let extractedRecipients = [];
    const description = alert.description || '';
    const recipientsMatch = description.match(/\[Recipients: ([^\]]+)\]/);
    if (recipientsMatch) {
      extractedRecipients = recipientsMatch[1].split(', ').map(r => r.trim());
    }

    const mappedAlert = {
      id: alert.id,
      title: alert.title,
      message: description.replace(/\s*\[Recipients: [^\]]+\]/, ''), // Remove recipients from message
      type: alert.alert_severity || alert.alert_type || 'info',
      recipients: extractedRecipients,
      // Add all additional alert information
      severity: alert.alert_severity || alert.alert_type || 'info',
      priority: alert.priority || 'medium',
      status: alert.status || 'active',
      latitude: alert.latitude,
      longitude: alert.longitude,
      radius_km: alert.radius_km,
      location_text: alert.location_text,
      created_at: alert.created_at,
      updated_at: alert.updated_at
    };

    console.log('📋 Mapped alert data:', {
      id: mappedAlert.id,
      title: mappedAlert.title,
      type: mappedAlert.type,
      recipients: mappedAlert.recipients,
      severity: mappedAlert.severity,
      priority: mappedAlert.priority,
      status: mappedAlert.status,
      latitude: mappedAlert.latitude ? parseFloat(mappedAlert.latitude) : null,
      longitude: mappedAlert.longitude ? parseFloat(mappedAlert.longitude) : null,
      radius_km: mappedAlert.radius_km
    });

    // Use extracted recipients
    let parsedRecipients = mappedAlert.recipients;

    // Create alert data object with parsed recipients and full info
    const alertData = {
      ...mappedAlert,
      recipients: parsedRecipients
    };

    // Send email with full alert information
    console.log('📧 Attempting to send alert email...');
    await sendAlertEmail(id, alertData);
    console.log('✅ Email sending completed successfully');

    // Update status to resolved (since your table only has 'active' and 'resolved')
    console.log('📝 Updating alert status to resolved...');
    await pool.execute(
      'UPDATE alerts SET status = "resolved", updated_at = NOW() WHERE id = ?',
      [id]
    );
    console.log('✅ Alert status updated to resolved');

    // Log the alert resolution
    try {
      const { created_by } = req.body;
      const finalCreatedBy = created_by !== null && created_by !== undefined
        ? created_by
        : (req.admin?.admin_id || req.user?.id || null);

      console.log('Final created_by value to be inserted:', finalCreatedBy);

      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
      await pool.execute(`
        INSERT INTO activity_logs (admin_id, action, details, ip_address, created_at)
        VALUES (?, 'alert_resolve', ?, ?, NOW())
      `, [finalCreatedBy, `Resolved alert: ${mappedAlert.title} (ID: ${id})`, clientIP]);
      console.log('✅ Activity logged: alert_resolve');
    } catch (logError) {
      console.error('❌ Failed to log alert resolution activity:', logError.message);
    }

    console.log('✅ Alert sent successfully:', id);
    res.json({
      success: true,
      message: 'Alert sent successfully via email'
    });

  } catch (error) {
    console.error('❌ Error sending alert:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Check if it's an email-related error
    if (error.message && error.message.toLowerCase().includes('email')) {
      console.error('❌ Email sending failed - check EMAIL_USER and EMAIL_PASS environment variables');
    }

    res.status(500).json({
      success: false,
      message: 'Failed to send alert',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// DELETE - Delete alert
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting alert:', id);
    
    // Check if alert exists
    const [existingAlerts] = await pool.execute(
      'SELECT * FROM alerts WHERE id = ?',
      [id]
    );
    
    if (existingAlerts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    // Delete alert
    await pool.execute('DELETE FROM alerts WHERE id = ?', [id]);
    
    // Log the alert deletion
    try {
      const { created_by } = req.body;
      const finalCreatedBy = created_by !== null && created_by !== undefined
        ? created_by
        : (req.admin?.admin_id || req.user?.id || null);

      console.log('Final created_by value to be inserted:', finalCreatedBy);

      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
      await pool.execute(`
        INSERT INTO activity_logs (admin_id, action, details, ip_address, created_at)
        VALUES (?, 'alert_delete', ?, ?, NOW())
      `, [finalCreatedBy, `Deleted alert: ${existingAlerts[0].title} (ID: ${id})`, clientIP]);
      console.log('✅ Activity logged: alert_delete');
    } catch (logError) {
      console.error('❌ Failed to log alert deletion activity:', logError.message);
    }
    
    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete alert',
      error: error.message
    });
  }
});

// Helper function to send alert emails
async function sendAlertEmail(alertId, alertData) {
  try {
    const {
      title,
      message,
      type,
      recipients,
      severity,
      priority,
      status,
      latitude,
      longitude,
      radius_km,
      location_text,
      created_at,
      updated_at
    } = alertData;
    console.log('📧 Processing email for alert:', { alertId, title, type, recipients });

    // Geocode location if coordinates provided but no location text
    let geocodedAddress = location_text;
    if (latitude && longitude && !location_text) {
      try {
        geocodedAddress = await reverseGeocode(latitude, longitude);
      } catch (e) {
        geocodedAddress = 'Unable to geocode location';
      }
    }

    // Get recipient email addresses based on recipient groups
    let emailAddresses = [];

    if (recipients && recipients.length > 0) {
      console.log('👥 Processing recipients:', recipients);

      for (const recipient of recipients) {
        console.log('🔍 Processing recipient:', recipient);

        if (recipient === 'all_users') {
          // Get all user emails from general_users table
          const [users] = await pool.execute('SELECT email FROM general_users WHERE status = 1');
          console.log(`📋 Found ${users.length} active users in general_users table`);
          emailAddresses.push(...users.map(user => user.email));
        } else if (recipient === 'all_students') {
          // Get all student emails
          const [students] = await pool.execute('SELECT email FROM general_users WHERE user_type = "STUDENT" AND status = 1');
          console.log(`🎓 Found ${students.length} active students`);
          emailAddresses.push(...students.map(user => user.email));
        } else if (recipient === 'all_faculty') {
          // Get all faculty emails
          const [faculty] = await pool.execute('SELECT email FROM general_users WHERE user_type = "FACULTY" AND status = 1');
          console.log(`👨‍🏫 Found ${faculty.length} active faculty`);
          emailAddresses.push(...faculty.map(user => user.email));
        } else if (recipient === 'all_employees') {
          // Get all university employee emails
          const [employees] = await pool.execute('SELECT email FROM general_users WHERE user_type = "UNIVERSITY_EMPLOYEE" AND status = 1');
          console.log(`👷 Found ${employees.length} active university employees`);
          emailAddresses.push(...employees.map(user => user.email));
        } else if (recipient === 'emergency_responders') {
          // Get emergency responder emails from staff table
          const [staff] = await pool.execute('SELECT email FROM staff WHERE role IN ("nurse", "paramedic", "security", "firefighter") AND status = 1 AND availability = "available"');
          console.log(`👨‍🚒 Found ${staff.length} available emergency responders`);
          emailAddresses.push(...staff.map(member => member.email));
        } else if (recipient === 'all_staff') {
          // Get all staff emails
          const [staff] = await pool.execute('SELECT email FROM staff WHERE status = 1 AND availability = "available"');
          console.log(`👥 Found ${staff.length} available staff members`);
          emailAddresses.push(...staff.map(member => member.email));
        } else if (recipient === 'all_admins') {
          // Get all admin emails
          const [admins] = await pool.execute('SELECT email FROM admin WHERE status = "active"');
          console.log(`👑 Found ${admins.length} active admins`);
          emailAddresses.push(...admins.map(admin => admin.email));
        } else if (recipient.startsWith('department_')) {
          // Get users from specific department
          const department = recipient.replace('department_', '').replace('_', ' ');
          const [users] = await pool.execute('SELECT email FROM general_users WHERE department = ? AND status = 1', [department]);
          console.log(`🏢 Found ${users.length} users in ${department} department`);
          emailAddresses.push(...users.map(user => user.email));
        } else if (recipient === 'nearby_users') {
          // Handle nearby users based on geographic location
          console.log('📍 Processing nearby users recipient');
          // This would require additional logic to filter users within the alert radius
          // For now, we'll skip this as it requires more complex geographic queries
          console.log('⚠️ Nearby users recipient detected but not implemented yet');
        } else {
          // Check if recipient is a barangay name (from Rosario barangays)
          const rosarioBarangays = [
            'Alupay', 'Antipolo', 'Bagong Pook', 'Balibago', 'Barangay A', 'Barangay B', 'Barangay C', 'Barangay D', 'Barangay E',
            'Bayawang', 'Baybayin', 'Bulihan', 'Cahigam', 'Calantas', 'Colongan', 'Itlugan', 'Leviste', 'Lumbangan',
            'Maalas-as', 'Mabato', 'Mabunga', 'Macalamcam A', 'Macalamcam B', 'Malaya', 'Maligaya', 'Marilag',
            'Masaya', 'Matamis', 'Mavalor', 'Mayuro', 'Namuco', 'Namunga', 'Nasi', 'Natu', 'Palakpak',
            'Pinagsibaan', 'Putingkahoy', 'Quilib', 'Salao', 'San Carlos', 'San Ignacio', 'San Isidro',
            'San Jose', 'San Roque', 'Santa Cruz', 'Timbugan', 'Tiquiwan', 'Tulos'
          ];

          if (rosarioBarangays.includes(recipient)) {
            // Get users from the specific barangay based on their address
            try {
              const [users] = await pool.execute(`
                SELECT email FROM general_users
                WHERE (address LIKE ? OR city LIKE ? OR state LIKE ? OR zip_code LIKE ?)
                AND status = 1
              `, [
                `%${recipient}%`,
                `%${recipient}%`,
                `%${recipient}%`,
                `%${recipient}%`
              ]);
              console.log(`🏘️ Found ${users.length} users in ${recipient} barangay`);
              emailAddresses.push(...users.map(user => user.email));
            } catch (error) {
              console.error(`❌ Error fetching users for barangay ${recipient}:`, error.message);
            }
          } else if (recipient.includes('@')) {
            // If recipient is an email address directly
            console.log('📧 Adding direct email:', recipient);
            emailAddresses.push(recipient);
          } else {
            console.log(`⚠️ Unknown recipient type: ${recipient}`);
          }
        }
      }
    } else {
      console.log('⚠️ No recipients specified, sending to all active general_users');
      // If no recipients specified, send to all active users in general_users
      const [allUsers] = await pool.execute('SELECT email FROM general_users WHERE status = 1');
      console.log(`👥 Found ${allUsers.length} active users in general_users table`);
      emailAddresses.push(...allUsers.map(u => u.email));

      // If still none (edge case), fallback to system email
      if (emailAddresses.length === 0 && process.env.EMAIL_USER) {
        console.log('🔄 No users found, adding system email as final fallback');
        emailAddresses.push(process.env.EMAIL_USER);
      }
    }

    // Additional fallback: if still no emails, add system email
    if (emailAddresses.length === 0 && process.env.EMAIL_USER) {
      console.log('🔄 Adding system email as final fallback');
      emailAddresses.push(process.env.EMAIL_USER);
    }

    // Remove duplicates
    emailAddresses = [...new Set(emailAddresses)];
    console.log('📬 Final email list:', emailAddresses);

    if (emailAddresses.length === 0) {
      console.log('❌ No email addresses found for recipients');
      throw new Error('No valid email addresses found for the specified recipients');
    }

    // Prepare email content with all alert information
    const emailSubject = `[${type.toUpperCase()}] ${title}`;
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; border-radius: 18px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
        <div style="background: linear-gradient(135deg, ${getAlertColor(type)} 0%, ${getAlertColor(type)}99 100%); color: white; padding: 36px 28px; text-align: center;">
          <div style="position: relative; z-index: 1;">
            <div style="display: inline-flex; align-items: center; gap: 10px; background-color: rgba(255,255,255,0.18); padding: 10px 20px; border-radius: 24px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 18px;">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
              </svg>
              ${type.toUpperCase()} ALERT
            </div>
            <h1 style="margin: 0; font-size: 30px; font-weight: 800; margin-bottom: 10px; text-shadow: 0 2px 6px rgba(0,0,0,0.08);">${title}</h1>
            <p style="margin: 0; font-size: 15px; opacity: 0.92; font-weight: 600; letter-spacing: 0.5px;">Alert ID: ${alertId}</p>
          </div>
        </div>
        <div style="padding: 36px 28px; background-color: #f8fafc;">
          <div style="background-color: white; border-radius: 14px; padding: 28px; margin-bottom: 28px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.07);">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 22px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 10px;">
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
              Alert Message
            </h2>
            <p style="color: #374151; line-height: 1.8; font-size: 17px; margin: 0;">${message}</p>
          </div>

          <!-- Alert Details Section -->
          <div style="background-color: white; border-radius: 14px; padding: 28px; margin-bottom: 28px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.07);">
            <h3 style="margin: 0 0 18px 0; color: #1f2937; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
              </svg>
              Alert Details
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px;">
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <span style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Severity</span>
                <span style="font-size: 15px; font-weight: 600; color: #1f2937;">${severity.toUpperCase()}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <span style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Priority</span>
                <span style="font-size: 15px; font-weight: 600; color: #1f2937;">${priority.toUpperCase()}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <span style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Status</span>
                <span style="font-size: 15px; font-weight: 600; color: #1f2937;">${status.toUpperCase()}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <span style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Created</span>
                <span style="font-size: 15px; font-weight: 600; color: #1f2937;">${new Date(created_at).toLocaleString()}</span>
              </div>
              ${updated_at && updated_at !== created_at ? `
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <span style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Updated</span>
                <span style="font-size: 15px; font-weight: 600; color: #1f2937;">${new Date(updated_at).toLocaleString()}</span>
              </div>
              ` : ''}
              ${latitude && longitude ? `
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <span style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Coordinates</span>
                <span style="font-size: 15px; font-weight: 600; color: #1f2937;">${parseFloat(latitude).toFixed(6)}, ${parseFloat(longitude).toFixed(6)}</span>
              </div>
              ` : ''}
              ${radius_km ? `
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <span style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Radius</span>
                <span style="font-size: 15px; font-weight: 600; color: #1f2937;">${radius_km} km</span>
              </div>
              ` : ''}
            </div>

            ${geocodedAddress ? `
            <div style="margin-top: 22px; padding: 18px; background-color: #f3f4f6; border-radius: 10px;">
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <span style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Location</span>
                <span style="font-size: 15px; font-weight: 600; color: #1f2937;">${geocodedAddress}</span>
              </div>
            </div>
            ` : ''}

            ${latitude && longitude ? `
            <div style="margin-top: 22px; text-align: center;">
              <img src="https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=400x200&markers=color:red%7C${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY || ''}" alt="Alert Location" style="max-width: 100%; height: auto; border-radius: 10px; border: 2px solid #e5e7eb;">
              <br>
              <a href="https://www.google.com/maps?q=${latitude},${longitude}" style="display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
                </svg>
                View on Google Maps
              </a>
            </div>
            ` : ''}
          </div>

          <!-- Recipients Section -->
          ${recipients && recipients.length > 0 ? `
          <div style="background-color: white; border-radius: 14px; padding: 28px; margin-bottom: 28px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.07);">
            <h3 style="margin: 0 0 14px 0; color: #1f2937; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Recipients
            </h3>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              ${recipients.map(recipient => `<span style="display: inline-flex; align-items: center; background-color: #f3f4f6; color: #374151; padding: 8px 16px; border-radius: 18px; font-size: 14px; font-weight: 600; border: 1px solid #d1d5db;">${recipient}</span>`).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Action Section -->
          <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: white; padding: 28px; text-align: center; border-radius: 14px; margin-bottom: 28px;">
            <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">Official Emergency Alert</h3>
            <p style="margin: 0 0 18px 0; font-size: 15px; opacity: 0.92;">This is an official alert from the ProteQ Emergency Management System</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/alerts/${alertId}" style="display: inline-flex; align-items: center; gap: 10px; background-color: ${getAlertColor(type)}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.09);">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path>
              </svg>
              View Full Alert Details
            </a>
            <p style="margin: 14px 0 0 0; font-size: 13px; opacity: 0.85;">Sent on: ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #1f2937; color: #9ca3af; padding: 28px; text-align: center;">
          <div style="max-width: 400px; margin: 0 auto;">
            <div style="font-size: 18px; font-weight: 700; color: #f3f4f6; margin-bottom: 6px;">MDRRMO Rosario, Batangas</div>
            <div style="opacity: 0.85; font-size: 15px;">Emergency Management System</div>
          </div>
        </div>
      </div>
    `;
    
    // Send email to all recipients
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_USER}>`,
      to: emailAddresses.join(','),
      subject: emailSubject,
      html: emailHtml
    };

    console.log('📤 Sending email with options:', {
      from: mailOptions.from,
      to: `${emailAddresses.length} recipients`,
      subject: mailOptions.subject
    });

    const emailResult = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', emailResult.messageId);

    // Log the email sending (optional - don't fail if table doesn't exist)
    try {
      await pool.execute(`
        INSERT INTO alert_logs (alert_id, action, recipients_count, created_at)
        VALUES (?, 'email_sent', ?, NOW())
      `, [alertId, emailAddresses.length]);
      console.log('📝 Email sending logged to database');
    } catch (logError) {
      console.log('⚠️ Failed to log email sending (table may not exist):', logError.message);
    }

    console.log(`📊 Alert email sent to ${emailAddresses.length} recipients`);
    
  } catch (error) {
    console.error('Error sending alert email:', error);
    throw error;
  }
}

// Helper function to get alert color based on type
function getAlertColor(type) {
  if (!type) return '#6b7280'; // Default color for undefined/null types

  switch (type.toLowerCase()) {
    case 'emergency': return '#dc2626';
    case 'warning': return '#d97706';
    case 'info': return '#2563eb';
    case 'typhoon': return '#dc2626';
    case 'earthquake': return '#d97706';
    case 'fire': return '#dc2626';
    default: return '#6b7280';
  }
}

// Helper function for reverse geocoding
async function reverseGeocode(lat, lng) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.display_name || 'Unknown location');
        } catch (e) {
          resolve('Unknown location');
        }
      });
    }).on('error', (e) => resolve('Unknown location'));
  });
}

module.exports = router;
