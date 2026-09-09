# Repository Guidelines

## Project Structure & Module Organization

This repository contains a flag and capital quiz with two front ends. The static web app is served from the repo root: `index.html`, `game.html`, `leaderboard.html`, `admin.html`, `revise.html`, and `view.html` are page entry points; `style.css` is shared styling; `game.js`, `leaderboard.js`, `leaderboard-page.js`, `admin.js`, `revise.js`, `view.js`, and `utils.js` hold browser behavior. `data.js` is the canonical quiz data source. `leaderboard-config.js` holds public Supabase settings. Supabase schema, Edge Functions, admin validation, and anti-cheat implementation belong in a private server repository and must not be committed here. Note that this repo is public and can be used by malicious actors to hack the leaderboard so be careful about what gets pushed. The Python desktop launcher is `flag.py`; `desktop_app.py` serves the same local web interface inside pywebview with persistent storage. `flag_legacy.py` retains the original Tkinter app and reads country data through `flag_data.py`. Keep full-feature gameplay shared rather than duplicating it in Python. Shared time formatting and modal accessibility belong in `ui.js`. Local desktop persistence files such as `high_scores.txt`, `revise_flags.txt`, and `session_percentages.txt` are ignored by Git.

## Build, Test, and Development Commands

- `python -m http.server 8000`: serve the web version locally from the repository root, then open `http://127.0.0.1:8000/index.html`.
- `npm.cmd install`: install JavaScript dev dependencies, including the local Playwright test runner.
- `npx.cmd playwright install chromium`: install the Playwright Chromium browser binary if browser tests report a missing executable.
- `npm.cmd test`: run data validation, JavaScript smoke checks, and Python syntax checks.
- `npm.cmd run test:browser`: run Playwright browser page checks.
- `python -m pip install -r requirements.txt`: install desktop dependencies (pywebview, plus requests/Pillow for the legacy app).
- `python flag.py`: run the shared interface in a Python desktop window (WebView2 on Windows).
- `python flag.py --legacy`: run the original Tkinter country quiz.
- `npm.cmd run test:desktop`: check the restricted local asset server and legacy practice import.
- `python -m py_compile flag.py flag_data.py desktop_app.py flag_legacy.py`: quick syntax check for Python changes.

There is no build step for the static site.

## Coding Style & Naming Conventions

Use 4-space indentation for Python and existing JavaScript indentation patterns. Python functions and variables use `snake_case`; JavaScript constants use `UPPER_SNAKE_CASE`, while functions and local variables use `camelCase`. Keep shared quiz data changes in `data.js`; update `flag_data.py` only when the parsing bridge or validation behavior changes. Prefer small, focused functions and avoid adding dependencies unless they simplify a real project concern.

## Testing Guidelines

For web changes, run `npm.cmd test`. For rendered UI or browser-flow changes, run `npm.cmd run test:browser`; if Playwright is missing, run `npm.cmd install`, and if the browser executable is missing, run `npx.cmd playwright install chromium`, then rerun the browser tests. Also run the static server and manually exercise normal mode, hard mode, revision lists, continent filters, lives, speedrun mode, and persistence in `localStorage` for substantial gameplay changes. For desktop changes, run the desktop HTTP/import tests and `python flag.py`; verify shared page loading, modes, pledge and persistence across a full close/reopen. Preserve the original `.txt` records when importing. Use `--legacy` when checking the old Tkinter app. Run `python -m py_compile flag.py flag_data.py desktop_app.py flag_legacy.py` after Python edits.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `Add speedrun mode and practice lives` and `Refactor quiz interface and add new revision and view pages`. Follow that style: one concise subject line describing the user-visible or structural change. Pull requests should include a brief summary, manual test steps, linked issue if applicable, and screenshots or screen recordings for UI changes across the web or desktop app.

## Agent-Specific Instructions

Do not commit generated local state files, Supabase `service_role` secrets, Supabase SQL, or Supabase Edge Function source. Preserve the shared-data model: browser and desktop behavior should stay aligned through `data.js`.

Keep anti-cheat heuristics, private run exports and historical replay fixtures in the private server workspace. Before changing detection, compare against known legitimate evidence and independent human timing examples. Statistical timing flags must request review rather than claim proven cheating or introduce automatic rejection. Keep admin descriptions understandable without publishing detector thresholds. Verify the live function version separately from Git push status; deployment does not retrospectively change stored moderation decisions.

For Supabase Edge Functions, check whether `leaderboard-config.js` uses a legacy anon JWT or a `sb_publishable_...` key. Publishable keys are not JWTs, so browser requests must not send them as `Authorization: Bearer ...`, and functions that accept public browser requests must be deployed with `--no-verify-jwt`.

If `deno` is missing in this environment, try `C:\Users\User\.deno\bin\deno.exe`. If `supabase projects list` reports that no access token is provided, do not guess: ask the user to run `supabase login` locally or persist their existing terminal token as a user environment variable.

The authenticated Supabase CLI is installed on the Windows PATH at `C:\Users\User\scoop\shims\supabase.exe`. Codex's Linux shell will not find it as `supabase`; invoke it through escalated Windows PowerShell, for example `powershell.exe -NoProfile -Command 'supabase projects list'`. Do not report the CLI or authentication as missing until that Windows PowerShell route has been tried.

When Supabase deployment is needed and the user's normal PowerShell is already authenticated, prefer running the deployment with `sandbox_permissions: "require_escalated"` so it uses the local Supabase auth context instead of stopping at pasteable commands. Use the ignored private Supabase source path, for example `.private-supabase-backup\supabase`, or the private server repository; never re-add Supabase SQL or Edge Function source to this public repository. If `admin_password.txt` exists locally, it may be read for setting the `ADMIN_PASSWORD` secret, but never print the password or commit that file.

When local tooling is missing but the remedy is clear, fix it before handing work back. Examples: run `npm.cmd install` when local Node dev dependencies are absent, run `npx.cmd playwright install chromium` when Playwright reports a missing browser executable, and retry Supabase CLI/deploy commands through the escalated local PowerShell route when sandboxing blocks network access or local auth. Do not ask the user to paste secrets, and do not store credentials in the repository.

If browser verification of map or flag rendering fails with CDN/network errors such as `ERR_NETWORK_ACCESS_DENIED`, rerun the focused browser check with `sandbox_permissions: "require_escalated"` before treating it as an application regression.


## Desktop, UI and regression guardrails

- Read README.md for current startup commands and feature boundaries. The normal desktop window shares all web runtime assets; the legacy Tkinter fallback has a smaller feature set.
- The desktop host binds to `127.0.0.1` on a stable port for storage continuity. Serve only `PUBLIC_ASSETS`, never the whole checkout. Add new local runtime assets to that allowlist and its coverage tests. Do not expose a filesystem, shell or privileged database bridge to page JavaScript.
- Desktop profiles belong in the user's application-data directory, not the repo. Legacy import merges practice records once, preserves originals, and must never create shared speedrun evidence.
- Use `ui.js` for result time formatting (milliseconds) and dialog focus/inert/Escape handling. Preserve all IDs and event wiring during visual edits.
- Verify light/dark appearances and 320/390/768/1440px layouts. Preserve mobile keyboard focus, question visibility and compact answer controls; do not replace those rules with broad overflow hiding. Check populated result/admin cards as well as empty pages.
- Keep UI changes in existing selectors where practical; avoid layering contradictory theme overrides. Use visible keyboard focus, explicit labels and reduced-motion support. User-facing text uses British English; API names and CSS properties keep their standard spelling.
- `.github/workflows/checks.yml` runs data, desktop-host and browser checks on Windows and Linux. Browser tests mock shared-service writes. Never publish artificial runs while testing UI.
- In this WSL checkout, Linux `npm` and `python` are installed and should run local checks directly. Windows `npm.cmd` is not a Bash executable, and its CMD wrapper cannot use a UNC cwd. Keep Windows and Linux virtual environments separate. Reserve the authenticated Windows PowerShell path for Supabase when needed.
- When launching this WSL checkout through Windows Python, keep the Windows environment at `%LOCALAPPDATA%\FlagGame\python-env`, not on the WSL share: Python.NET failed to load its runtime DLL from the UNC path. See the working PowerShell commands in README.md. Native-window checks passed with Windows Python 3.14/WebView2 and Linux Qt.
- For headless Linux desktop verification, a virtual display and a pywebview Qt/GTK backend are required. Virtual GPU failures may require software rendering for the test; do not disable production sandboxing or TLS verification to work around them.
