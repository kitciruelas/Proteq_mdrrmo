const express = require('express');
const router = express.Router();
const pool = require('../config/conn');
const nodemailer = require('nodemailer');

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
router.post('/', async (req, res) => {
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

    // If send_immediately is true, send the alert via email
    if (send_immediately) {
      await sendAlertEmail(alertId, { title, message: message, type, recipients });
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
router.put('/:id', async (req, res) => {
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
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🚨 Sending alert via email:', id);

    // Get alert details
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
      recipients: extractedRecipients
    };

    console.log('📋 Mapped alert data:', {
      id: mappedAlert.id,
      title: mappedAlert.title,
      type: mappedAlert.type,
      recipients: mappedAlert.recipients
    });

    // Use extracted recipients
    let parsedRecipients = mappedAlert.recipients;

    // Create alert data object with parsed recipients
    const alertData = {
      ...mappedAlert,
      recipients: parsedRecipients
    };

    // Send email
    await sendAlertEmail(id, alertData);

    // Update status to resolved (since your table only has 'active' and 'resolved')
    await pool.execute(
      'UPDATE alerts SET status = "resolved", updated_at = NOW() WHERE id = ?',
      [id]
    );

    // Log the alert resolution
    try {
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
      await pool.execute(`
        INSERT INTO activity_logs (admin_id, action, details, ip_address, created_at)
        VALUES (?, 'alert_resolve', ?, ?, NOW())
      `, [req.user?.id || 1, `Resolved alert: ${mappedAlert.title} (ID: ${id})`, clientIP]);
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
    res.status(500).json({
      success: false,
      message: 'Failed to send alert',
      error: error.message
    });
  }
});

// DELETE - Delete alert
router.delete('/:id', async (req, res) => {
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
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
      await pool.execute(`
        INSERT INTO activity_logs (admin_id, action, details, ip_address, created_at)
        VALUES (?, 'alert_delete', ?, ?, NOW())
      `, [req.user?.id || 1, `Deleted alert: ${existingAlerts[0].title} (ID: ${id})`, clientIP]);
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
    const { title, message, type, recipients } = alertData;
    console.log('📧 Processing email for alert:', { alertId, title, type, recipients });

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
    
    // Prepare email content
    const emailSubject = `[${type.toUpperCase()}] ${title}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${getAlertColor(type)}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${type.toUpperCase()} ALERT</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">${title}</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">${message}</p>
          <div style="margin-top: 20px; padding: 15px; background-color: white; border-left: 4px solid ${getAlertColor(type)};">
            <p style="margin: 0; color: #333; font-weight: bold;">
              This is an official alert from ProteQ Emergency Management System
            </p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
              Sent on: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
        <div style="padding: 15px; text-align: center; background-color: #333; color: white;">
          <p style="margin: 0; font-size: 14px;">
            MDRRMO San Juan, Batangas - Emergency Management System
          </p>
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

module.exports = router;
