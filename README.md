# Flag & Capital Quiz

[Live GitHub Pages site](https://tiernanscullyise.github.io/Flag-Game/)

A geography quiz with two front ends:

- **GitHub Pages static site**: browser-based country and regional flag, capital and map quizzes, revision lists, hard mode, streaks and speedrun leaderboards.
- **Tkinter desktop app**: the same quiz modes and persistence model using local text files.

## Features

- Flag quiz, capital quiz and a typed country-map mode.
- Regional quiz mode for Ireland's 32 counties, Ireland as Gaeilge, England, Scotland, Wales, the 50 US states, and generated region sets for 193 more countries, with administrative centres, typed list maps, and verified real flags where source data exists.
- Normal multiple-choice mode and hard typed-answer mode.
- World-map mode highlights solved countries with flag fills and includes zoomed inset panels for compact regions.
- Continent filters plus separate flag and capital revision lists.
- Current streak, per-mode high streak and best session percentage.
- Shared speedrun leaderboard support through Supabase, with local fallback and PB-only opt-in posting.
- Dedicated leaderboard page showing the top five runs per speedrun category.
- Expandable leaderboard entries with route, split and validation details.
- Admin moderation page for pending or rejected shared runs.
- Server-validated leaderboard submissions using Supabase Edge Functions, row-level security and database-side integrity checks.
- "Next", "Last" and "Give Up" session controls.
- Direct FlagCDN image loading through a complete local alpha-2 country-code map.
- Country outline rendering uses Natural Earth-derived `world-atlas` TopoJSON from jsDelivr.

## Architecture Highlights

- Static GitHub Pages frontend with no build step.
- Shared browser/desktop quiz data model: the desktop app reads from `data.js` through `flag_data.py`.
- Supabase-backed competitive speedrun leaderboard for a static site.
- Edge Function submission path keeps privileged database writes off the client.
- Public reads are separated from private moderation writes through RLS and service-role Edge Functions.
- PB-only opt-in posting keeps local practice private while still supporting shared competition.
- Admin review workflow for suspicious or borderline submissions.
- Local fallback keeps the game usable when shared leaderboard configuration is absent or unavailable.

## Project Structure

- `index.html`, `game.html`, `leaderboard.html`, `admin.html`, `revise.html`, `view.html`: GitHub Pages entry points.
- `style.css`: shared responsive web styling.
- `data.js`: canonical browser data for countries, capitals, continents, aliases and flag codes.
- `regions-generated-data.js`: generated country-region quiz sets accepted only when source metadata and map boundaries match cleanly.
- `regions-data.js`: county/state quiz data for regional mode, including the fada-sensitive Ireland as Gaeilge set.
- `region-map.js`: regional boundary rendering for county/state maps.
- `region-source-report.json`: generation report listing included and skipped regional sets with reasons.
- `scripts/build-region-groups.js`: reproducible generator for additional regional quiz data.
- `utils.js`, `game.js`, `leaderboard.js`, `leaderboard-page.js`, `revise.js`, `view.js`: active browser logic.
- `leaderboard-config.js`: public Supabase configuration for shared speedrun records.
- Supabase schema, Edge Functions and anti-cheat implementation live in a private server repository, not this public repo.
- `flag_data.py`: desktop data bridge that reads `data.js`.
- `flag.py`: Tkinter desktop app.
- `revise_flags.txt`, `revise_capitals.txt`, `high_scores.txt`, `session_percentages.txt`: desktop persistence files.

## Run the Web Version Locally

Use any static file server from the repository root, then open the printed local URL.

```bash
python -m http.server 8000
```

The web version can also be served directly by GitHub Pages from the repo root.

## Regional Data Generation

The generated regional quiz bundle currently includes 193 country-level region sets. Monaco and Vatican City are intentionally excluded at this quiz level because the available first-level boundary source has fewer than two usable regions. England, Scotland and Wales are maintained as manual regional sets because they are not separate countries in the main country data.

Run this from the repository root to refresh the generated bundle:

```powershell
npm.cmd run regions:build
```

To gather data without changing the app bundle, run:

```powershell
npm.cmd run regions:scan
```

The scan uses `.region-cache/` for successful Wikidata, GeoNames and GeoBoundaries responses, writes progress and ETA to the terminal, and updates `region-source-report.json` with included, skipped and pending countries. If it stops because of a request budget or rate limit, wait for the service to recover and rerun the same command; cached responses will be reused.

Useful generator commands:

```powershell
npm.cmd run regions:limits
node scripts\build-region-groups.js --report-only --max-requests 120
node scripts\build-region-groups.js --country "Spain" --report-only
node scripts\build-region-groups.js --country "Spain" --report-only --wikidata-admin-fallback
npm.cmd run regions:check-maps
```

The generator includes a country when it can build a first-level regional set with names, administrative centres and matching map boundaries. It uses Wikidata subdivision/ISO-code rows for verified regional flags, GeoNames ADM1/PPLA dumps as an administrative-centre fallback, and GeoBoundaries ADM1 outlines from `gbOpen` with `gbHumanitarian` as a boundary fallback. If verified flags are missing, the country still appears for town and map modes; flag mode uses only regions with real flag assets and never fabricates region flags. Skipped countries and reasons are written to `region-source-report.json`. Wikidata's public query service documents a 60-second query timeout, 60 seconds of processing time per 60 seconds per client, 30 error queries per minute, and 5 parallel queries per IP. The default build avoids the slower per-country Wikidata label fallback; use `--wikidata-admin-fallback` only for focused investigation. The script runs sequentially, sends an identifiable user agent, records any `429` responses, and waits for the service's `Retry-After` header before retrying. GeoBoundaries documents its API shape and pre-cached metadata, but does not publish a numeric per-minute quota.

## Local Checks

Run the lightweight data, wiring and syntax checks from the repository root:

```powershell
npm.cmd test
```

For browser-level smoke tests, install the dev dependencies and Playwright browsers once, then run:

```powershell
npm.cmd install
npx.cmd playwright install
npm.cmd run test:browser
```

Playwright is only test tooling. It is not loaded by the live static site and does not affect runtime performance.

## Shared Speedrun Leaderboard

GitHub Pages is static, so shared speedrun records and private learning analytics are handled by Supabase. The browser-facing project URL, public browser key and function URLs live in `leaderboard-config.js`.

The Supabase schema, Edge Functions, admin validation and anti-cheat rules are intentionally kept out of this public repository. Deploy them from the private server repository only.

```js
window.LEADERBOARD_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_PUBLIC_KEY",
  tableName: "speedrun_leaderboard",
  submitFunctionUrl: "https://YOUR_PROJECT.supabase.co/functions/v1/submit-speedrun",
  analyticsFunctionUrl: "https://YOUR_PROJECT.supabase.co/functions/v1/submit-analytics",
  adminFunctionUrl: "https://YOUR_PROJECT.supabase.co/functions/v1/admin-leaderboard"
};
```

Only commit the public browser key. Never put the `service_role` key, admin password or private function secrets in this repository. If the config is blank, speedrun records stay local in the current browser. Completed speedruns are posted to the public leaderboard only when they are a personal best for that exact category and the player chooses to submit them.

Posted runs include private route order, splits and anti-cheat telemetry for server/admin review. The public leaderboard reads only simple approved result columns.

Completed speedruns are also submitted automatically to the private `speedrun_analytics` table through `submit-analytics`. The browser keeps a capped local retry queue, so temporary upload failures are retried later. Analytics records include per-run context, per-question render/input/submit timings, raw attempts, accepted aliases, autocomplete/shortcut usage, typed-vs-canonical character counts, WPM variants, correction time, region breakdowns, mastery labels, device ID, submitted leaderboard names and quality flags. These records are private educational data and are available only through the admin function. The post-game summary can show the current browser's own local device progress without exposing anyone else's records.

`admin.html` uses a private Supabase admin function and an `ADMIN_PASSWORD` Supabase secret. The password is not stored in the repository. All new submissions are saved as `pending`; only an explicit admin approval makes a run public. After unlocking the page, admins can filter all, pending, approved or rejected runs, narrow by age or search terms, identify matching run evidence, and bulk-reject selected records. Moderation updates the loaded view locally instead of downloading the full queue after every decision. The same page can load private analytics records for educational review.

## Anti-Cheat Approach

The leaderboard is designed for a public-source static app, so the browser is treated as untrusted. The private server implementation uses layered checks rather than relying on any single client-side signal:

- Direct public table inserts are revoked by the default SQL setup.
- Submissions go through an Edge Function that recomputes category, route, answer, timing and score consistency before writing to the database.
- Client telemetry is stored as evidence, but the browser does not decide whether a run is valid for the shared leaderboard.
- Database constraints, a server-generated evidence fingerprint, duplicate detection and an insert trigger provide a second line of defence if the server write path regresses.
- Every structurally valid run is queued for admin moderation instead of being published automatically.
- Player-name moderation uses private server-side review terms; flagged names are saved for admin approval rather than published directly.
- Submission limits are enforced independently against network and player identifiers so changing a browser-controlled identifier does not reset the network limit.
- Admin moderation is protected by a server-side password check and database-backed, network-keyed failed-login lockout.
- Approved public reads are separated from pending/rejected moderation data.

Because a public browser app cannot fully hide quiz data or stop real-browser automation, determined attackers can still cheat. Keep the server validation code private, use admin moderation for suspicious records, and avoid prize-backed competition without stronger authentication.

## Run the Desktop Version

```bash
pip install -r requirements.txt
python flag.py
```

The desktop app reads the same country data as the web app, so data changes should be made in `data.js`.
