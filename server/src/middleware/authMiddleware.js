const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protects a route: expects "Authorization: Bearer <token>" header.
// If valid, attaches the full user doc (minus password) to req.user
// so downstream route handlers can just read req.user directly.
async function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ error: "User no longer exists" });
      }

      return next();
    } catch (err) {
      return res.status(401).json({ error: "Not authorized, token invalid" });
    }
  }

  return res.status(401).json({ error: "Not authorized, no token provided" });
}

module.exports = { protect };
