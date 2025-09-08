// api/fred/series/observations.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const fredKey = process.env.FRED_API_KEY;
    const sp = new URLSearchParams();

    // copy client query, but don't allow api_key/file_type from client
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'api_key' || k === 'file_type') continue;
      if (Array.isArray(v)) v.forEach(x => sp.append(k, x));
      else if (v != null) sp.append(k, String(v));
    }
    if (fredKey) sp.set('api_key', fredKey);
    if (!sp.has('file_type')) sp.set('file_type', 'json');

    const url = `https://api.stlouisfed.org/fred/series/observations?${sp.toString()}`;
    const r = await fetch(url);
    const body = await r.text();

    res
      .status(r.status)
      .setHeader('Content-Type', r.headers.get('content-type') || 'application/json')
      .send(body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'FRED proxy error' });
  }
}
