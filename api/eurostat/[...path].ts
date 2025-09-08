// api/eurostat/[...path].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const seg = req.query.path;
    const rest = Array.isArray(seg) ? seg.join('/') : (seg || '');
    if (!rest) return res.status(400).json({ error: 'Missing path' });

    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'path') continue;
      if (Array.isArray(v)) v.forEach(x => sp.append(k, x));
      else if (v != null) sp.append(k, String(v));
    }

    const url = `${BASE}/${rest}${sp.toString() ? `?${sp}` : ''}`;
    const r = await fetch(url);
    const body = await r.text();

    res
      .status(r.status)
      .setHeader('Content-Type', r.headers.get('content-type') || 'application/json')
      .send(body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Eurostat proxy error' });
  }
}
