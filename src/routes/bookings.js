// src/routes/bookings.js
const express = require("express");
const Redis = require("ioredis");
const authMiddleware = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const bookingQueue = require("../queues/bookingQueue");

const router = express.Router();
const redis = new Redis({ host: "127.0.0.1", port: 6379 });

router.post("/", authMiddleware, rateLimiter, async (req, res) => {
  const { tierId, quantity } = req.body;
  const userId = req.user.userId;

  // 1. Grab the Idempotency Key from the headers
  const idempotencyKey = req.header("Idempotency-Key");

  if (!idempotencyKey) {
    return res.status(400).json({
      error: "Idempotency-Key header is required",
    });
  }

  const redisKey = `idempotency:${idempotencyKey}`;

  try {
    // 2. Check if we have already processed this exact request
    const cachedResponse = await redis.get(redisKey);

    if (cachedResponse) {
      console.log(
        `♻️ Idempotency hit! Returning cached response for key: ${idempotencyKey}`,
      );
      // Return the exact same response as last time, DO NOT queue a new job
      return res.status(200).json(JSON.parse(cachedResponse));
    }

    // 3. We haven't seen this key. Process normally!
    const job = await bookingQueue.add(
      "processBooking",
      {
        userId,
        tierId,
        quantity,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      },
    );

    const responsePayload = {
      message: "Your booking request is queued!",
      jobId: job.id,
      cached: false,
    };

    // 4. Save this response in Redis for 24 hours (86,400 seconds)
    await redis.setex(
      redisKey,
      86400,
      JSON.stringify({
        ...responsePayload,
        cached: true, // When retrieved from cache later, this flag will be true
      }),
    );

    // 5. Send the initial response
    res.status(202).json(responsePayload);
  } catch (error) {
    console.error("Booking route error:", error);
    res.status(500).json({ error: "Failed to process booking" });
  }
});

module.exports = router;
