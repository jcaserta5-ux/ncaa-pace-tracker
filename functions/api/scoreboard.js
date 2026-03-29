export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Query params: ?sport=basketball-men&division=d1&date=2025-03-21
  const sport = url.searchParams.get('sport') || 'basketball-men';
  const division = url.searchParams.get('division') || 'd1';
  const date = url.searchParams.get('date'); // YYYY-MM-DD

  let yyyy, mm, dd;

  if (date) {
    [yyyy, mm, dd] = date.split('-');
  } else {
    const now = new Date();
    yyyy = now.getFullYear().toString();
    mm = String(now.getMonth() + 1).padStart(2, '0');
    dd = String(now.getDate()).padStart(2, '0');
  }

  const upstream = `https://data.ncaa.com/casablanca/scoreboard/${sport}/${division}/${yyyy}/${mm}/${dd}/scoreboard.json`;

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

  const data = await res.text(); // pass-through
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
