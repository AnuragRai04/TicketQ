const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

// POST /api/events (PROTECTED: Only logged-in users/admins can create events)
router.post("/", authMiddleware, async (req, res) => {
  const { name, tiers } = req.body;

  try {
    await db.query("BEGIN"); // Start transaction

    // 1. Create the event
    const eventResult = await db.query(
      "INSERT INTO events (name) VALUES ($1) RETURNING id",
      [name],
    );
    const eventId = eventResult.rows[0].id;

    // 2. Insert all the seat tiers linked to that event ID
    for (let tier of tiers) {
      await db.query(
        "INSERT INTO seat_tiers (event_id, tier_name, price, total_seats, available_seats) VALUES ($1, $2, $3, $4, $5)",
        [eventId, tier.name, tier.price, tier.seats, tier.seats],
      );
    }

    await db.query("COMMIT"); // Save everything permanently
    res
      .status(201)
      .json({ message: "Event and tiers created successfully", eventId });
  } catch (error) {
    await db.query("ROLLBACK"); // Cancel everything if anything failed
    console.error(error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// GET /api/events (PUBLIC: Anyone can see the list of events)
router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM events");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// GET /api/events/:id (PUBLIC: View a specific event and its seat tiers)
router.get("/:id", async (req, res) => {
  try {
    const eventResult = await db.query("SELECT * FROM events WHERE id = $1", [
      req.params.id,
    ]);
    if (eventResult.rows.length === 0)
      return res.status(404).json({ error: "Event not found" });

    const tiersResult = await db.query(
      "SELECT * FROM seat_tiers WHERE event_id = $1",
      [req.params.id],
    );

    // Merge the event data with its tiers
    res.json({
      ...eventResult.rows[0],
      tiers: tiersResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch event details" });
  }
});

module.exports = router;
