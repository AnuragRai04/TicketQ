// src/config/redis.js
require("dotenv").config();

const redisConnection = {
  host: "127.0.0.1",
  port: 6379,
};

module.exports = redisConnection;
