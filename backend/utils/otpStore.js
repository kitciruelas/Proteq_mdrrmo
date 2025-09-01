// Simple in-memory OTP store (in production, use Redis or database)
const otpStore = new Map();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const storeOTP = (email, otp) => {
  const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
  otpStore.set(email, {
    otp,
    expiresAt,
    attempts: 0
  });
};

const verifyOTP = (email, otp, deleteOnSuccess = true) => {
  const storedData = otpStore.get(email);

  if (!storedData) {
    return { valid: false, message: 'OTP not found or expired' };
  }

  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(email);
    return { valid: false, message: 'OTP has expired' };
  }

  if (storedData.attempts >= 3) {
    otpStore.delete(email);
    return { valid: false, message: 'Too many failed attempts' };
  }

  if (storedData.otp === otp) {
    if (deleteOnSuccess) {
      otpStore.delete(email);
    }
    return { valid: true, message: 'OTP verified successfully' };
  } else {
    storedData.attempts += 1;
    return { valid: false, message: 'Invalid OTP' };
  }
};

const cleanupExpiredOTPs = () => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
    }
  }
};

const deleteOTP = (email) => {
  otpStore.delete(email);
};

// Clean up expired OTPs every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  deleteOTP
};
