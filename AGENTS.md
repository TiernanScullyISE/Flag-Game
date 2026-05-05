# Repository Guidelines

## Project Structure & Module Organization

This repository contains a flag and capital quiz with two front ends. The static web app is served from the repo root: `index.html`, `game.html`, `leaderboard.html`, `admin.html`, `revise.html`, and `view.html` are page entry points; `style.css` is shared styling; `game.js`, `leaderboard.js`, `leaderboard-page.js`, `admin.js`, `revise.js`, `view.js`, and `utils.js` hold browser behavior. `data.js` is the canonical quiz data source. `leaderboard-config.js` holds public Supabase settings, `supabase/leaderboard.sql` defines the shared table, and `supabase/functions/` contains Edge Functions. The desktop app lives in `flag.py` and reads shared data through `flag_data.py`. Local desktop persistence files such as `high_scores.txt`, `revise_flags.txt`, and `session_percentages.txt` are ignored by Git.

## Build, Test, and Development Commands

- `python -m http.server 8000`: serve the web version locally from the repository root, then open `http://127.0.0.1:8000/index.html`.
- `pip install -r requirements.txt`: install desktop dependencies (`requests`, `Pillow`).
- `python flag.py`: run the Tkinter desktop application.
- `python -m py_compile flag.py flag_data.py`: quick syntax check for Python changes.

There is no build step for the static site.

## Coding Style & Naming Conventions

Use 4-space indentation for Python and existing JavaScript indentation patterns. Python functions and variables use `snake_case`; JavaScript constants use `UPPER_SNAKE_CASE`, while functions and local variables use `camelCase`. Keep shared quiz data changes in `data.js`; update `flag_data.py` only when the parsing bridge or validation behavior changes. Prefer small, focused functions and avoid adding dependencies unless they simplify a real project concern.

## Testing Guidelines

No automated test suite is currently configured. For web changes, run the static server and manually exercise normal mode, hard mode, revision lists, continent filters, lives, speedrun mode, and persistence in `localStorage`. For desktop changes, run `python flag.py` and verify flag loading, typed answers, multiple-choice flow, and ignored local `.txt` persistence. Run `python -m py_compile flag.py flag_data.py` after Python edits.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `Add speedrun mode and practice lives` and `Refactor quiz interface and add new revision and view pages`. Follow that style: one concise subject line describing the user-visible or structural change. Pull requests should include a brief summary, manual test steps, linked issue if applicable, and screenshots or screen recordings for UI changes across the web or desktop app.

## Agent-Specific Instructions

Do not commit generated local state files or Supabase `service_role` secrets. Preserve the shared-data model: browser and desktop behavior should stay aligned through `data.js`.
