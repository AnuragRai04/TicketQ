const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  // 1. Grab the token from the header (Format: "Bearer <token>")
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  // Extract the actual token string without the "Bearer " part
  const token = authHeader.split(" ")[1];

  try {
    // 2. Verify the token using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach the decoded user data (like userId) to the request
    req.user = decoded;

    // 4. Move on to the next function/route
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token." });
  }
}

module.exports = authMiddleware;
