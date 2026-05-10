const db = require("./db");

async function seed() {
  try {
    console.log("Seeding database...");

    // Event 1: The 10-Seat Concert
    const event1 = await db.query(
      "INSERT INTO events (name) VALUES ('Ed Sheeran Live') RETURNING id",
    );
    const e1Id = event1.rows[0].id;

    await db.query(
      "INSERT INTO seat_tiers (event_id, tier_name, price, total_seats, available_seats) VALUES ($1, 'GOLD', 5000, 2, 2)",
      [e1Id],
    );
    await db.query(
      "INSERT INTO seat_tiers (event_id, tier_name, price, total_seats, available_seats) VALUES ($1, 'GENERAL', 1500, 8, 8)",
      [e1Id],
    );

    // Event 2: The 2-Seat Exclusive Show (High Concurrency Test Target)
    const event2 = await db.query(
      "INSERT INTO events (name) VALUES ('Underground Secret Show') RETURNING id",
    );
    const e2Id = event2.rows[0].id;

    await db.query(
      "INSERT INTO seat_tiers (event_id, tier_name, price, total_seats, available_seats) VALUES ($1, 'VIP', 10000, 2, 2)",
      [e2Id],
    );

    console.log("Database seeded successfully!");
    process.exit();
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
