# Repository Guidelines

## Project Structure & Module Organization

This repository contains a flag and capital quiz with two front ends. The static web app is served from the repo root: `index.html`, `game.html`, `leaderboard.html`, `admin.html`, `revise.html`, and `view.html` are page entry points; `style.css` is shared styling; `game.js`, `leaderboard.js`, `leaderboard-page.js`, `admin.js`, `revise.js`, `view.js`, and `utils.js` hold browser behavior. `data.js` is the canonical quiz data source. `leaderboard-config.js` holds public Supabase settings. Supabase schema, Edge Functions, admin validation, and anti-cheat implementation belong in a private server repository and must not be committed here. The desktop app lives in `flag.py` and reads shared data through `flag_data.py`. Local desktop persistence files such as `high_scores.txt`, `revise_flags.txt`, and `session_percentages.txt` are ignored by Git.

## Build, Test, and Development Commands

- `python -m http.server 8000`: serve the web version locally from the repository root, then open `http://127.0.0.1:8000/index.html`.
- `npm.cmd install`: install JavaScript dev dependencies, including the local Playwright test runner.
- `npx.cmd playwright install chromium`: install the Playwright Chromium browser binary if browser tests report a missing executable.
- `npm.cmd test`: run data validation, JavaScript smoke checks, and Python syntax checks.
- `npm.cmd run test:browser`: run Playwright browser page checks.
- `pip install -r requirements.txt`: install desktop dependencies (`requests`, `Pillow`).
- `python flag.py`: run the Tkinter desktop application.
- `python -m py_compile flag.py flag_data.py`: quick syntax check for Python changes.

There is no build step for the static site.

## Coding Style & Naming Conventions

Use 4-space indentation for Python and existing JavaScript indentation patterns. Python functions and variables use `snake_case`; JavaScript constants use `UPPER_SNAKE_CASE`, while functions and local variables use `camelCase`. Keep shared quiz data changes in `data.js`; update `flag_data.py` only when the parsing bridge or validation behavior changes. Prefer small, focused functions and avoid adding dependencies unless they simplify a real project concern.

## Testing Guidelines

For web changes, run `npm.cmd test`. For rendered UI or browser-flow changes, run `npm.cmd run test:browser`; if Playwright is missing, run `npm.cmd install`, and if the browser executable is missing, run `npx.cmd playwright install chromium`, then rerun the browser tests. Also run the static server and manually exercise normal mode, hard mode, revision lists, continent filters, lives, speedrun mode, and persistence in `localStorage` for substantial gameplay changes. For desktop changes, run `python flag.py` and verify flag loading, typed answers, multiple-choice flow, and ignored local `.txt` persistence. Run `python -m py_compile flag.py flag_data.py` after Python edits.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `Add speedrun mode and practice lives` and `Refactor quiz interface and add new revision and view pages`. Follow that style: one concise subject line describing the user-visible or structural change. Pull requests should include a brief summary, manual test steps, linked issue if applicable, and screenshots or screen recordings for UI changes across the web or desktop app.

## Agent-Specific Instructions

Do not commit generated local state files, Supabase `service_role` secrets, Supabase SQL, or Supabase Edge Function source. Preserve the shared-data model: browser and desktop behavior should stay aligned through `data.js`.

For Supabase Edge Functions, check whether `leaderboard-config.js` uses a legacy anon JWT or a `sb_publishable_...` key. Publishable keys are not JWTs, so browser requests must not send them as `Authorization: Bearer ...`, and functions that accept public browser requests must be deployed with `--no-verify-jwt`.

If `deno` is missing in this environment, try `C:\Users\User\.deno\bin\deno.exe`. If `supabase projects list` reports that no access token is provided, do not guess: ask the user to run `supabase login` locally or persist their existing terminal token as a user environment variable.

When Supabase deployment is needed and the user's normal PowerShell is already authenticated, prefer running the deployment with `sandbox_permissions: "require_escalated"` so it uses the local Supabase auth context instead of stopping at pasteable commands. Use the ignored private Supabase source path, for example `.private-supabase-backup\supabase`, or the private server repository; never re-add Supabase SQL or Edge Function source to this public repository. If `admin_password.txt` exists locally, it may be read for setting the `ADMIN_PASSWORD` secret, but never print the password or commit that file.

When local tooling is missing but the remedy is clear, fix it before handing work back. Examples: run `npm.cmd install` when local Node dev dependencies are absent, run `npx.cmd playwright install chromium` when Playwright reports a missing browser executable, and retry Supabase CLI/deploy commands through the escalated local PowerShell route when sandboxing blocks network access or local auth. Do not ask the user to paste secrets, and do not store credentials in the repository.

If browser verification of map or flag rendering fails with CDN/network errors such as `ERR_NETWORK_ACCESS_DENIED`, rerun the focused browser check with `sandbox_permissions: "require_escalated"` before treating it as an application regression.
