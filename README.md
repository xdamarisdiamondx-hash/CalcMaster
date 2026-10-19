# CalcMaster

Calculator, unit converter and currency converter (NGN/USD/EUR/GBP + **Espees (ESP)**) — a static
web app that also ships as an Android APK.

## Run locally

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File server.ps1
```

Opens <http://localhost:8000/>. (`npm run serve` does the same.)

## Currency rates & API key

Rates are fetched in this order — the app works even with **no** key:

1. **Local proxy** `GET /api/rates` — `server.ps1` reads `CURRENCY_API_KEY` from `.env`
2. Key from `config.js` (only usable behind a CORS-enabled proxy)
3. Keyless `api.exchangerate-api.com/v4/latest/USD`
4. `api.frankfurter.app`
5. Cached/offline snapshot on the device

To use your own key, paste it in **`.env`**:

```
CURRENCY_API_KEY=your_key_here
```

`.env` is git-ignored and **never served** (`server.ps1` blocks `.env`, dotfiles, path traversal and
`.ps1`). The key stays server-side; this is required because exchangerate-api's keyed `v6` endpoint
sends no CORS headers, so a browser can never call it directly.

**On Vercel:** add `CURRENCY_API_KEY` in Project → Settings → Environment Variables. `api/rates.js`
is the serverless twin of the local proxy and returns the same envelope.

> ESP is a fixed in-app currency (1 ESP = 2,050 NGN) and is never taken from any API.

## Deploy

Push to `main` → Vercel builds and deploys automatically.

```powershell
git add -A
git commit -m "Your message"
git push origin main
```

## Build the Android APK

Requirements: Node.js, the Android SDK (`%LOCALAPPDATA%\Android\Sdk`) and **JDK 21+**
(Capacitor 7 compiles with `--release 21`).

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-apk.ps1
```

Output: **`dist\CalcMaster.apk`** — copy it to an Android phone and open it (allow
"install from unknown sources"). Use `-Variant release` for a release build (unsigned until you add
signing config).

What the script does:

| step | script | purpose |
|---|---|---|
| web bundle | `scripts/build-web.mjs` | copies only runtime files into `www/` (never `.env`) |
| native sync | `npx cap sync android` | pushes `www/` into the Android project |
| branding | `scripts/make-android-icons.ps1`, `scripts/make-android-splash.ps1` | orange launcher icons (adaptive + legacy) and splash |
| package | `gradlew assembleDebug` | compiles the APK |

`www/`, `android/` and `dist/` are generated and git-ignored; regenerate at any time with the script
above (first run re-creates `android/` via `npx cap add android`).

## Project layout

```
index.html        app shell + inline SVG icon sprite (24 symbols)
app.js            navigation, status pill, icon helpers
calculator.js     calculator engine
currency.js       rates, fetch chain, ESP peg, bookmarks
unit.js           unit converter
history.js        history persistence
audio.js          click/sound feedback
config.js         optional direct API key (see above)
server.ps1        local server + /api/rates proxy
api/rates.js      Vercel serverless twin of that proxy
```
