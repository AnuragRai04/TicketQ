const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./db");
const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/bookings");
const eventRoutes = require("./routes/events");

// --- 1. NEW WEBSOCKET IMPORTS ---
const http = require("http");
const { Server } = require("socket.io");
const Redis = require("ioredis");

const app = express();
const port = process.env.PORT || 3000;

// --- 2. WRAP EXPRESS WITH SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve our frontend HTML file

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/events", eventRoutes);

// --- 3. REDIS PUB/SUB: LISTEN TO THE WORKER ---
const redisSubscriber = new Redis({ host: "127.0.0.1", port: 6379 });
redisSubscriber.subscribe("seat_updates");

redisSubscriber.on("message", (channel, message) => {
  if (channel === "seat_updates") {
    const data = JSON.parse(message);
    // Broadcast the new count to anyone looking at this specific tier
    io.to(`tier:${data.tierId}`).emit("seat_update", {
      availableSeats: data.availableSeats,
    });
  }
});

// --- 4. HANDLE FRONTEND WEBSOCKET CONNECTIONS ---
io.on("connection", (socket) => {
  console.log("🟢 A user connected to the live tracker");

  // When a user views an event, they join a "room" to only get relevant updates
  socket.on("join_tier", (tierId) => {
    socket.join(`tier:${tierId}`);
    console.log(`User joined room: tier:${tierId}`);
  });
});

app.get("/", (req, res) => {
  res.send("TicketQ server running");
});

// Use server.listen instead of app.listen!
server.listen(port, () => {
  console.log(`TicketQ server running on port ${port}`);
});
