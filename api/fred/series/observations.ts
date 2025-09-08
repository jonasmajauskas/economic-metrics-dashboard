import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE = 'https://api.stlouisfed.org/fred/series/observations';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'api_key') continue;
      Array.isArray(v) ? v.forEach(x => qs.append(k, String(x))) : qs.append(k, String(v));
    }
    qs.set('api_key', process.env.FRED_API_KEY ?? '');
    if (!qs.get('file_type')) qs.set('file_type', 'json');

    const url = `${BASE}?${qs.toString()}`;
    const upstream = await fetch(url, { headers: { 'User-Agent': 'vercel-func' } });
    const body = await upstream.text();

    res
      .status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
      .send(body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'FRED proxy error' });
  }
}
