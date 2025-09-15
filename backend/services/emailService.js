const nodemailer = require('nodemailer');
const pool = require('../config/conn');

// Function to create transporter with current config
const createTransporter = () => {
    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
    const smtpUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const smtpPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
    const smtpPort = process.env.SMTP_PORT || process.env.EMAIL_PORT || 587;

    console.log('📧 Creating transporter with config:', {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser ? '***configured***' : 'MISSING',
        pass: smtpPass ? '***configured***' : 'MISSING'
    });

    return nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false, // true for 465, false for other ports
        auth: {
            user: smtpUser,
            pass: smtpPass
        },
        tls: {
            rejectUnauthorized: false // Allow self-signed certificates in development
        }
    });
};

// Function to send password reset OTP
const sendPasswordResetOTP = async (email, otp) => {
    try {
        // Validate SMTP configuration (support both EMAIL_* and SMTP_* variables)
        const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
        const smtpUser = process.env.EMAIL_USER || process.env.SMTP_USER;
        const smtpPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
        const smtpPort = process.env.SMTP_PORT || process.env.EMAIL_PORT || 587;

        console.log('🔧 SMTP Configuration Debug:', {
            'process.env.EMAIL_USER': process.env.EMAIL_USER ? '***set***' : 'NOT SET',
            'process.env.SMTP_USER': process.env.SMTP_USER ? '***set***' : 'NOT SET',
            'process.env.EMAIL_PASS': process.env.EMAIL_PASS ? '***set***' : 'NOT SET',
            'process.env.SMTP_PASS': process.env.SMTP_PASS ? '***set***' : 'NOT SET',
            'smtpHost': smtpHost,
            'smtpUser': smtpUser ? '***configured***' : 'MISSING',
            'smtpPass': smtpPass ? '***configured***' : 'MISSING',
            'smtpPort': smtpPort
        });

        // More lenient validation - only require user and pass, host has default
        if (!smtpUser || !smtpPass) {
            console.error('❌ SMTP configuration missing required credentials:', {
                user: smtpUser ? '***set***' : 'MISSING',
                pass: smtpPass ? '***set***' : 'MISSING',
                host: smtpHost,
                port: smtpPort
            });
            throw new Error(`SMTP credentials missing. Please set EMAIL_USER and EMAIL_PASS in your .env file. Current: User=${smtpUser ? 'set' : 'missing'}, Pass=${smtpPass ? 'set' : 'missing'}`);
        }

        console.log('Attempting to send password reset OTP to:', email);
        console.log('SMTP Configuration:', {
            host: smtpHost,
            port: smtpPort,
            user: smtpUser ? '***configured***' : 'missing',
            secure: false
        });

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'ProteQ Emergency Management'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
            to: email,
            subject: 'Password Reset OTP - ProteQ Emergency Management',
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

        const transporter = createTransporter();
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Password reset OTP email sent successfully:', {
            messageId: info.messageId,
            email: email,
            timestamp: new Date().toISOString()
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending password reset OTP email:', {
            email: email,
            error: error.message,
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            hostname: error.hostname,
            timestamp: new Date().toISOString()
        });

        // Provide more specific error messages based on error type
        if (error.code === 'EAUTH') {
            throw new Error('SMTP authentication failed. Please check SMTP_USER and SMTP_PASS credentials.');
        } else if (error.code === 'ECONNREFUSED') {
            throw new Error('SMTP connection refused. Please check SMTP_HOST and SMTP_PORT settings.');
        } else if (error.code === 'ENOTFOUND') {
            throw new Error('SMTP host not found. Please check SMTP_HOST setting.');
        } else if (error.code === 'ETIMEDOUT') {
            throw new Error('SMTP connection timed out. Please check network connectivity and SMTP settings.');
        } else {
            throw new Error(`Failed to send password reset email: ${error.message}`);
        }
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
                // Get the frontend URL from environment or default to localhost
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

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

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${frontendUrl}/staff/incidents/${incidentData.id}"
                           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            📋 View Incident Details
                        </a>
                    </div>

                            <p style="color: #666; font-size: 14px;">
                                Click the button above to view the full incident details and take appropriate action.
                            </p>

                            <p>Best regards,<br>MDRRMO System Team</p>
                        </div>
                    `
                };

                const transporter = createTransporter();
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

        // Get the frontend URL from environment or default to localhost
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

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

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${frontendUrl}/staff/incidents/${incidentData.id}"
                           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            📋 View Incident Details
                        </a>
                    </div>

                    <p style="color: #666; font-size: 14px;">
                        Click the button above to view the full incident details and take appropriate action.
                    </p>

                    <p>Best regards,<br>MDRRMO System Team</p>
                </div>
            `
        };

        const transporter = createTransporter();
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

// Function to send staff account creation email
const sendStaffAccountCreationEmail = async (staffData, plainPassword) => {
    try {
        console.log('📧 Preparing to send staff account creation email to:', staffData.email);

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'ProteQ Emergency Management'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
            to: staffData.email,
            subject: 'Welcome to ProteQ - Your Account Has Been Created',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Welcome to ProteQ Emergency Management System</h2>
                    <p>Hello ${staffData.name},</p>
                    <p>Your staff account has been successfully created. You can now access the system using the following credentials:</p>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">Login Credentials:</h3>
                        <p><strong>Email:</strong> ${staffData.email}</p>
                        <p><strong>Password:</strong> ${plainPassword}</p>
                        <p><strong>Position:</strong> ${staffData.position}</p>
                        <p><strong>Department:</strong> ${staffData.department}</p>
                    </div>

                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404;">
                            <strong>⚠️ Security Notice:</strong> Please change your password after your first login for security purposes.
                        </p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login"
                           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            🔐 Login to Your Account
                        </a>
                    </div>

                    <p>If you have any questions or need assistance, please contact your system administrator.</p>

                    <p>Best regards,<br>MDRRMO System Team</p>
                </div>
            `
        };

        const transporter = createTransporter();
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Staff account creation email sent to ${staffData.name} (${staffData.email})`);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Error sending staff account creation email:', error);
        throw new Error(`Failed to send account creation email: ${error.message}`);
    }
};

module.exports = {
    sendPasswordResetOTP,
    sendIncidentAssignmentEmail,
    sendStaffAssignmentEmail,
    sendStaffAccountCreationEmail
};
