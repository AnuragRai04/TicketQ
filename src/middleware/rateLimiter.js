// src/middleware/rateLimiter.js
const Redis = require("ioredis");

// Connect to your local Redis server
const redis = new Redis({ host: "127.0.0.1", port: 6379 });

async function rateLimiter(req, res, next) {
  // We assume authMiddleware has already run and populated req.user
  const userId = req.user.userId;
  const key = `ratelimit:${userId}`;
  const limit = 5;
  const windowTime = 60; // 60 seconds

  try {
    // 1. Increment the user's request counter
    const currentRequests = await redis.incr(key);

    // 2. If it is their very first request, set the 60-second countdown timer
    if (currentRequests === 1) {
      await redis.expire(key, windowTime);
    }

    // 3. Check if they have exceeded the limit
    if (currentRequests > limit) {
      return res.status(429).json({
        error: "Too many requests. Please wait a minute before trying again.",
      });
    }

    // 4. They are under the limit, let them pass!
    next();
  } catch (error) {
    console.error("Rate Limiter Error:", error);
    // Fail Open: If Redis crashes, we let the request through so the API doesn't go completely offline.
    next();
  }
}

module.exports = rateLimiter;
