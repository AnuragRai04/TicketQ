const jwtToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc3ODQzOTYxMywiZXhwIjoxNzc4NDQzMjEzfQ.hRWtqBCpCgoZ9nl7BF7pX6JiK6Mo6Kqe2Uho60IjtKA"; // <-- Don't forget this!
const targetTierId = 3; // The ID of the VIP tier with only 2 seats
const quantityPerRequest = 1;

async function fireRequest(requestNumber) {
  try {
    // Using 127.0.0.1 to avoid the Node.js localhost bug
    const response = await fetch("http://127.0.0.1:3000/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        tierId: targetTierId,
        quantity: quantityPerRequest,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Success now means we got a jobId from the queue!
      console.log(`✅ Request ${requestNumber} QUEUED. Job ID:`, data.jobId);
      return "success";
    } else {
      // This happens if the token is invalid or the route completely fails
      console.log(`❌ Request ${requestNumber} REJECTED:`, data.error);
      return "failed";
    }
  } catch (err) {
    // This catches network errors (like the server being offline)
    console.error(`⚠️ Request ${requestNumber} crashed:`, err.message);
    return "error";
  }
}

async function runTest() {
  console.log(`Firing 50 simultaneous booking requests for 2 seats...`);

  // Create an array of 50 pending promises
  const requests = [];
  for (let i = 1; i <= 50; i++) {
    requests.push(fireRequest(i));
  }

  // Promise.all fires them all concurrently
  const results = await Promise.all(requests);

  const successes = results.filter((r) => r === "success").length;
  const failures = results.filter((r) => r === "failed").length;

  console.log(`\n--- EXPRESS API RESULTS ---`);
  console.log(`Expected: 50 Queued Successfully`);
  console.log(`Actual:   ${successes} Queued, ${failures} Rejected`);
  console.log(
    `\n👉 NOW LOOK AT TERMINAL 2 (THE WORKER) TO SEE THE ACTUAL BOOKINGS!`,
  );
}

runTest();
