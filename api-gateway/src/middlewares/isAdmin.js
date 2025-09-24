module.exports = (req, res, next) => {
  const isAdmin = req.headers["x-user-role"];
  if (isAdmin !== true && isAdmin !== "true") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};
