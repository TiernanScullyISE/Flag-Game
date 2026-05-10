# Flag & Capital Quiz

[Live GitHub Pages site](https://tiernanscullyise.github.io/Flag-Game/)

A geography quiz with two front ends:

- **GitHub Pages static site**: browser-based flag, capital and world-map country quizzes, revision lists, hard mode, streaks and speedrun leaderboards.
- **Tkinter desktop app**: the same quiz modes and persistence model using local text files.

## Features

- Flag quiz, capital quiz and a typed country-map mode.
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

Posted runs include route order, splits and anti-cheat telemetry. The leaderboard page shows the top five by default; expand a run to inspect route details.

Completed speedruns are also submitted automatically to the private `speedrun_analytics` table through `submit-analytics`. The browser keeps a capped local retry queue, so temporary upload failures are retried later. Analytics records include timing metrics such as time to first input, typing duration, solve time, WPM, attempts and quality flags; raw wrong answers are not stored. These records are not public and are available only through the admin function.

`admin.html` uses a private Supabase admin function and an `ADMIN_PASSWORD` Supabase secret. The password is not stored in the repository. Public leaderboard queries only show `approved` rows; suspicious submissions are saved as `pending` for review. The same admin page can load private analytics records for educational review.

## Anti-Cheat Approach

The leaderboard is designed for a public-source static app, so the browser is treated as untrusted. The private server implementation uses layered checks rather than relying on any single client-side signal:

- Direct public table inserts are revoked by the default SQL setup.
- Submissions go through an Edge Function that recomputes category, route, answer, timing and score consistency before writing to the database.
- Client telemetry is stored as evidence, but the browser does not decide whether a run is valid for the shared leaderboard.
- Database constraints, a replay-resistant telemetry nonce and an insert trigger provide a second line of defence if the server write path regresses.
- Borderline but structurally valid runs are queued for admin moderation instead of being published immediately.
- Player-name moderation uses private server-side review terms; flagged names are saved for admin approval rather than published directly.
- Admin moderation is protected by a server-side password check and database-backed failed-login lockout.
- Approved public reads are separated from pending/rejected moderation data.

Because a public browser app cannot fully hide quiz data or stop real-browser automation, determined attackers can still cheat. Keep the server validation code private, use admin moderation for suspicious records, and avoid prize-backed competition without stronger authentication.

## Run the Desktop Version

```bash
pip install -r requirements.txt
python flag.py
```

The desktop app reads the same country data as the web app, so data changes should be made in `data.js`.
