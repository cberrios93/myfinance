// Vercel Edge Function — proxy para Rextie (evita CORS desde el browser)
export const config = { runtime: 'edge' }

export default async function handler() {
  try {
    const res = await fetch('https://app.rextie.com/api/v1/fxrates/rate/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ source_currency: 'USD', target_currency: 'PEN', source_amount: 1 }),
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Rextie error ${res.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'fetch failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
