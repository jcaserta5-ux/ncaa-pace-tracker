export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const dateParam = url.searchParams.get("date"); // "YYYY-MM-DD"

    if (!dateParam || dateParam.length !== 10) {
      return new Response(JSON.stringify({ error: "Missing or invalid date parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Frontend uses "YYYY-MM-DD"
    const targetDate = dateParam; // keep this for filtering

    // ESPN expects "YYYYMMDD"
    const espnDate = dateParam.replace(/-/g, ""); // "YYYYMMDD"

    const espnUrl =
      `https://site.web.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${espnDate}`;

    const espnRes = await fetch(espnUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!espnRes.ok) {
      // Fail soft: return empty games so UI doesn't blow up
      return new Response(JSON.stringify({ games: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const espnData = await espnRes.json();
    const events = espnData.events || [];

    // ⭐ STRICT DATE FILTER: only games that START on the requested date
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
    // Fail soft here too
    return new Response(JSON.stringify({ games: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
