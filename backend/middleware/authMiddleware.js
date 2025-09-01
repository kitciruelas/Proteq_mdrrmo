const jwt = require('jsonwebtoken');

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    req.admin = decoded; // Store admin info in request
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log('Auth middleware - Authorization header:', authHeader ? 'Present' : 'Missing');
  console.log('Auth middleware - Token:', token ? `${token.substring(0, 20)}...` : 'Missing');
  
  if (!token) {
    console.log('Auth middleware - No token provided');
    return res.status(401).json({
      success: false,
      message: 'Access token required. Please log in again.'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Auth middleware - Token decoded successfully:', {
      id: decoded.id,
      email: decoded.email,
      type: decoded.type,
      role: decoded.role,
      exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'No expiration'
    });
    
    // Check token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      console.log('Auth middleware - Token expired:', {
        currentTime: new Date(currentTime * 1000).toISOString(),
        expiration: new Date(decoded.exp * 1000).toISOString()
      });
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.'
      });
    }
    
    if (decoded.type !== 'user' && decoded.type !== 'admin' && decoded.type !== 'staff') {
      console.log('Auth middleware - Invalid user type:', decoded.type);
      return res.status(403).json({
        success: false,
        message: 'Invalid user type'
      });
    }
    
    req.user = decoded; // Store user info in request
    console.log('Auth middleware - Authentication successful');
    next();
  } catch (error) {
    console.error('Auth middleware - Token verification failed:', error.message);
    
    let errorMessage = 'Invalid or expired token';
    let statusCode = 403;
    
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token expired. Please log in again.';
      statusCode = 401;
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token. Please log in again.';
    } else if (error.name === 'NotBeforeError') {
      errorMessage = 'Token not yet active. Please check your system time.';
    }
    
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  authenticateAdmin,
  authenticateUser
};
