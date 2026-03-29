export async function onRequest(context) {
  const { params } = context;
  const id = params.id;

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing game ID" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Fetch the event root (new ESPN API)
    const eventUrl = `https://sports.core.api.espn.com/v2/sports/basketball/mens-college-basketball/events/${id}?lang=en&region=us`;
    const eventRes = await fetch(eventUrl, { cf: { cacheEverything: true } });

    if (!eventRes.ok) {
      return new Response(JSON.stringify({ error: "ESPN returned 404" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const event = await eventRes.json();

    // 2. Follow the competition reference
    const competitionRef = event.competitions?.[0]?.$ref;
    if (!competitionRef) {
      return new Response(JSON.stringify({ error: "Invalid ESPN event structure" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const compRes = await fetch(competitionRef);
    const competition = await compRes.json();

    // 3. Extract useful sub-endpoints
    const links = competition.links || [];

    const boxscoreLink = links.find(l => l.rel?.includes("boxscore"))?.href;
    const scoringLink = links.find(l => l.rel?.includes("scoringplays"))?.href;
    const linescoreLink = links.find(l => l.rel?.includes("linescore"))?.href;

    // 4. Fetch sub-resources in parallel
    const [boxscore, scoring, linescore] = await Promise.all([
      boxscoreLink ? fetch(boxscoreLink).then(r => r.json()) : null,
      scoringLink ? fetch(scoringLink).then(r => r.json()) : null,
      linescoreLink ? fetch(linescoreLink).then(r => r.json()) : null,
    ]);

    // 5. Build final response object
    const result = {
      event,
      competition,
      boxscore,
      scoring,
      linescore,
    };

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
