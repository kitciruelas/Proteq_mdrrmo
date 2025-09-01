const express = require('express');
const router = express.Router();
const pool = require('../config/conn');
const { sendIncidentAssignmentEmail, sendStaffAssignmentEmail } = require('../services/emailService');
const { authenticateUser } = require('../middleware/authMiddleware');

// Submit incident report
router.post('/report', authenticateUser, async (req, res) => {
  console.log('🚨 INCIDENT REPORT ROUTE HIT!');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', req.headers);
  console.log('Raw request body:', req.body);

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

    console.log('=== BACKEND INCIDENT REPORT SUBMISSION ===');
    console.log('Full request body:', req.body);
    console.log('Individual field validation:');
    console.log('- incidentType:', incidentType, '(valid:', !!incidentType, ')');
    console.log('- description:', description, '(valid:', !!description, ')');
    console.log('- location:', location, '(valid:', !!location, ')');
    console.log('- priorityLevel:', priorityLevel, '(valid:', !!priorityLevel, ')');
    console.log('- safetyStatus:', safetyStatus, '(valid:', !!safetyStatus, ')');
    console.log('- latitude:', latitude);
    console.log('- longitude:', longitude);

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

    // Insert incident report into database
    const [result] = await pool.execute(
      `INSERT INTO incident_reports
       (incident_type, description, longitude, latitude, date_reported, status, reported_by, priority_level, reporter_safe_status, validation_status)
       VALUES (?, ?, ?, ?, NOW(), 'pending', ?, ?, ?, 'unvalidated')`,
      [
        incidentType,
        `${description}\n\nLocation: ${location}${latitude && longitude ? `\nGPS Coordinates: ${latitude}, ${longitude}` : ''}`,
        finalLng,
        finalLat,
        reportedBy,
        mappedPriority,
        mappedSafety
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

// Get all incident reports (for admin/staff use)
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching all incident reports...');
    
    const [incidents] = await pool.execute(`
      SELECT 
        ir.*,
        t.name as assigned_team_name,
        s.name as assigned_staff_name,
        CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name
      FROM incident_reports ir
      LEFT JOIN teams t ON ir.assigned_team_id = t.id
      LEFT JOIN staff s ON ir.assigned_staff_id = s.id
      LEFT JOIN general_users gu ON ir.reported_by = gu.user_id
      ORDER BY ir.date_reported DESC
    `);

    console.log('📋 Raw incidents from DB:', incidents);
    console.log('📊 Sample incident data:', incidents.length > 0 ? {
      incident_id: incidents[0].incident_id,
      reported_by: incidents[0].reported_by,
      reporter_name: incidents[0].reporter_name,
      assigned_team_name: incidents[0].assigned_team_name,
      assigned_staff_name: incidents[0].assigned_staff_name
    } : 'No incidents found');

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
        CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name
      FROM incident_reports ir
      LEFT JOIN teams t ON ir.assigned_team_id = t.id
      LEFT JOIN staff s ON ir.assigned_staff_id = s.id
      LEFT JOIN general_users gu ON ir.reported_by = gu.user_id
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
router.put('/:id/validate', async (req, res) => {
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
      'SELECT incident_id FROM incident_reports WHERE incident_id = ?',
      [id]
    );

    if (incidents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Incident report not found'
      });
    }

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

    // Fetch the updated incident data
    const [updatedIncident] = await pool.execute(`
      SELECT 
        ir.*,
        t.name as assigned_team_name,
        s.name as assigned_staff_name,
        CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name
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
router.put('/:id/assign-team', async (req, res) => {
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
router.put('/:id/assign-staff', async (req, res) => {
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
router.put('/:id/update-status', async (req, res) => {
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

    // If notes provided, you might want to add them to a notes/activity log table
    if (notes && notes.trim()) {
      // For now, we'll just log the notes
      console.log('📝 Update notes:', notes);
      // TODO: Add notes to activity log or notes table
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
        CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name
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
        CASE 
          WHEN ir.assigned_staff_id = ? THEN 'individual'
          WHEN ir.assigned_team_id = ? THEN 'team'
          ELSE 'unknown'
        END as assignment_type
      FROM incident_reports ir
      LEFT JOIN teams t ON ir.assigned_team_id = t.id
      LEFT JOIN staff s ON ir.assigned_staff_id = s.id
      LEFT JOIN general_users gu ON ir.reported_by = gu.user_id
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
