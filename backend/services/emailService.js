const nodemailer = require('nodemailer');
const pool = require('../config/conn');

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'fking6915@gmail.com',
    pass: process.env.EMAIL_PASS || 'azqa bnkd mbop dxgm'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Send incident assignment notification to team members
async function sendIncidentAssignmentEmail(incidentData, teamId) {
  try {
    console.log('📧 Sending incident assignment email for team:', teamId);
    
    // Get team information
    const [teams] = await pool.execute(
      'SELECT name, description FROM teams WHERE id = ?',
      [teamId]
    );
    
    if (teams.length === 0) {
      console.log('❌ Team not found:', teamId);
      return {
        success: false,
        error: 'Team not found'
      };
    }
    
    const team = teams[0];
    console.log('✅ Team found:', team.name);
    
    // Get all staff members in the team using assigned_team_id
    const [staffMembers] = await pool.execute(`
      SELECT s.id, s.name, s.email, s.position, s.department
      FROM staff s
      WHERE s.assigned_team_id = ? AND (s.status = "active" OR s.status = 1) AND s.availability = 'available'
    `, [teamId]);
    
    if (staffMembers.length === 0) {
      console.log('⚠️ No active staff members found in team:', teamId);
      return {
        success: false,
        error: 'No active staff members found in team',
        teamName: team.name,
        totalMembers: 0,
        emailsSent: 0,
        emailsFailed: 0
      };
    }
    
    console.log(`📬 Found ${staffMembers.length} staff members in team ${team.name}`);
    
    // Prepare email content
    const emailSubject = `🚨 INCIDENT ASSIGNMENT - Team ${team.name}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🚨 INCIDENT ASSIGNMENT</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Your team has been assigned to an incident</h2>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #dc2626; margin-top: 0;">Incident Details</h3>
            <p><strong>Incident ID:</strong> #${incidentData.id}</p>
            <p><strong>Type:</strong> ${incidentData.type}</p>
            <p><strong>Priority:</strong> <span style="color: ${getPriorityColor(incidentData.priorityLevel)}; font-weight: bold;">${incidentData.priorityLevel.toUpperCase()}</span></p>
            <p><strong>Location:</strong> ${incidentData.location}</p>
            <p><strong>Description:</strong> ${incidentData.description}</p>
            <p><strong>Reported:</strong> ${new Date(incidentData.dateReported).toLocaleString()}</p>
          </div>
          
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1e40af; margin-top: 0;">Team Assignment</h4>
            <p><strong>Team:</strong> ${team.name}</p>
            <p><strong>Team Description:</strong> ${team.description || 'No description available'}</p>
            <p><strong>Team Members:</strong> ${staffMembers.length} active members</p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #92400e; margin-top: 0;">Required Action</h4>
            <p>Please review the incident details and coordinate with your team members to respond appropriately.</p>
            <p>You can access the incident management system to update the status and add notes.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated notification from the MDRRMO Incident Management System.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;
    
    // Send email to each team member
    const emailPromises = staffMembers.map(async (staffMember) => {
      try {
        const mailOptions = {
          from: `"${process.env.EMAIL_FROM_NAME || 'ProteQ Emergency Management'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'fking6915@gmail.com'}>`,
          to: staffMember.email,
          subject: emailSubject,
          html: emailHtml
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${staffMember.name} (${staffMember.email})`);
        return { success: true, email: staffMember.email, name: staffMember.name };
      } catch (error) {
        console.error(`❌ Failed to send email to ${staffMember.email}:`, error.message);
        return { success: false, email: staffMember.email, name: staffMember.name, error: error.message };
      }
    });
    
    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`📊 Email sending results: ${successful.length} successful, ${failed.length} failed`);
    
    // Log the email sending attempt
    await logEmailNotification(incidentData.id, teamId, staffMembers.length, successful.length, failed.length);
    
    return {
      success: true,
      teamName: team.name,
      totalMembers: staffMembers.length,
      emailsSent: successful.length,
      emailsFailed: failed.length,
      failedEmails: failed.map(f => f.email)
    };
    
  } catch (error) {
    console.error('❌ Error sending incident assignment email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Send incident assignment notification to individual staff member
async function sendStaffAssignmentEmail(incidentData, staffId) {
  try {
    console.log('📧 Sending incident assignment email for staff:', staffId);
    
    // Get staff information
    const [staffMembers] = await pool.execute(`
      SELECT id, name, email, position, department
      FROM staff
      WHERE id = ? AND (status = "active" OR status = 1)
    `, [staffId]);
    
    if (staffMembers.length === 0) {
      console.log('❌ Staff member not found or inactive:', staffId);
      return {
        success: false,
        error: 'Staff member not found or inactive'
      };
    }
    
    const staffMember = staffMembers[0];
    console.log('✅ Staff member found:', staffMember.name);
    
    // Prepare email content
    const emailSubject = `🚨 INCIDENT ASSIGNMENT - ${staffMember.name}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🚨 INCIDENT ASSIGNMENT</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">You have been assigned to an incident</h2>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #dc2626; margin-top: 0;">Incident Details</h3>
            <p><strong>Incident ID:</strong> #${incidentData.id}</p>
            <p><strong>Type:</strong> ${incidentData.type}</p>
            <p><strong>Priority:</strong> <span style="color: ${getPriorityColor(incidentData.priorityLevel)}; font-weight: bold;">${incidentData.priorityLevel.toUpperCase()}</span></p>
            <p><strong>Location:</strong> ${incidentData.location}</p>
            <p><strong>Description:</strong> ${incidentData.description}</p>
            <p><strong>Reported:</strong> ${new Date(incidentData.dateReported).toLocaleString()}</p>
          </div>
          
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1e40af; margin-top: 0;">Personal Assignment</h4>
            <p><strong>Assigned To:</strong> ${staffMember.name}</p>
            <p><strong>Position:</strong> ${staffMember.position}</p>
            <p><strong>Department:</strong> ${staffMember.department}</p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #92400e; margin-top: 0;">Required Action</h4>
            <p>Please review the incident details and take appropriate action.</p>
            <p>You can access the incident management system to update the status and add notes.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated notification from the MDRRMO Incident Management System.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;
    
    // Send email
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'ProteQ Emergency Management'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'fking6915@gmail.com'}>`,
      to: staffMember.email,
      subject: emailSubject,
      html: emailHtml
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${staffMember.name} (${staffMember.email})`);
    
    // Log the email sending attempt
    await logEmailNotification(incidentData.id, null, 1, 1, 0, staffId);
    
    return {
      success: true,
      staffName: staffMember.name,
      email: staffMember.email,
      emailsSent: 1,
      emailsFailed: 0
    };
    
  } catch (error) {
    console.error('❌ Error sending staff assignment email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to get priority color
function getPriorityColor(priority) {
  switch (priority) {
    case 'critical': return '#dc2626'; // red
    case 'high': return '#ea580c'; // orange
    case 'medium': return '#d97706'; // yellow
    case 'low': return '#059669'; // green
    default: return '#6b7280'; // gray
  }
}

// Log email notification attempts
async function logEmailNotification(incidentId, teamId, totalRecipients, emailsSent, emailsFailed, staffId = null) {
  try {
    await pool.execute(`
      INSERT INTO email_notifications 
      (incident_id, team_id, staff_id, total_recipients, emails_sent, emails_failed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [incidentId, teamId, staffId, totalRecipients, emailsSent, emailsFailed]);
  } catch (error) {
    console.error('Error logging email notification:', error);
  }
}

module.exports = {
  sendIncidentAssignmentEmail,
  sendStaffAssignmentEmail
};
