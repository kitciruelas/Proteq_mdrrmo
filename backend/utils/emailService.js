const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Additional Gmail-specific settings
  tls: {
    rejectUnauthorized: false
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.log('Email service error:', error);
  } else {
    console.log('Email service is ready to send messages');
  }
});

const sendPasswordResetOTP = async (email, otpCode) => {
  const mailOptions = {
    from: {
      name: 'MDRRMO Support',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Password Reset OTP - MDRRMO',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin: 0;">Password Reset Code</h2>
        </div>

        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            You requested a password reset for your MDRRMO account. Use the verification code below to reset your password:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #e9ecef; border: 2px solid #007bff; border-radius: 8px; padding: 20px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otpCode}
              </span>
            </div>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            This code will expire in 10 minutes for security reasons.
          </p>

          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 12px; margin: 20px 0;">
            <p style="color: #856404; font-size: 14px; margin: 0;">
              <strong>Security Notice:</strong> Never share this code with anyone. Our support team will never ask for your verification code.
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>MDRRMO Disaster Management System</p>
          <p>If you have any questions, contact our support team.</p>
        </div>
      </div>
    `,
    text: `
      Password Reset Code - MDRRMO

      You requested a password reset for your MDRRMO account.

      Your verification code is: ${otpCode}

      This code will expire in 10 minutes for security reasons.

      If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

      Security Notice: Never share this code with anyone. Our support team will never ask for your verification code.

      MDRRMO Disaster Management System
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetOTP
};
