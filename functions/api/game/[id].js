export async function onRequest(context) {
  const { params } = context;
  const gameId = params.id;

  const url = `https://site.web.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/summary?event=${gameId}`;

  const res = await fetch(url);
  if (!res.ok) {
    return new Response(JSON.stringify({ error: `ESPN returned ${res.status}` }), {
      status: res.status,
      headers: { "Content-Type": "application/json" }
    });
  }

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}
