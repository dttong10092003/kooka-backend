// const jwt = require('jsonwebtoken');

// /**
//  * Middleware to verify JWT token
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  * @param {Function} next - Express next function
//  */
// const verifyToken = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//       return res.status(401).json({
//         error: 'Unauthorized',
//         message: 'No token provided'
//       });
//     }

//     // Extract token from "Bearer TOKEN" format
//     const token = authHeader.startsWith('Bearer ')
//       ? authHeader.slice(7)
//       : authHeader;

//     // Verify token
//     jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//       if (err) {
//         return res.status(403).json({
//           error: 'Forbidden',
//           message: 'Invalid or expired token'
//         });
//       }

//       // Add user info to request object
//       req.user = decoded;
//       next();
//     });

//   } catch (error) {
//     console.error('Token verification error:', error);
//     return res.status(500).json({
//       error: 'Internal Server Error',
//       message: 'Token verification failed'
//     });
//   }
// };

// module.exports = verifyToken;

const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.headers["x-user-id"] = decoded.id; // Set user ID in headers for downstream services
    req.headers["x-user-role"] = decoded.isAdmin; // Set user role in headers for downstream services
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
