import type { VercelRequest, VercelResponse } from '@vercel/node';
const BASE = 'https://financialmodelingprep.com/stable';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const seg = req.query.path;
    const tail = Array.isArray(seg) ? seg.join('/') : String(seg || '');
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'path' || k === 'apikey') continue;
      Array.isArray(v) ? v.forEach(x => qs.append(k, String(x))) : qs.append(k, String(v));
    }
    qs.set('apikey', process.env.FMP_API_KEY ?? '');

    const url = `${BASE}/${tail}${qs.toString() ? `?${qs}` : ''}`;
    const upstream = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'vercel-func' } });
    const body = await upstream.text();

    res
      .status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20')
      .send(body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'FMP proxy error' });
  }
}
