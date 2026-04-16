const URL =
  "https://aru-test-center-search.collegeboard.org/prod/test-centers?date=2026-05-02&country=MN";

const ALERT_URL = "https://ntfy.sh/sat-mongolia-alert";

const CHECK_INTERVAL_MS = 20 * 1000; 
const RE_ALERT_AFTER_CHECKS = 4;
const RE_ALERT_MAX = 4;

let lastState = false;
let availableSinceChecks = 0;
let reAlertCount = 0;
let consecutiveErrors = 0;
let intervalHandle = null;

// ---------------- TIME ----------------
function getMongoliaTime() {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    hour12: false,
  });
}

// ---------------- FETCH (FAST + SAFE) ----------------
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000)); // fast retry
    }
  }
}

// ---------------- ALERT ----------------
async function sendAlert(centers, isReAlert = false) {
  const title = isReAlert
    ? `[${reAlertCount}/${RE_ALERT_MAX}] STILL OPEN`
    : `SAT SEAT OPEN`;

  const body = centers
    .map((c) => `- ${c.name} (${c.city ?? "??"})`)
    .join("\n");

  try {
    await fetchWithRetry(ALERT_URL, {
      method: "POST",
      headers: {
        Title: title,
        Priority: "urgent",
        Tags: "school",
        "Content-Type": "text/plain",
      },
      body: `${title}\n\n${body}`,
    });

    console.log(`[ALERT SENT] ${title}`);
  } catch (err) {
    console.error("[ALERT FAILED]", err.message);
  }
}

// ---------------- CORE ----------------
async function checkSeats() {
  try {
    const res = await fetchWithRetry(URL);
    const data = await res.json();

    //  CONFIRMED correct logic
    const availableCenters = data.filter(
      (c) => c.seatAvailability === true
    );

    const isAvailable = availableCenters.length > 0;

    console.log(
      `[CHECK] ${getMongoliaTime()} → ${
        isAvailable ? `OPEN (${availableCenters.length})` : "none"
      }`
    );

    if (isAvailable) {
      if (!lastState) {
        // FIRST DETECTION
        reAlertCount = 0;
        availableSinceChecks = 0;
        await sendAlert(availableCenters, false);
      } else {
        availableSinceChecks++;

        if (
          availableSinceChecks >= RE_ALERT_AFTER_CHECKS &&
          reAlertCount < RE_ALERT_MAX
        ) {
          availableSinceChecks = 0;
          reAlertCount++;
          await sendAlert(availableCenters, true);
        }
      }
    } else {
      if (lastState) console.log("[INFO] Seats closed again");
      availableSinceChecks = 0;
      reAlertCount = 0;
    }

    lastState = isAvailable;
    consecutiveErrors = 0;
  } catch (err) {
    consecutiveErrors++;

    const backoff = Math.min(20000 * 2 ** consecutiveErrors, 300000);

    console.error(
      `[ERROR #${consecutiveErrors}] ${err.message} → backoff ${backoff / 1000}s`
    );

    restartInterval(backoff);
  }
}

// ---------------- INTERVAL CONTROL ----------------
function restartInterval(ms) {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = setInterval(checkSeats, ms);
}

// ---------------- START ----------------
function start() {
  console.log("[START] SAT sniper running");
  console.log(`[INTERVAL] ${CHECK_INTERVAL_MS / 1000}s`);

  // slight jitter to avoid sync with others
  const jitter = Math.random() * 2000;

  setTimeout(() => {
    checkSeats();
    intervalHandle = setInterval(checkSeats, CHECK_INTERVAL_MS);
  }, jitter);
}

// ---------------- SAFE EXIT ----------------
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\n[${sig}] stopping`);
    if (intervalHandle) clearInterval(intervalHandle);
    process.exit(0);
  });
}

// RUN
start();