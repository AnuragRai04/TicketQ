const db = require("../db");

async function bookTickets(userId, tierId, quantity) {
  const pool = db.getPool();
  const client = await pool.connect(); // Grab a dedicated connection

  try {
    await client.query("BEGIN"); // Start the transaction

    // 1. Lock the row for this specific tier
    const tierResult = await client.query(
      "SELECT available_seats, price FROM seat_tiers WHERE id = $1 FOR UPDATE",
      [tierId],
    );

    if (tierResult.rows.length === 0) {
      throw new Error("Seat tier not found");
    }

    const availableSeats = tierResult.rows[0].available_seats;

    // 2. Check if we have enough seats
    if (availableSeats < quantity) {
      throw new Error("Not enough seats available");
    }

    // 3. Decrement the seats
    await client.query(
      "UPDATE seat_tiers SET available_seats = available_seats - $1 WHERE id = $2",
      [quantity, tierId],
    );

    // 4. Create the booking record
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, tier_id, status) 
             VALUES ($1, $2, 'confirmed') RETURNING *`,
      [userId, tierId],
    );

    await client.query("COMMIT"); // Save everything and RELEASE THE LOCK
    return bookingResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK"); // Cancel everything and RELEASE THE LOCK
    throw error;
  } finally {
    client.release(); // Return the connection back to the pool
  }
}

module.exports = { bookTickets };
