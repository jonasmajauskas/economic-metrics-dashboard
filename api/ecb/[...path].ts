import type { VercelRequest, VercelResponse } from '@vercel/node';
const BASE = 'https://data-api.ecb.europa.eu';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const seg = req.query.path;
    const tail = Array.isArray(seg) ? seg.join('/') : String(seg || '');
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'path') continue;
      Array.isArray(v) ? v.forEach(x => qs.append(k, String(x))) : qs.append(k, String(v));
    }
    const url = `${BASE}/${tail}${qs.toString() ? `?${qs}` : ''}`;

    const upstream = await fetch(url, { headers: { 'User-Agent': 'vercel-func' } });
    const body = await upstream.text();

    res
      .status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
      .send(body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'ECB proxy error' });
  }
}
