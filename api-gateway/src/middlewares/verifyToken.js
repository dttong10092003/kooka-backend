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
