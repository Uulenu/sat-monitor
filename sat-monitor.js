const URL =
  "https://aru-test-center-search.collegeboard.org/prod/test-centers?date=2026-05-02&country=MN";

const ALERT_URL = "https://ntfy.sh/sat-mn-alert";

let lastState = false;

async function checkSeats() {
  try {
    const res = await fetch(URL);
    const data = await res.json();

    const availableCenters = data.filter(
      (c) => c.seatAvailability === true
    );

    const isAvailable = availableCenters.length > 0;

    console.log(`[CHECK] ${new Date().toISOString()} → ${isAvailable}`);

    // trigger only on change false → true
    if (isAvailable && !lastState) {
      console.log("🚨 SAT SEAT AVAILABLE!");

      await fetch(ALERT_URL, {
        method: "POST",
        body: JSON.stringify(availableCenters, null, 2),
      });
    }

    lastState = isAvailable;
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

setInterval(checkSeats, 60 * 1000);
checkSeats();
