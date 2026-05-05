# Flag & Capital Quiz

[Live GitHub Pages site](https://tiernanscullyise.github.io/Flag-Game/)

A geography quiz with two front ends:

- **GitHub Pages static site**: browser-based flag and capital quizzes, revision lists, hard mode, streaks and speedrun leaderboards.
- **Tkinter desktop app**: the same quiz modes and persistence model using local text files.

## Features

- Flag quiz and capital quiz.
- Normal multiple-choice mode and hard typed-answer mode.
- Continent filters plus separate flag and capital revision lists.
- Current streak, per-mode high streak and best session percentage.
- Shared speedrun leaderboard support through Supabase, with local fallback and PB-only opt-in posting.
- Dedicated leaderboard page showing the top five runs per speedrun category.
- Expandable leaderboard entries with route, split and validation details.
- Admin moderation page for pending or rejected shared runs.
- Server-validated leaderboard submissions using Supabase Edge Functions, row-level security and database-side integrity checks.
- "Next", "Last" and "Give Up" session controls.
- Direct FlagCDN image loading through a complete local alpha-2 country-code map.

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
- `supabase/leaderboard.sql`: database table, indexes and row-level security policies for the shared leaderboard.
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

GitHub Pages is static, so it cannot store shared scores by itself. The web app now supports a shared Supabase leaderboard:

1. Create a free Supabase project.
2. Open Supabase SQL Editor and run `supabase/leaderboard.sql`. Re-run it after updates; it is idempotent and includes the required anon `select`/`insert` grants.
3. In Supabase Project Settings > API, copy the Project URL and the public browser key (`anon public` or `publishable` key).
4. Paste them into `leaderboard-config.js`:

```js
window.LEADERBOARD_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_PUBLIC_KEY",
  tableName: "speedrun_leaderboard",
  submitFunctionUrl: "",
  adminFunctionUrl: ""
};
```

Only commit the public browser key. Never put the `service_role` key in this repository. If the config is blank, speedrun records stay local in the current browser. Completed speedruns are posted only when they are a personal best for that exact category and the player chooses to submit them.

Posted runs include route order, splits and anti-cheat telemetry. The leaderboard page shows the top five by default; expand a run to inspect route details.

If Supabase reports a missing `route`, `telemetry` or `anti_cheat` column after an update, re-run `supabase/leaderboard.sql`; it ends with a PostgREST schema-cache reload.

For stronger anti-cheat, deploy `supabase/functions/submit-speedrun`, set `submitFunctionUrl` to that function URL, then run `supabase/harden-leaderboard.sql`. That moves inserts behind server-side validation and removes public direct table inserts. If you later re-run `supabase/leaderboard.sql`, re-run `supabase/harden-leaderboard.sql` afterwards.

`admin.html` uses `supabase/functions/admin-leaderboard` and an `ADMIN_PASSWORD` Supabase secret. The password is not stored in the repository. Public leaderboard queries only show `approved` rows; suspicious submissions are saved as `pending` for review.

## Anti-Cheat Approach

The leaderboard is designed for a public-source static app, so the browser is treated as untrusted. The system uses layered checks rather than relying on any single client-side signal:

- Direct public table inserts are revoked after deployment hardening.
- Submissions go through an Edge Function that recomputes category, route, answer, timing and score consistency before writing to the database.
- Client anti-cheat telemetry is stored as evidence, but the server produces its own validation result.
- Database constraints, a replay-resistant telemetry nonce and an insert trigger provide a second line of defence if the server write path regresses.
- Borderline but structurally valid runs are queued for admin moderation instead of being published immediately.
- Player-name moderation uses private server-side review terms; flagged names are saved for admin approval rather than published directly.
- Admin moderation is protected by a server-side password check and database-backed failed-login lockout.
- Approved public reads are separated from pending/rejected moderation data.

This is suitable for a casual public leaderboard. Because a public browser app cannot fully hide quiz data or stop real-browser automation, determined attackers can still cheat. Do not use it for prizes without stronger authentication and moderation.

## Run the Desktop Version

```bash
pip install -r requirements.txt
python flag.py
```

The desktop app reads the same country data as the web app, so data changes should be made in `data.js`.
