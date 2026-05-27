// src/testRateLimit.js
const crypto = require("crypto"); // Built-in Node module for generating UUIDs

const jwtToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc3OTg2Nzc2MywiZXhwIjoxNzc5ODcxMzYzfQ.qrXe_Lsov24sH3B4_en0_rFaPqUqmsB9J6d-Q9-ECqk"; // <-- Put your active token here
const targetTierId = 3;

async function runRateLimitTest() {
  console.log("Firing 10 rapid booking requests from a single user...");

  const requests = [];
  for (let i = 1; i <= 10; i++) {
    // Generate a unique ID for every single request
    const uniqueKey = crypto.randomUUID();

    requests.push(
      fetch("http://127.0.0.1:3000/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
          "Idempotency-Key": uniqueKey, // <-- The new mandatory header!
        },
        body: JSON.stringify({ tierId: targetTierId, quantity: 1 }),
      }).then(async (res) => {
        const data = await res.json();
        return { status: res.status, data };
      }),
    );
  }

  const results = await Promise.all(requests);

  results.forEach((res, index) => {
    if (res.status === 202 || res.status === 200 || res.status === 201) {
      console.log(`✅ Request ${index + 1}: ALLOWED (Status: ${res.status})`);
    } else if (res.status === 429) {
      console.log(`❌ Request ${index + 1}: BLOCKED - ${res.data.error}`);
    } else {
      console.log(
        `⚠️ Request ${index + 1}: FAILED (Status: ${res.status}) -`,
        res.data,
      );
    }
  });
}

runRateLimitTest();
