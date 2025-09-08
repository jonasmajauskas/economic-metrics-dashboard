// api/fmp/[...path].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const FMP_BASE = 'https://financialmodelingprep.com/stable';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const seg = req.query.path;
    const rest = Array.isArray(seg) ? seg.join('/') : (seg || '');
    if (!rest) return res.status(400).json({ error: 'Missing FMP path' });

    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'path' || k === 'apikey') continue;
      if (Array.isArray(v)) v.forEach(x => sp.append(k, x));
      else if (v != null) sp.append(k, String(v));
    }
    const key = process.env.FMP_API_KEY;
    if (key) sp.set('apikey', key);

    const url = `${FMP_BASE}/${rest}?${sp.toString()}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'vercel-proxy' } });
    const body = await r.text();

    res
      .status(r.status)
      .setHeader('Content-Type', r.headers.get('content-type') || 'application/json')
      .send(body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'FMP proxy error' });
  }
}
