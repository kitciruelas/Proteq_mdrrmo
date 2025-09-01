const nodemailer = require('nodemailer');
const pool = require('../config/conn');

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Function to send password reset OTP
const sendPasswordResetOTP = async (email, otp) => {
    try {
        const mailOptions = {
            from: `"MDRRMO System" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Password Reset OTP - MDRRMO System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>Hello,</p>
                    <p>You have requested to reset your password for the MDRRMO System.</p>
                    <p>Your One-Time Password (OTP) is:</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
                    </div>
                    <p>This OTP will expire in 10 minutes.</p>
                    <p>If you didn't request this password reset, please ignore this email.</p>
                    <p>Best regards,<br>MDRRMO System Team</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset OTP email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending password reset OTP email:', error);
        throw new Error('Failed to send password reset email');
    }
};

// Function to send incident assignment email to team members
const sendIncidentAssignmentEmail = async (incidentData, teamId) => {
    try {
        console.log('📧 Preparing to send incident assignment emails to team:', teamId);

        // Get team members
        const [teamMembers] = await pool.execute(`
            SELECT s.id, s.name, s.email, s.position, s.department
            FROM staff s
            WHERE s.assigned_team_id = ? AND (s.status = "active" OR s.status = 1) AND s.availability = 'available'
        `, [teamId]);

        if (teamMembers.length === 0) {
            console.log('⚠️ No active team members found for team:', teamId);
            return { success: false, error: 'No active team members found' };
        }

        console.log(`📧 Found ${teamMembers.length} team members to notify`);

        let emailsSent = 0;
        let emailsFailed = 0;
        const failedEmails = [];

        // Send email to each team member
        for (const member of teamMembers) {
            try {
                const mailOptions = {
                    from: `"MDRRMO System" <${process.env.SMTP_USER}>`,
                    to: member.email,
                    subject: `🚨 Incident Assignment - ${incidentData.type}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #dc3545;">🚨 New Incident Assignment</h2>
                            <p>Hello ${member.name},</p>
                            <p>You have been assigned to handle a new incident through your team assignment.</p>

                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                                <h3 style="color: #333; margin-top: 0;">Incident Details:</h3>
                                <p><strong>Type:</strong> ${incidentData.type}</p>
                                <p><strong>Location:</strong> ${incidentData.location || 'Not specified'}</p>
                                <p><strong>Priority:</strong> ${incidentData.priorityLevel}</p>
                                <p><strong>Description:</strong> ${incidentData.description}</p>
                                <p><strong>Reported:</strong> ${new Date(incidentData.dateReported).toLocaleString()}</p>
                            </div>

                            <p>Please log into the MDRRMO system to view the full incident details and take appropriate action.</p>

                            <p>Best regards,<br>MDRRMO System Team</p>
                        </div>
                    `
                };

                await transporter.sendMail(mailOptions);
                emailsSent++;
                console.log(`✅ Email sent to ${member.name} (${member.email})`);

            } catch (emailError) {
                console.error(`❌ Failed to send email to ${member.name} (${member.email}):`, emailError.message);
                emailsFailed++;
                failedEmails.push({ name: member.name, email: member.email, error: emailError.message });
            }
        }

        console.log(`📧 Email sending completed: ${emailsSent} sent, ${emailsFailed} failed`);

        return {
            success: true,
            totalMembers: teamMembers.length,
            emailsSent,
            emailsFailed,
            failedEmails
        };

    } catch (error) {
        console.error('Error sending incident assignment emails:', error);
        return { success: false, error: error.message };
    }
};

// Function to send incident assignment email to individual staff member
const sendStaffAssignmentEmail = async (incidentData, staffId) => {
    try {
        console.log('📧 Preparing to send incident assignment email to staff:', staffId);

        // Get staff member details
        const [staff] = await pool.execute(`
            SELECT id, name, email, position, department
            FROM staff
            WHERE id = ? AND (status = "active" OR status = 1)
        `, [staffId]);

        if (staff.length === 0) {
            console.log('⚠️ Staff member not found:', staffId);
            return { success: false, error: 'Staff member not found' };
        }

        const staffMember = staff[0];
        console.log(`📧 Sending email to ${staffMember.name} (${staffMember.email})`);

        const mailOptions = {
            from: `"MDRRMO System" <${process.env.SMTP_USER}>`,
            to: staffMember.email,
            subject: `🚨 Incident Assignment - ${incidentData.type}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc3545;">🚨 New Incident Assignment</h2>
                    <p>Hello ${staffMember.name},</p>
                    <p>You have been assigned to handle a new incident.</p>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">Incident Details:</h3>
                        <p><strong>Type:</strong> ${incidentData.type}</p>
                        <p><strong>Location:</strong> ${incidentData.location || 'Not specified'}</p>
                        <p><strong>Priority:</strong> ${incidentData.priorityLevel}</p>
                        <p><strong>Description:</strong> ${incidentData.description}</p>
                        <p><strong>Reported:</strong> ${new Date(incidentData.dateReported).toLocaleString()}</p>
                    </div>

                    <p>Please log into the MDRRMO system to view the full incident details and take appropriate action.</p>

                    <p>Best regards,<br>MDRRMO System Team</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${staffMember.name} (${staffMember.email})`);

        return {
            success: true,
            staffName: staffMember.name,
            staffEmail: staffMember.email
        };

    } catch (error) {
        console.error('Error sending staff assignment email:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendPasswordResetOTP,
    sendIncidentAssignmentEmail,
    sendStaffAssignmentEmail
};
