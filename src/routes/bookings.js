// src/routes/bookings.js
const express = require("express");
const authMiddleware = require("../middleware/auth");
const bookingQueue = require("../queues/bookingQueue"); // <-- Import the queue

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  const { tierId, quantity } = req.body;
  const userId = req.user.userId;

  try {
    // Drop the booking details into the queue
    const job = await bookingQueue.add(
      "processBooking",
      {
        userId,
        tierId,
        quantity,
      },
      {
        // Queue-level configurations
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 }, // Wait 1s, then 2s, then 4s on fail
      },
    );

    // Immediately respond to the user
    res.status(202).json({
      message: "Your booking request is queued!",
      jobId: job.id,
    });
  } catch (error) {
    console.error("Queue error:", error);
    res.status(500).json({ error: "Failed to queue booking" });
  }
});

module.exports = router;
