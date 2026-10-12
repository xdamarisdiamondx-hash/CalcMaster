/* CalcMaster — Runtime Configuration
   ---------------------------------------------------------------
   WHERE TO PUT THE API KEY

   PREFERRED: the `.env` file (CURRENCY_API_KEY=...).
   server.ps1 reads it and serves rates through the local
   /api/rates proxy, so the key stays on your machine and never
   reaches a browser. This is the only method that works with
   exchangerate-api keys, because their keyed v6 endpoint sends
   no CORS headers and is therefore unreachable from JavaScript.

   ALTERNATIVE: `apiKey` below, for builds served behind your own
   CORS-enabled proxy. Uses the same v6 URL shape.

   If neither is set the app still works: it falls back to the
   keyless exchangerate-api endpoint, then frankfurter.app, then
   the cached offline snapshot.

   >>> SECURITY NOTICE <<<
   Anything placed in this file is readable by anyone who opens
   the app (view-source / Network tab). Treat it as public:
     - never put a paid or shared secret here,
     - rotate the key from your dashboard if you see abuse.
   Prefer .env + the proxy for a key you want to keep private.

   ESP / Espees is a fixed in-app currency (1 ESP = 2,050 NGN) and
   is deliberately NEVER taken from any API.
   ---------------------------------------------------------------
*/
window.CALC_CONFIG = {

  currency: {
    /* Display name shown in the rate status pill / toasts */
    provider: 'exchangerate-api.com',

    /* -------------------------------------------------------
       PASTE YOUR KEY BETWEEN THE QUOTES
       Leave empty ('') to disable the provider and fall back
       to the keyless frankfurter.app endpoint, then to cache.
    ------------------------------------------------------- */
    apiKey: '',

    /* Request template. {key} and {base} are substituted at
       request time and URL-encoded automatically.

       v6 (keyed, current):  https://v6.exchangerate-api.com/v6/{key}/latest/{base}
       v4 (keyless, older):  https://api.exchangerate-api.com/v4/latest/{base}
    */
    endpoint: 'https://v6.exchangerate-api.com/v6/{key}/latest/{base}',

    /* Abort the request after this many milliseconds */
    timeoutMs: 8000
  }
};
