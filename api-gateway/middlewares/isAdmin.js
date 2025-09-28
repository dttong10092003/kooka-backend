const verifyToken = require('./verifyToken');

/**
 * Middleware to check if user is admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAdmin = (req, res, next) => {
  // First verify the token
  verifyToken(req, res, (err) => {
    if (err) {
      return; // Error already handled by verifyToken
    }

    try {
      // Check if user has admin role
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User information not found'
        });
      }

      // Check for admin role (adjust based on your user structure)
      const isUserAdmin = req.user.role === 'admin' || 
                         req.user.role === 'superadmin' || 
                         req.user.isAdmin === true;

      if (!isUserAdmin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      next();

    } catch (error) {
      console.error('Admin verification error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Admin verification failed'
      });
    }
  });
};

module.exports = isAdmin;