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

      // ---------------------------------------------------------
      // UNIFIED FORMAT (V2)
      // ---------------------------------------------------------
      const unified = {
        source: "espn-v2",
        id,
        status: competition.status?.type?.name || null,
        startTime: competition.date || null,
        teams: competition.competitors?.map(c => ({
          id: c.id,
          homeAway: c.homeAway,
          score: c.score,
          winner: c.winner,
          team: {
            id: c.team?.id,
            name: c.team?.displayName,
            abbreviation: c.team?.abbreviation,
            color: c.team?.color,
            alternateColor: c.team?.alternateColor,
            logo: c.team?.logo,
          }
        })) || [],
        boxscore,
        scoring,
        linescore
      };

      return new Response(JSON.stringify(unified), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---------------------------------------------------------
    // 2. FALLBACK: ESPN LEGACY SUMMARY API
    // ---------------------------------------------------------
    const oldUrl = `https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${id}`;
    const oldRes = await fetch(oldUrl, { cf: { cacheEverything: true } });

    if (oldRes.ok) {
      const summary = await oldRes.json();

      // Extract teams
      const teams = summary.boxscore?.teams?.map(t => ({
        id: t.team?.id,
        homeAway: t.homeAway,
        score: t.score,
        winner: t.winner,
        team: {
          id: t.team?.id,
          name: t.team?.displayName,
          abbreviation: t.team?.abbreviation,
          color: t.team?.color,
          alternateColor: t.team?.alternateColor,
          logo: t.team?.logo,
        }
      })) || [];

      // ---------------------------------------------------------
      // UNIFIED FORMAT (LEGACY)
      // ---------------------------------------------------------
      const unified = {
        source: "espn-legacy",
        id,
        status: summary.header?.competitions?.[0]?.status?.type?.name || null,
        startTime: summary.header?.competitions?.[0]?.date || null,
        teams,
        boxscore: summary.boxscore || null,
        scoring: summary.scoringPlays || null,
        linescore: summary.header?.competitions?.[0]?.competitors || null
      };

      return new Response(JSON.stringify(unified), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---------------------------------------------------------
    // 3. If both fail
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
