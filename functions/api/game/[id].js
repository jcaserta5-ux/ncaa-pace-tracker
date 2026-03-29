export async function onRequest(context) {
  const { params } = context;
  const id = params.id;

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing game ID" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // ---------------------------------------------------------
    // 1. TRY ESPN V2 (Gamecast-level data)
    // ---------------------------------------------------------
    const v2Url = `https://sports.core.api.espn.com/v2/sports/basketball/mens-college-basketball/events/${id}?lang=en&region=us`;
    const v2Res = await fetch(v2Url, { cf: { cacheEverything: true } });

    if (v2Res.ok) {
      const event = await v2Res.json();

      // Follow competition reference
      const competitionRef = event.competitions?.[0]?.$ref;
      if (competitionRef) {
        const compRes = await fetch(competitionRef);
        const competition = await compRes.json();

        const links = competition.links || [];

        const boxscoreLink = links.find(l => l.rel?.includes("boxscore"))?.href;
        const scoringLink = links.find(l => l.rel?.includes("scoringplays"))?.href;
        const linescoreLink = links.find(l => l.rel?.includes("linescore"))?.href;

        const [boxscore, scoring, linescore] = await Promise.all([
          boxscoreLink ? fetch(boxscoreLink).then(r => r.json()) : null,
          scoringLink ? fetch(scoringLink).then(r => r.json()) : null,
          linescoreLink ? fetch(linescoreLink).then(r => r.json()) : null,
        ]);

        return new Response(
          JSON.stringify({
            source: "espn-v2",
            event,
            competition,
            boxscore,
            scoring,
            linescore,
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // ---------------------------------------------------------
    // 2. FALLBACK: ESPN OLD SUMMARY API (covers ALL games)
    // ---------------------------------------------------------
    const oldUrl = `https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${id}`;
    const oldRes = await fetch(oldUrl, { cf: { cacheEverything: true } });

    if (oldRes.ok) {
      const summary = await oldRes.json();

      return new Response(
        JSON.stringify({
          source: "espn-legacy",
          summary,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // ---------------------------------------------------------
    // 3. If both fail, return error
    // ---------------------------------------------------------
    return new Response(JSON.stringify({ error: "Game not found in ESPN APIs" }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
