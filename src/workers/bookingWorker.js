const { Worker, UnrecoverableError } = require("bullmq");
const redisConnection = require("../config/redis");
const { bookTickets } = require("../services/bookingService");
const Redis = require("ioredis"); // <-- New Import
const db = require("../db"); // <-- New Import

// The loudspeaker to shout to Express
const redisPublisher = new Redis({ host: "127.0.0.1", port: 6379 });

console.log("👷 Booking Worker started. Listening for jobs...");

const bookingWorker = new Worker(
  "bookingQueue",
  async (job) => {
    const { userId, tierId, quantity } = job.data;

    try {
      // 1. Process the transaction
      const result = await bookTickets(userId, tierId, quantity);

      // 2. Fetch the new remaining seat count
      const countResult = await db.query(
        "SELECT available_seats FROM seat_tiers WHERE id = $1",
        [tierId],
      );
      const availableSeats = countResult.rows[0].available_seats;

      // 3. Publish the update to Redis so Express hears it
      await redisPublisher.publish(
        "seat_updates",
        JSON.stringify({
          tierId,
          availableSeats,
        }),
      );

      return result;
    } catch (error) {
      if (
        error.message === "Not enough seats available" ||
        error.message === "Seat tier not found"
      ) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

// ... Keep your existing completed/failed event listeners below here ...

// Successful job listener
bookingWorker.on("completed", (job, returnvalue) => {
  console.log(`✅ [Job ${job.id}] Completed! Booking ID: ${returnvalue.id}`);
});

// Failed job listener (Updated for UnrecoverableError)
bookingWorker.on("failed", (job, err) => {
  console.log(`❌ [Job ${job.id}] Failed. Reason: ${err.message}`);

  // It goes to the DLQ if it ran out of normal retries OR if we forced it with UnrecoverableError
  if (
    job.attemptsMade === job.opts.attempts ||
    err.name === "UnrecoverableError"
  ) {
    console.log(`☠️ [Job ${job.id}] MOVED TO DEAD LETTER QUEUE.`);
  }
});

module.exports = bookingWorker;
