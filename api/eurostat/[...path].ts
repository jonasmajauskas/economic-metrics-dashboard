import type { VercelRequest, VercelResponse } from '@vercel/node';
const PREFIX = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const seg = req.query.path;
    const tail = Array.isArray(seg) ? seg.join('/') : String(seg || '');
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'path') continue;
      Array.isArray(v) ? v.forEach(x => qs.append(k, String(x))) : qs.append(k, String(v));
    }
    const url = `${PREFIX}/${tail}${qs.toString() ? `?${qs}` : ''}`;

    const upstream = await fetch(url, { headers: { 'User-Agent': 'vercel-func' } });
    const body = await upstream.text();

    res
      .status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')
      .send(body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Eurostat proxy error' });
  }
}
