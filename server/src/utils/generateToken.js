const jwt = require("jsonwebtoken");

// Signs a JWT containing just the user's Mongo ID. We keep the payload
// minimal on purpose - anything else we need (name, email) we look up
// fresh from the DB when needed, rather than trusting stale token data.
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
}

module.exports = generateToken;
