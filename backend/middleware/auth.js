const { auth } = require('../config/firebase');

/**
 * Middleware to verify Firebase auth token
 * Attaches the decoded user to the request object if successful
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    try {
      // Verify the ID token
      const decodedToken = await auth.verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { verifyToken }; 