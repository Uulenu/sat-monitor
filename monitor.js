const URL =
  "https://aru-test-center-search.collegeboard.org/prod/test-centers?date=2026-05-02&country=MN";

const ALERT_URL = "https://ntfy.sh/sat-mongolia-alert";

const CHECK_INTERVAL_MS = 30 * 1000;
const RE_ALERT_AFTER_CHECKS = 4;
const RE_ALERT_MAX = 10;

let lastState = false;
let availableSinceChecks = 0;
let reAlertCount = 0;
let consecutiveErrors = 0;
let intervalHandle = null;

// ---------------- TIME ----------------
function getMongoliaTime() {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ---------------- FETCH SAFE ----------------
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// ---------------- ALERT ----------------
async function sendAlert(centers, isReAlert = false) {
  const title = isReAlert
    ? `[${reAlertCount}/${RE_ALERT_MAX}] SAT STILL OPEN - Mongolia`
    : `🚨 SAT SEAT OPEN - Mongolia`;

  const body = centers
    .map((c) => `• ${c.name || "Unknown"}`)
    .join("\n");

  try {
    const res = await fetchWithRetry(ALERT_URL, {
      method: "POST",
      headers: {
        Title: title,
        Priority: "urgent",
        Tags: "rotating_light,school",
        "Content-Type": "text/plain",
      },
      body: `${title}\n\n${body}`,
    });

    console.log(`[ALERT SENT] ${res.status}`);
  } catch (err) {
    console.error("[ALERT FAILED]", err.message);
  }
}

// ---------------- CORE CHECK ----------------
async function checkSeats() {
  try {
    const res = await fetchWithRetry(URL);
    const raw = await res.json();

    // FIX: handle different API structures safely
    const centers = Array.isArray(raw)
      ? raw
      : raw.testCenters || raw.centers || [];

    if (!Array.isArray(centers)) {
      throw new Error("Unexpected API structure");
    }

    // DEBUG (keep for now, remove later if stable)
    console.log("[DEBUG seatAvailability sample]", centers[0]?.seatAvailability);

    // FIX: robust availability detection
    const availableCenters = centers.filter((c) => {
      const v = c.seatAvailability;
      return (
        v === true ||
        v === "AVAILABLE" ||
        v === "OPEN" ||
        v === "YES" ||
        v === 1
      );
    });

    const isAvailable = availableCenters.length > 0;

    console.log(
      `[CHECK] ${getMongoliaTime()} -> ${
        isAvailable ? `OPEN (${availableCenters.length})` : "none"
      }`
    );

    // ---------------- STATE LOGIC ----------------
    if (isAvailable) {
      const firstDetection = !lastState;

      if (firstDetection) {
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
      if (lastState) console.log("[INFO] Seats closed again.");
      availableSinceChecks = 0;
      reAlertCount = 0;
    }

    lastState = isAvailable;
    consecutiveErrors = 0;
  } catch (err) {
    consecutiveErrors++;
    console.error(
      `[ERROR #${consecutiveErrors}]`,
      err.message
    );
  }
}

// ---------------- SCHEDULER ----------------
function start() {
  console.log("[START] SAT monitor running");
  console.log(`[INTERVAL] ${CHECK_INTERVAL_MS / 1000}s`);

  const jitter = Math.random() * 2000;

  setTimeout(() => {
    checkSeats();
    intervalHandle = setInterval(checkSeats, CHECK_INTERVAL_MS);
  }, jitter);
}

// ---------------- GRACEFUL STOP ----------------
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\n[${sig}] stopping monitor`);
    if (intervalHandle) clearInterval(intervalHandle);
    process.exit(0);
  });
}

// START
start();const URL =
  "https://aru-test-center-search.collegeboard.org/prod/test-centers?date=2026-05-02&country=MN";
const ALERT_URL = "https://ntfy.sh/sat-mongolia-alert";
const CHECK_INTERVAL_MS = 30 * 1000;
const RE_ALERT_AFTER_CHECKS = 4;
const RE_ALERT_MAX = 10;
let lastState = false;
let availableSinceChecks = 0;
let reAlertCount = 0;
let consecutiveErrors = 0;
let currentInterval = CHECK_INTERVAL_MS;
let intervalHandle = null;
function getMongoliaTime() {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
}
async function sendAlert(centers, isReAlert = false) {
  const title = isReAlert
    ? `[${reAlertCount}/${RE_ALERT_MAX}] STILL AVAILABLE - SAT May 2 Mongolia`
    : `SAT SEAT OPEN - May 2 Mongolia`;
  const body = centers
    .map((c) => `* ${c.name} (${c.city ?? "??"})`)
    .join("\n");
  await fetchWithRetry(ALERT_URL, {
    method: "POST",
    headers: {
      Title: title,
      Priority: "urgent",
      Tags: "rotating_light,school",
      "Content-Type": "text/plain",
    },
    body: `${title}\n\n${body}\n\nCheck: collegeboard.org`,
  });
  console.log(`[ALERT SENT] ${isReAlert ? `re-alert ${reAlertCount}/${RE_ALERT_MAX}` : "first alert"}`);
}
async function checkSeats() {
  try {
    const res = await fetchWithRetry(URL);
    const data = await res.json();
    const availableCenters = data.filter((c) => c.seatAvailability === true);
    const isAvailable = availableCenters.length > 0;
    console.log(
      `[CHECK] ${getMongoliaTime()} -> ${isAvailable ? `OPEN: ${availableCenters.length} center(s)` : "none"}`
    );
    if (isAvailable) {
      const isFirstDetection = !lastState;
      availableSinceChecks++;
      if (isFirstDetection) {
        reAlertCount = 0;
        await sendAlert(availableCenters, false);
      } else if (
        availableSinceChecks % RE_ALERT_AFTER_CHECKS === 0 &&
        reAlertCount < RE_ALERT_MAX
      ) {
        reAlertCount++;
        await sendAlert(availableCenters, true);
      } else if (reAlertCount >= RE_ALERT_MAX) {
        console.log(`[INFO] Re-alert limit reached (${RE_ALERT_MAX}). No more pings.`);
      }
    } else {
      if (lastState) console.log("[INFO] Seats closed again.");
      availableSinceChecks = 0;
      reAlertCount = 0;
    }
    lastState = isAvailable;
    consecutiveErrors = 0;
    if (currentInterval !== CHECK_INTERVAL_MS) {
      reschedule(CHECK_INTERVAL_MS);
    }
  } catch (err) {
    consecutiveErrors++;
    const backoff = Math.min(CHECK_INTERVAL_MS * 2 ** consecutiveErrors, 10 * 60 * 1000);
    console.error(`[ERROR #${consecutiveErrors}] ${err.message} — backing off to ${backoff / 1000}s`);
    reschedule(backoff);
  }
}
function reschedule(ms) {
  if (intervalHandle) clearInterval(intervalHandle);
  currentInterval = ms;
  intervalHandle = setInterval(checkSeats, ms);
}
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\n[${sig}] Stopping monitor. Last state: ${lastState}`);
    if (intervalHandle) clearInterval(intervalHandle);
    process.exit(0);
  });
}
console.log(`[START] SAT seat monitor running. Interval: ${CHECK_INTERVAL_MS / 1000}s`);
console.log(`[ALERT] -> ${ALERT_URL}`);
intervalHandle = setInterval(checkSeats, CHECK_INTERVAL_MS);
checkSeats();
