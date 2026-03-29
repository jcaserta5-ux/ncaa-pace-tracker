export async function onRequest(context) {
  const { params } = context;
  const gameId = params.id;

  if (!gameId) {
    return new Response(
      JSON.stringify({ error: 'Missing game id' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const upstream = `https://data.ncaa.com/casablanca/game/${gameId}/game.json`;

  const res = await fetch(upstream, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json,text/plain,*/*',
    },
  });

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: 'Upstream error', status: res.status }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const data = await res.text();
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
