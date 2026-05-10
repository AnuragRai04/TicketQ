// src/queues/bookingQueue.js
const { Queue } = require("bullmq");
const redisConnection = require("../config/redis");

// Initialize the queue using our Redis connection
const bookingQueue = new Queue("bookingQueue", { connection: redisConnection });

module.exports = bookingQueue;
