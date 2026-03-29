// redeploy x3
export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const date = url.searchParams.get("date");

    if (!date) {
      return new Response(
        JSON.stringify({ error: "Missing ?date=YYYY-MM-DD" }),
        { status: 400 }
      );
    }

    // ESPN requires YYYYMMDD format
    const compactDate = date.replace(/-/g, "");

    // --- Upstream URLs ---
    const REGULAR_URL =
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${compactDate}`;

    const TOURNAMENT_URL =
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${compactDate}&groups=50`;

    // --- Fetch both in parallel ---
    const [regularRes, tourneyRes] = await Promise.all([
      fetch(REGULAR_URL),
      fetch(TOURNAMENT_URL)
    ]);

    const regularJSON = regularRes.ok ? await regularRes.json() : { events: [] };
    const tourneyJSON = tourneyRes.ok ? await tourneyRes.json() : { events: [] };

    // ESPN uses "events" array for games
    const regularGames = regularJSON.events || [];
    const tourneyGames = tourneyJSON.events || [];

    // --- Merge + dedupe by ESPN game ID ---
    const mergedMap = new Map();

    for (const g of [...regularGames, ...tourneyGames]) {
      if (g?.id) mergedMap.set(g.id, g);
    }

    const mergedGames = Array.from(mergedMap.values());

    return new Response(
      JSON.stringify({
        date,
        count: mergedGames.length,
        games: mergedGames
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error", details: err.message }),
      { status: 500 }
    );
  }
}
