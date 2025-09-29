const express = require('express');
const router = express.Router();
const pool = require('../config/conn');
const { sendIncidentAssignmentEmail, sendStaffAssignmentEmail } = require('../services/emailService');
const { authenticateUser, authenticateAdmin, authenticateStaff } = require('../middleware/authMiddleware');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer storage for incident attachments
const uploadsDir = path.join(__dirname, '..', 'uploads', 'incidents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeOriginal = (file.originalname || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeOriginal);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
});

// Submit incident report (authenticated users)
router.post('/report', authenticateUser, upload.array('attachments', 5), async (req, res) => {
  try {
    const {
      incidentType,
      description,
      location,
      latitude,
      longitude,
      priorityLevel,
      safetyStatus
    } = req.body;

    // Get uploaded files
    const attachments = req.files || [];
    console.log('Uploaded attachments:', attachments.length);

    // Validate required fields with better checking
    const missingFields = [];

    if (!incidentType || incidentType.trim() === '') {
      missingFields.push('incidentType');
      console.log('❌ incidentType is missing or empty:', incidentType);
    } else {
      console.log('✅ incidentType is valid:', incidentType);
    }

    if (!description || description.trim() === '') {
      missingFields.push('description');
      console.log('❌ description is missing or empty:', description);
    } else {
      console.log('✅ description is valid:', description.length, 'characters');
    }

    if (!location || location.trim() === '') {
      missingFields.push('location');
      console.log('❌ location is missing or empty:', location);
    } else {
      console.log('✅ location is valid:', location);
    }

    if (!priorityLevel || priorityLevel.trim() === '') {
      missingFields.push('priorityLevel');
      console.log('❌ priorityLevel is missing or empty:', priorityLevel);
    } else {
      console.log('✅ priorityLevel is valid:', priorityLevel);
    }

    if (!safetyStatus || safetyStatus.trim() === '') {
      missingFields.push('safetyStatus');
      console.log('❌ safetyStatus is missing or empty:', safetyStatus);
    } else {
      console.log('✅ safetyStatus is valid:', safetyStatus);
    }

    if (missingFields.length > 0) {
      console.log('🚫 VALIDATION FAILED - Missing fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields: missingFields,
        receivedData: req.body
      });
    }

    console.log('✅ VALIDATION PASSED - All required fields present');

    // Use provided coordinates or default coordinates for San Juan, Batangas
    const finalLat = latitude || 13.7565;
    const finalLng = longitude || 121.0583;

    // Current timestamp for date_reported
    const dateTime = new Date();

    // Map priority levels to database enum values
    // Validate and map priority levels to database enum values
    const validPriorities = ['low', 'moderate', 'high', 'critical'];
    const mappedPriority = priorityLevel === 'medium' ? 'moderate' : priorityLevel;
    if (!validPriorities.includes(mappedPriority)) {
      console.log('⚠️ Invalid priority level:', priorityLevel);
      return res.status(400).json({
        success: false,
        message: 'Invalid priority level. Must be one of: low, medium, high, critical'
      });
    }

    // Validate and map safety status to database enum values
    const validSafetyStatuses = ['safe', 'injured', 'unknown'];
    const mappedSafety = safetyStatus === 'danger' ? 'unknown' : safetyStatus;
    if (!validSafetyStatuses.includes(mappedSafety)) {
      console.log('⚠️ Invalid safety status:', safetyStatus);
      return res.status(400).json({
        success: false,
        message: 'Invalid safety status. Must be one of: safe, injured, danger'
      });
    };

    // Get user ID from authenticated request
    const reportedBy = req.user.user_id;

    // Prepare description
    let fullDescription = description;
    let attachmentFilenames = null;
    if (attachments.length > 0) {
      attachmentFilenames = attachments.map(file => file.filename).join(',');
    }
    fullDescription += `\n\nLocation: ${location}${latitude && longitude ? `\nGPS Coordinates: ${latitude}, ${longitude}` : ''}`;

    // Insert incident report into database with attachment field
    const [result] = await pool.execute(
      `INSERT INTO incident_reports
       (incident_type, description, longitude, latitude, date_reported, status, reported_by, priority_level, reporter_safe_status, validation_status, attachment)
       VALUES (?, ?, ?, ?, NOW(), 'pending', ?, ?, ?, 'unvalidated', ?)`,
      [
        incidentType,
        fullDescription,
        finalLng,
        finalLat,
        reportedBy,
        mappedPriority,
        mappedSafety,
        attachmentFilenames
      ]
    );

    console.log('Incident report saved with ID:', result.insertId);

    // Log incident report submission
    try {
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
      await pool.execute(`
        INSERT INTO activity_logs (general_user_id, action, details, ip_address, created_at)
        VALUES (?, 'incident_report_submit', ?, ?, NOW())
      `, [req.user?.user_id || 1, `Incident report submitted: ${incidentType} at ${location}`, clientIP]);
      console.log('✅ Activity logged: incident_report_submit');
    } catch (logError) {
      console.error('❌ Failed to log incident report activity:', logError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Incident report submitted successfully',
      incidentId: result.insertId,
      data: {
        incidentType,
        location,
        priorityLevel,
        safetyStatus,
        coordinates: { latitude: finalLat, longitude: finalLng }
      }
    });

  } catch (error) {
    console.error('Error submitting incident report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit incident report. Please try again.'
    });
  }
});

// Submit incident report (guest users)
router.post('/report-guest', upload.array('attachments', 5), async (req, res) => {
  try {
    const {
      incidentType,
      description,
      location,
      latitude,
      longitude,
      priorityLevel,
      safetyStatus,
      guestName,
      guestContact
    } = req.body;

    // Get uploaded files
    const attachments = req.files || [];
    console.log('Uploaded attachments (guest):', attachments.length);

    // Validate required fields with better checking
    const missingFields = [];

    if (!incidentType || incidentType.trim() === '') {
      missingFields.push('incidentType');
      console.log('❌ incidentType is missing or empty:', incidentType);
    } else {
      console.log('✅ incidentType is valid:', incidentType);
    }

    if (!description || description.trim() === '') {
      missingFields.push('description');
      console.log('❌ description is missing or empty:', description);
    } else {
      console.log('✅ description is valid:', description.length, 'characters');
    }

    if (!location || location.trim() === '') {
      missingFields.push('location');
      console.log('❌ location is missing or empty:', location);
    } else {
      console.log('✅ location is valid:', location);
    }

    if (!priorityLevel || priorityLevel.trim() === '') {
      missingFields.push('priorityLevel');
      console.log('❌ priorityLevel is missing or empty:', priorityLevel);
    } else {
      console.log('✅ priorityLevel is valid:', priorityLevel);
    }

    if (!safetyStatus || safetyStatus.trim() === '') {
      missingFields.push('safetyStatus');
      console.log('❌ safetyStatus is missing or empty:', safetyStatus);
    } else {
      console.log('✅ safetyStatus is valid:', safetyStatus);
    }

    if (!guestName || guestName.trim() === '') {
      missingFields.push('guestName');
      console.log('❌ guestName is missing or empty:', guestName);
    } else {
      console.log('✅ guestName is valid:', guestName);
    }

    if (!guestContact || guestContact.trim() === '') {
      missingFields.push('guestContact');
      console.log('❌ guestContact is missing or empty:', guestContact);
    } else {
      console.log('✅ guestContact is valid:', guestContact);
    }

    if (missingFields.length > 0) {
      console.log('🚫 VALIDATION FAILED - Missing fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields: missingFields,
        receivedData: req.body
      });
    }

    console.log('✅ VALIDATION PASSED - All required fields present');

    // Use provided coordinates or default coordinates for Rosario, Batangas
    const finalLat = latitude || 13.8457;
    const finalLng = longitude || 121.2104;

    // Current timestamp for date_reported
    const dateTime = new Date();

    // Map priority levels to database enum values
    const validPriorities = ['low', 'moderate', 'high', 'critical'];
    const mappedPriority = priorityLevel === 'medium' ? 'moderate' : priorityLevel;
    if (!validPriorities.includes(mappedPriority)) {
      console.log('⚠️ Invalid priority level:', priorityLevel);
      return res.status(400).json({
        success: false,
        message: 'Invalid priority level. Must be one of: low, medium, high, critical'
      });
    }

    // Validate and map safety status to database enum values
    const validSafetyStatuses = ['safe', 'injured', 'unknown'];
    const mappedSafety = safetyStatus === 'danger' ? 'unknown' : safetyStatus;
    if (!validSafetyStatuses.includes(mappedSafety)) {
      console.log('⚠️ Invalid safety status:', safetyStatus);
      return res.status(400).json({
        success: false,
        message: 'Invalid safety status. Must be one of: safe, injured, danger'
      });
    };

    // Use a transaction to ensure data consistency
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    let incidentId = null;
    let dbInsertSuccessful = false;

    console.log('🔄 [GUEST INCIDENT] Starting database transaction...');

    try {
      console.log('📝 [GUEST INCIDENT] Preparing to insert incident report...');

      // Prepare description
      let fullDescription = description;
      let attachmentFilenames = null;
      if (attachments.length > 0) {
        attachmentFilenames = attachments.map(file => file.filename).join(',');
      }
      fullDescription += `\n\nLocation: ${location}${latitude && longitude ? `\nGPS Coordinates: ${latitude}, ${longitude}` : ''}`;

      // Insert incident report into database with NULL as reported_by for guests
      const [result] = await connection.execute(
        `INSERT INTO incident_reports
         (incident_type, description, longitude, latitude, date_reported, status, reported_by, priority_level, reporter_safe_status, validation_status, attachment)
         VALUES (?, ?, ?, ?, NOW(), 'pending', NULL, ?, ?, 'unvalidated', ?)`,
        [
          incidentType,
          fullDescription,
          finalLng,
          finalLat,
          mappedPriority,
          mappedSafety,
          attachmentFilenames
        ]
      );

      console.log('✅ [GUEST INCIDENT] Incident report inserted successfully with ID:', result.insertId);

      // Insert guest information into incident_report_guests table
      await connection.execute(
        `INSERT INTO incident_report_guests (incident_id, guest_name, guest_contact)
         VALUES (?, ?, ?)`,
        [result.insertId, guestName.trim(), guestContact.trim()]
      );

      console.log('✅ [GUEST INCIDENT] Guest information inserted successfully');

      // Commit the transaction
      await connection.commit();
      console.log('✅ [GUEST INCIDENT] Transaction committed successfully');

      // Mark DB insert as successful
      dbInsertSuccessful = true;

      // Use the incident ID as the response ID
      incidentId = result.insertId;
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      console.error('❌ [GUEST INCIDENT] Transaction rolled back due to error:', error);
      throw error;
    } finally {
      connection.release();
      console.log('🔌 [GUEST INCIDENT] Database connection released');
    }

    console.log('📋 [GUEST INCIDENT] Guest information saved for incident:', incidentId);

    // Log guest incident report submission (non-critical operation)
    try {
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
      await pool.execute(`
        INSERT INTO activity_logs (general_user_id, action, details, ip_address, created_at)
        VALUES (NULL, 'guest_incident_report_submit', ?, ?, NOW())
      `, [`Guest incident report submitted: ${incidentType} at ${location} by ${guestName}`, clientIP]);
      console.log('✅ [GUEST INCIDENT] Activity logged: guest_incident_report_submit');
    } catch (logError) {
      console.error('⚠️ [GUEST INCIDENT] Failed to log guest incident report activity (non-critical):', logError.message);
      // Don't throw error here as DB insert was successful
    }

    console.log('📤 [GUEST INCIDENT] Sending success response...');

    res.status(201).json({
      success: true,
      message: 'Guest incident report submitted successfully',
      incidentId: incidentId,
      data: {
        incidentType,
        location,
        priorityLevel,
        safetyStatus,
        coordinates: { latitude: finalLat, longitude: finalLng },
        guestName,
        guestContact
      }
    });

    console.log('✅ [GUEST INCIDENT] Response sent successfully');

  } catch (error) {
    console.error('❌ Error submitting guest incident report:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });

    // Log additional context for debugging
    console.error('❌ Request body that caused the error:', req.body);
    console.error('❌ Current timestamp:', new Date().toISOString());

    // Check if this is a database connection/refused error after successful insert
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connection') || error.message?.includes('refused')) {
      console.log('⚠️ Connection error detected, but checking if DB insert was successful...');

      // If we have an incidentId, it means the DB insert was successful
      if (incidentId && dbInsertSuccessful) {
        console.log('✅ DB insert was successful despite connection error, returning 200 OK');
        return res.status(200).json({
          success: true,
          message: 'Guest incident report submitted successfully (with minor connection issue)',
          incidentId: incidentId,
          data: {
            incidentType,
            location,
            priorityLevel,
            safetyStatus,
            coordinates: { latitude: finalLat, longitude: finalLng },
            guestName,
            guestContact
          },
          warning: 'Report saved successfully but there was a minor connection issue'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit guest incident report. Please try again.'
    });
  }
});

// Get all incident reports (for admin/staff use)
router.get('/', async (req, res) => {
  try {
    const [incidents] = await pool.execute(`
      SELECT
        ir.*,
        t.name as assigned_team_name,
        s.name as assigned_staff_name,
        CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name,
        gu.phone as reporter_phone,
        irg.guest_name,
        irg.guest_contact,
        CASE 
          WHEN ir.reported_by IS NULL THEN 'guest'
          ELSE 'user'
        END as reporter_type
      FROM incident_reports ir
      LEFT JOIN teams t ON ir.assigned_team_id = t.id
      LEFT JOIN staff s ON ir.assigned_staff_id = s.id
      LEFT JOIN general_users gu ON ir.reported_by = gu.user_id
      LEFT JOIN incident_report_guests irg ON ir.incident_id = irg.incident_id
      ORDER BY ir.date_reported DESC
    `);

    res.json({
      success: true,
      incidents
    });

  } catch (error) {
    console.error('Error fetching incident reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incident reports'
    });
  }
});



// Get incident report by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [incidents] = await pool.execute(`
      SELECT
        ir.*,
        t.name as assigned_team_name,
        s.name as assigned_staff_name,
        CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name,
        gu.phone as reporter_phone,
        irg.guest_name,
        irg.guest_contact,
        CASE 
          WHEN ir.reported_by IS NULL THEN 'guest'
          ELSE 'user'
        END as reporter_type
      FROM incident_reports ir
      LEFT JOIN teams t ON ir.assigned_team_id = t.id
      LEFT JOIN staff s ON ir.assigned_staff_id = s.id
      LEFT JOIN general_users gu ON ir.reported_by = gu.user_id
      LEFT JOIN incident_report_guests irg ON ir.incident_id = irg.incident_id
      WHERE ir.incident_id = ?
    `, [id]);

    if (incidents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Incident report not found'
      });
    }

    res.json({
      success: true,
      incident: incidents[0]
    });

  } catch (error) {
    console.error('Error fetching incident report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incident report'
    });
  }
});

// PUT - Update incident validation status
router.put('/:id/validate', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { validationStatus, validationNotes = '', assignedTo = null } = req.body;

    // Validate input
    const validStatuses = ['validated', 'rejected'];
    if (!validationStatus || !validStatuses.includes(validationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid validation status. Must be either "validated" or "rejected".'
      });
    }

    console.log('Validation request received:', {
      id,
      validationStatus,
      validationNotes,
      assignedTo
    });

    // Check if incident exists
    const [incidents] = await pool.execute(
      'SELECT incident_id, validation_status FROM incident_reports WHERE incident_id = ?',
      [id]
    );

    if (incidents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Incident report not found'
      });
    }

    const oldValidationStatus = incidents[0].validation_status;

    // If assigning to staff, verify staff exists (only if assignedTo is not null)
    if (assignedTo !== null) {
      const [staff] = await pool.execute(
        'SELECT id FROM staff WHERE id = ? AND status = 1 AND availability = "available"',
        [assignedTo]
      );

      if (staff.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid staff assignment. Staff member not found, inactive, or unavailable.'
        });
      }
    }

    console.log('Updating incident validation status...');

    // Update incident validation status
    await pool.execute(`
      UPDATE incident_reports
      SET validation_status = ?,
          validation_notes = ?,
          assigned_to = ?,
          status = CASE 
            WHEN ? = 'validated' THEN 'in_progress'
            WHEN ? = 'rejected' THEN 'closed'
            ELSE status
          END,
          updated_at = NOW()
      WHERE incident_id = ?
    `, [validationStatus, validationNotes, assignedTo, validationStatus, validationStatus, id]);

    // Log activity if validation status changed
    if (oldValidationStatus !== validationStatus) {
      try {
        const { created_by } = req.body;
        const finalCreatedBy = created_by !== null && created_by !== undefined
          ? created_by
          : (req.admin?.admin_id || req.user?.id || null);

        console.log('Final created_by value to be inserted:', finalCreatedBy);

        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';

        await pool.execute(`
          INSERT INTO activity_logs (admin_id, action, details, ip_address, created_at)
          VALUES (?, 'incident_validation_update', ?, ?, NOW())
        `, [finalCreatedBy, `Incident #${id} validation status changed from ${oldValidationStatus} to ${validationStatus}`, clientIP]);
        console.log('✅ Activity logged: incident_validation_update');
      } catch (logError) {
        console.error('❌ Failed to log validation update activity:', logError.message);
      }
    }

    // Fetch the updated incident data
    const [updatedIncident] = await pool.execute(`
      SELECT
        ir.*,
        t.name as assigned_team_name,
        s.name as assigned_staff_name,
        CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name,
        gu.phone as reporter_phone
      FROM incident_reports ir
      LEFT JOIN teams t ON ir.assigned_team_id = t.id
      LEFT JOIN staff s ON ir.assigned_staff_id = s.id
      LEFT JOIN general_users gu ON ir.reported_by = gu.user_id
      WHERE ir.incident_id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Incident validation status updated successfully',
      incident: updatedIncident[0]
    });

  } catch (error) {
    console.error('Error updating incident validation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update incident validation'
    });
  }
});

// PUT - Assign team to incident
router.put('/:id/assign-team', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;

    console.log('🔄 Assigning team to incident:', { incidentId: id, teamId });

    // Check if incident exists
    const [incidents] = await pool.execute(
      'SELECT * FROM incident_reports WHERE incident_id = ?',
      [id]
    );

    if (incidents.length === 0) {
      console.log('❌ Incident not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    const incident = incidents[0];
    console.log('✅ Incident found:', incident.incident_id);

    // If teamId is null, clear assignment
    if (teamId === null) {
      console.log('🗑️ Clearing team assignment for incident:', id);
      await pool.execute(
        'UPDATE incident_reports SET assigned_team_id = NULL, assigned_staff_id = NULL, updated_at = NOW() WHERE incident_id = ?',
        [id]
      );

      return res.json({
        success: true,
        message: 'Team assignment cleared successfully',
        emailSent: false
      });
    }

    // Check if team exists
    const [teams] = await pool.execute(
      'SELECT id, name, description FROM teams WHERE id = ?',
      [teamId]
    );

    if (teams.length === 0) {
      console.log('❌ Team not found:', teamId);
      return res.status(400).json({
        success: false,
        message: 'Team not found'
      });
    }

    const team = teams[0];
    console.log('✅ Team found:', team.name);

    // Get team members before assignment
    const [teamMembers] = await pool.execute(`
      SELECT s.id, s.name, s.email, s.position, s.department
      FROM staff s
      WHERE s.assigned_team_id = ? AND (s.status = "active" OR s.status = 1) AND s.availability = 'available'
    `, [teamId]);

    console.log(`📋 Found ${teamMembers.length} active team members`);

    // Check if team has active members
    if (teamMembers.length === 0) {
      console.log('❌ Cannot assign team with no active members:', teamId);
      return res.status(400).json({
        success: false,
        message: 'Cannot assign team with no active members. Please add members to the team first.',
        teamName: team.name,
        totalMembers: 0
      });
    }

    // Update incident with team assignment
    await pool.execute(
      'UPDATE incident_reports SET assigned_team_id = ?, assigned_staff_id = NULL, updated_at = NOW() WHERE incident_id = ?',
      [teamId, id]
    );

    console.log('✅ Incident updated with team assignment');

    // Log team assignment activity
    try {
      const { created_by } = req.body;
      const finalCreatedBy = created_by !== null && created_by !== undefined
        ? created_by
        : (req.admin?.admin_id || req.user?.id || null);

      console.log('Final created_by value to be inserted:', finalCreatedBy);

      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';

      await pool.execute(`
        INSERT INTO activity_logs (admin_id, action, details, ip_address, created_at)
        VALUES (?, 'incident_assign_team', ?, ?, NOW())
      `, [finalCreatedBy, `Incident #${id} assigned to team "${team.name}" (${teamMembers.length} members)`, clientIP]);
      console.log('✅ Activity logged: incident_assign_team');
    } catch (logError) {
      console.error('❌ Failed to log team assignment activity:', logError.message);
    }

    // Prepare incident data for email
    const incidentData = {
      id: incident.incident_id,
      type: incident.incident_type,
      description: incident.description,
      location: extractLocationFromDescription(incident.description),
      priorityLevel: incident.priority_level,
      dateReported: incident.date_reported
    };

    // Send email notification
    let emailSent = false;
    let emailDetails = null;

    try {
      console.log('📧 Sending email notifications to team members...');
      const emailResult = await sendIncidentAssignmentEmail(incidentData, teamId);
      
      if (emailResult && emailResult.success) {
        emailSent = true;
        emailDetails = {
          teamName: team.name,
          totalMembers: emailResult.totalMembers || teamMembers.length,
          emailsSent: emailResult.emailsSent || 0,
          emailsFailed: emailResult.emailsFailed || 0,
          failedEmails: emailResult.failedEmails || []
        };
        console.log(`✅ Email notifications sent: ${emailResult.emailsSent}/${emailResult.totalMembers} successful`);
      } else {
        console.log('⚠️ Email sending failed or returned false');
        emailDetails = {
          teamName: team.name,
          totalMembers: teamMembers.length,
          emailsSent: 0,
          emailsFailed: teamMembers.length,
          error: emailResult?.error || 'Unknown error'
        };
      }
    } catch (emailError) {
      console.error('❌ Error sending email notification:', emailError);
      emailSent = false;
      emailDetails = { 
        teamName: team.name,
        totalMembers: teamMembers.length,
        emailsSent: 0,
        emailsFailed: teamMembers.length,
        error: emailError.message 
      };
    }

    res.json({
      success: true,
      message: 'Team assigned to incident successfully',
      emailSent,
      emailDetails
    });

  } catch (error) {
    console.error('❌ Error assigning team to incident:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign team to incident',
      error: error.message
    });
  }
});

// PUT - Assign staff to incident
router.put('/:id/assign-staff', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    console.log('🔄 Assigning staff to incident:', { incidentId: id, staffId });

    // Check if incident exists
    const [incidents] = await pool.execute(
      'SELECT * FROM incident_reports WHERE incident_id = ?',
      [id]
    );

    if (incidents.length === 0) {
      console.log('❌ Incident not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    const incident = incidents[0];
    console.log('✅ Incident found:', incident.incident_id);

    // If staffId is null, clear assignment
    if (staffId === null) {
      console.log('🗑️ Clearing staff assignment for incident:', id);
      await pool.execute(
        'UPDATE incident_reports SET assigned_staff_id = NULL, assigned_team_id = NULL, updated_at = NOW() WHERE incident_id = ?',
        [id]
      );

      return res.json({
        success: true,
        message: 'Staff assignment cleared successfully',
        emailSent: false
      });
    }

    // Check if staff exists and is active
    const [staff] = await pool.execute(
      'SELECT id, name, email, position, department FROM staff WHERE id = ? AND (status = "active" OR status = 1)',
      [staffId]
    );

    if (staff.length === 0) {
      console.log('❌ Staff member not found or inactive:', staffId);
      return res.status(400).json({
        success: false,
        message: 'Staff member not found or inactive'
      });
    }

    const staffMember = staff[0];
    console.log('✅ Staff member found:', staffMember.name);

    // Update incident with staff assignment
    await pool.execute(
      'UPDATE incident_reports SET assigned_staff_id = ?, assigned_team_id = NULL, updated_at = NOW() WHERE incident_id = ?',
      [staffId, id]
    );

    console.log('✅ Incident updated with staff assignment');

    // Log staff assignment activity
    try {
      const { created_by } = req.body;
      const finalCreatedBy = created_by !== null && created_by !== undefined
        ? created_by
        : (req.admin?.admin_id || req.user?.id || null);

      console.log('Final created_by value to be inserted:', finalCreatedBy);

      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';

      await pool.execute(`
        INSERT INTO activity_logs (admin_id, action, details, ip_address, created_at)
        VALUES (?, 'incident_assign_staff', ?, ?, NOW())
      `, [finalCreatedBy, `Incident #${id} assigned to staff "${staffMember.name}" (${staffMember.position})`, clientIP]);
      console.log('✅ Activity logged: incident_assign_staff');
    } catch (logError) {
      console.error('❌ Failed to log staff assignment activity:', logError.message);
    }

    // Prepare incident data for email
    const incidentData = {
      id: incident.incident_id,
      type: incident.incident_type,
      description: incident.description,
      location: extractLocationFromDescription(incident.description),
      priorityLevel: incident.priority_level,
      dateReported: incident.date_reported
    };

    // Send email notification
    let emailSent = false;
    let emailDetails = null;

    try {
      console.log('📧 Sending email notification to staff member...');
      const emailResult = await sendStaffAssignmentEmail(incidentData, staffId);
      
      if (emailResult && emailResult.success) {
        emailSent = true;
        emailDetails = {
          staffName: staffMember.name,
          staffEmail: staffMember.email,
          staffPosition: staffMember.position,
          emailsSent: 1,
          emailsFailed: 0
        };
        console.log(`✅ Email notification sent to ${staffMember.name} (${staffMember.email})`);
      } else {
        console.log('⚠️ Email sending failed or returned false');
        emailDetails = {
          staffName: staffMember.name,
          staffEmail: staffMember.email,
          staffPosition: staffMember.position,
          emailsSent: 0,
          emailsFailed: 1,
          error: emailResult?.error || 'Unknown error'
        };
      }
    } catch (emailError) {
      console.error('❌ Error sending email notification:', emailError);
      emailSent = false;
      emailDetails = { 
        staffName: staffMember.name,
        staffEmail: staffMember.email,
        staffPosition: staffMember.position,
        emailsSent: 0,
        emailsFailed: 1,
        error: emailError.message 
      };
    }

    res.json({
      success: true,
      message: 'Staff assigned to incident successfully',
      emailSent,
      emailDetails
    });

  } catch (error) {
    console.error('❌ Error assigning staff to incident:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign staff to incident',
      error: error.message
    });
  }
});

// PUT - Update incident status (for staff use)
router.put('/:id/update-status', authenticateStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    console.log('🔄 Updating incident status:', { incidentId: id, status, notes });

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, in_progress, resolved, closed'
      });
    }

    // Check if incident exists
    const [incidents] = await pool.execute(
      'SELECT * FROM incident_reports WHERE incident_id = ?',
      [id]
    );

    if (incidents.length === 0) {
      console.log('❌ Incident not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    const incident = incidents[0];
    console.log('✅ Incident found:', incident.incident_id);

    // Check if incident is already resolved or closed
    if (incident.status === 'resolved' || incident.status === 'closed') {
      console.log('❌ Cannot update incident - already resolved/closed:', incident.status);
      return res.status(400).json({
        success: false,
        message: `Cannot update incident. Current status is "${incident.status}". Resolved and closed incidents cannot be modified.`
      });
    }

    // Update incident status
    await pool.execute(
      'UPDATE incident_reports SET status = ?, updated_at = NOW() WHERE incident_id = ?',
      [status, id]
    );

    // Log status update activity (only if status actually changed)
    if (incident.status !== status) {
      try {
        const { created_by } = req.body;
        const finalCreatedBy = created_by !== null && created_by !== undefined
          ? created_by
          : (req.staff?.id || req.admin?.admin_id || req.user?.id || null);

        console.log('Final created_by value to be inserted:', finalCreatedBy);

        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';

        await pool.execute(`
          INSERT INTO activity_logs (staff_id, action, details, ip_address, created_at)
          VALUES (?, 'incident_status_update', ?, ?, NOW())
        `, [finalCreatedBy, `Incident #${id} status changed from "${incident.status}" to "${status}"`, clientIP]);
        console.log('✅ Activity logged: incident_status_update');
      } catch (logError) {
        console.error('❌ Failed to log status update activity:', logError.message);
      }
    }

    console.log('✅ Incident status updated successfully');

    res.json({
      success: true,
      message: 'Incident status updated successfully',
      updatedIncident: {
        id: incident.incident_id,
        status: status,
        previousStatus: incident.status
      }
    });

  } catch (error) {
    console.error('❌ Error updating incident status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update incident status',
      error: error.message
    });
  }
});

// Helper function to extract location from description
function extractLocationFromDescription(description) {
  if (!description) return '';
  const match = /Location:\s*([^\n]+)/i.exec(description);
  return match ? match[1].trim() : '';
}

// Test endpoint to verify the route is working
router.post('/test', (req, res) => {
  console.log('🧪 TEST ENDPOINT HIT');
  console.log('Request body:', req.body);
  res.json({
    success: true,
    message: 'Incident route test successful',
    receivedData: req.body
  });
});

// Get incidents reported by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 Fetching incidents reported by user ID:', userId);

    // Get incidents reported by this user
    const [incidents] = await pool.execute(`
      SELECT
        ir.*,
        t.name as assigned_team_name,
        s.name as assigned_staff_name,
        CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name,
        gu.phone as reporter_phone
      FROM incident_reports ir
      LEFT JOIN teams t ON ir.assigned_team_id = t.id
      LEFT JOIN staff s ON ir.assigned_staff_id = s.id
      LEFT JOIN general_users gu ON ir.reported_by = gu.user_id
      WHERE ir.reported_by = ?
      ORDER BY ir.date_reported DESC
    `, [userId]);

    console.log('📋 Found incidents for user:', incidents.length);

    res.json({
      success: true,
      incidents,
      userInfo: {
        id: userId,
        totalReports: incidents.length
      }
    });

  } catch (error) {
    console.error('Error fetching user incidents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user incidents',
      error: error.message
    });
  }
});

// Get staff assigned incidents (individual and team assignments) - MOVED TO END
router.get('/staff/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    console.log('🔍 Fetching incidents for staff ID:', staffId);

    // First, get the staff member's team assignment
    const [staffData] = await pool.execute(`
      SELECT id, name, assigned_team_id 
      FROM staff 
      WHERE id = ? AND (status = "active" OR status = 1)
    `, [staffId]);

    if (staffData.length === 0) {
      console.log('❌ Staff member not found or inactive:', staffId);
      return res.status(404).json({
        success: false,
        message: 'Staff member not found or inactive'
      });
    }

    const staffMember = staffData[0];
    const teamId = staffMember.assigned_team_id;
    
    console.log('👤 Staff member found:', staffMember.name);
    console.log('👥 Staff team ID:', teamId);

    // Get incidents assigned to this staff member individually OR to their team
    const [incidents] = await pool.execute(`
      SELECT
        ir.*,
        t.name as assigned_team_name,
        s.name as assigned_staff_name,
        CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name,
        gu.phone as reporter_phone,
        irg.guest_name,
        irg.guest_contact,
        CASE
          WHEN ir.reported_by IS NULL THEN 'guest'
          ELSE 'user'
        END as reporter_type,
        CASE
          WHEN ir.assigned_staff_id = ? THEN 'individual'
          WHEN ir.assigned_team_id = ? THEN 'team'
          ELSE 'unknown'
        END as assignment_type
      FROM incident_reports ir
      LEFT JOIN teams t ON ir.assigned_team_id = t.id
      LEFT JOIN staff s ON ir.assigned_staff_id = s.id
      LEFT JOIN general_users gu ON ir.reported_by = gu.user_id
      LEFT JOIN incident_report_guests irg ON ir.incident_id = irg.incident_id
      WHERE ir.assigned_staff_id = ? OR ir.assigned_team_id = ?
      ORDER BY ir.date_reported DESC
    `, [staffId, teamId, staffId, teamId]);

    console.log('📋 Found incidents for staff:', incidents.length);
    console.log('📊 Assignment breakdown:', {
      individual: incidents.filter(i => i.assignment_type === 'individual').length,
      team: incidents.filter(i => i.assignment_type === 'team').length,
      total: incidents.length
    });

    res.json({
      success: true,
      incidents,
      staffInfo: {
        id: staffMember.id,
        name: staffMember.name,
        teamId: teamId,
        teamName: incidents.find(i => i.assigned_team_id === teamId)?.assigned_team_name || null
      },
      assignmentStats: {
        individual: incidents.filter(i => i.assignment_type === 'individual').length,
        team: incidents.filter(i => i.assignment_type === 'team').length,
        total: incidents.length
      }
    });

  } catch (error) {
    console.error('Error fetching staff incidents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff incidents',
      error: error.message
    });
  }
});

module.exports = router;
