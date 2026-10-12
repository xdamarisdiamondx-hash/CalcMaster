/* CalcMaster — Vercel serverless proxy for the currency API
   ---------------------------------------------------------------
   Reads CURRENCY_API_KEY from the Vercel project environment
   variables (Project Settings -> Environment Variables), so the
   key is never shipped to the browser.

   This endpoint is required, not optional: exchangerate-api's
   keyed v6 host sends no CORS headers, so browsers cannot call
   it directly even with the key.

   server.ps1 serves the identical envelope at /api/rates for
   local development, so the client code is the same either way:
     { ok:true,  source, payload:{...} }
     { ok:false, source, error }
   ---------------------------------------------------------------
*/
const PROVIDER = 'exchangerate-api.com';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  const key = (process.env.CURRENCY_API_KEY || '').trim();

  // No key configured -> client skips straight to its keyless endpoint
  if (!key) return send(res, 200, { ok: false, source: 'none', error: 'no-key' });

  const url = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(key)}/latest/USD`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const upstream = await fetch(url, { signal: controller.signal });
    const text = await upstream.text();
    clearTimeout(timer);

    if (upstream.ok) {
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (e) {
        return send(res, 200, { ok: false, source: PROVIDER, error: 'bad-payload' });
      }
      return send(res, 200, { ok: true, source: PROVIDER, payload });
    }

    // Classify the failure. The provider answers an unknown key with a
    // plain HTML 404 rather than JSON, so fall back to the status code.
    let error = 'upstream-error';
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed['error-type']) error = parsed['error-type'];
    } catch (e) {
      if (upstream.status === 404) error = 'unsupported-key';
    }

    return send(res, 200, { ok: false, source: PROVIDER, error });
  } catch (e) {
    clearTimeout(timer);
    return send(res, 200, { ok: false, source: PROVIDER, error: 'upstream-error' });
  }
};
