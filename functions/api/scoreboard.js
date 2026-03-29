export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const dateParam = url.searchParams.get("date");

    if (!dateParam) {
      return new Response(JSON.stringify({ error: "Missing date parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // ESPN endpoint (NCAA Men's Basketball)
    const espnUrl =
      `https://site.web.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateParam}`;

    const espnRes = await fetch(espnUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!espnRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch ESPN" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const espnData = await espnRes.json();

    // ESPN returns events in a multi-day window — we must filter manually
    const events = espnData.events || [];

    // Normalize requested date
    const targetDate = dateParam; // already YYYY-MM-DD

    // ⭐ STRICT DATE FILTER
    const filtered = events.filter(event => {
      if (!event.date) return false;
      const eventDate = event.date.slice(0, 10); // "YYYY-MM-DD"
      return eventDate === targetDate;
    });

    return new Response(JSON.stringify({ games: filtered }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
