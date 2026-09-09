# Flag & Capital Quiz

[Play the quiz](https://tiernanscullyise.github.io/Flag-Game/)

A geography trainer for countries and regions, available as a static website and a Python desktop application. Both use the **same HTML, CSS, JavaScript and quiz data**, so gameplay and visual improvements apply to both.

## Features

- Country flags, capitals and world-map recall across 197 countries and six continents.
- Regional flags, administrative centres and maps, including Ireland's 32 counties, Ireland as Gaeilge, England, Scotland, Wales, US states and generated regional sets. Flag modes use verified flag assets where available.
- Multiple-choice practice, typed hard mode, configurable lives, streaks and saved personal records.
- Revision lists for countries and regions, capital flashcards and searchable country/capital reference cards.
- Speedruns with splits, WPM, local records and times displayed to **three decimal places**.
- A fair-play pledge on first entering speedrun mode in each tab session. Cancelling leaves practice selected; acknowledgement lasts through navigation and reloads in that tab.
- Optional publication of category personal bests to a shared leaderboard, with server-issued completion receipts and admin review.
- Dark and light appearances, responsive layouts, keyboard focus indicators and accessible pledge/results dialogs.
- Feedback submissions and a protected admin interface for moderation and private learning analytics.

## Run locally

Use the repository root (the folder containing `game.html` and `flag.py`) in the VS Code terminal. Commands below are for Windows PowerShell. Use Python 3.10+; verification currently uses Python 3.12.

### Website

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000/index.html** in your browser. There is no build step. Stop the server with `Ctrl+C`. This generic development server serves the repository directory; keep it bound to loopback, especially if your checkout contains ignored private files.

### Python desktop application

Create a dedicated environment once:

```powershell
python -m venv .venv-desktop
.\.venv-desktop\Scripts\python.exe -m pip install -r requirements.txt
.\.venv-desktop\Scripts\python.exe flag.py
```

The app opens in a native desktop window using [pywebview](https://pywebview.flowrl.com/guide/). On Windows it uses Microsoft Edge WebView2. If the runtime is missing, install the [WebView2 Evergreen Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) and run the last command again. You do not need to activate the virtual environment.

If the checkout is in WSL and PowerShell sees a `\\wsl.localhost\...` network path, put the **Windows environment on the Windows drive**. Loading Python's .NET runtime from the WSL share can fail. From the same repository root in PowerShell, use:

```powershell
$desktopEnv = Join-Path $env:LOCALAPPDATA "FlagGame\python-env"
python -m venv $desktopEnv
& "$desktopEnv\Scripts\python.exe" -m pip install -r requirements.txt
& "$desktopEnv\Scripts\python.exe" flag.py
```

Use that interpreter for the native-window verification command below too. This setup was verified with Windows Python 3.14 and WebView2; the Linux native check uses Qt.

The desktop window loads this checkout's local website. It includes regional sets, maps, speedruns, revision, feedback, shared leaderboards and the same admin sign-in. Shared submissions use the existing server verification path. Desktop users receive no extra trust or privileged database access.

Desktop details:

- A restricted server binds to **127.0.0.1:18763** and serves only an explicit list of public assets. It does not serve private server code, passwords, local progress files or directory listings.
- Persistent desktop storage lives under `%LOCALAPPDATA%\FlagGame\webview` on Windows, `~/Library/Application Support/FlagGame/webview` on macOS, or `$XDG_DATA_HOME/FlagGame/webview` (default `~/.local/share/FlagGame/webview`) on Linux.
- Desktop, local-browser and hosted-website progress are separate profiles. They do not automatically synchronise.
- On the first home-page load, old `revise_flags.txt`, `revise_capitals.txt`, `high_scores.txt` and `session_percentages.txt` are imported into desktop practice storage. Revision lists are merged and stronger records are preserved. Original files remain untouched. Old keys without a quiz mode are treated as flag records; old practice scores map to unlimited lives. Nothing is imported as a competitive speedrun.
- Keep the default port and profile to retain the same storage origin. If the port is occupied, close the other app instance. `--port` and `--profile` are available for isolated testing.
- An internet connection is needed for uncached flag images, map boundaries, web fonts and shared services. This is not a fully offline package.

The previous Tkinter country flag/capital app remains available:

```powershell
.\.venv-desktop\Scripts\python.exe flag.py --legacy
```

It continues to use the old text files and does not have the shared interface's full feature set.

On Linux, install a GUI backend in your Linux environment:

```bash
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt 'pywebview[qt]>=6.0,<7'
.venv/bin/python flag.py
```

See the [pywebview installation guide](https://pywebview.flowrl.com/guide/installation.html) for platform GUI prerequisites. Windows and WSL need separate Python virtual environments. In WSL, use Linux `npm` and `python` for local checks; do not invoke Windows `npm.cmd` through Bash from a UNC working directory.

## Verification

From the repository root in PowerShell:

```powershell
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd test
npm.cmd run test:desktop
npm.cmd run test:browser
```

- `test`: shared country-data validation, JavaScript syntax/asset wiring and Python compilation.
- `test:desktop`: real loopback HTTP checks, public-asset coverage, private-file protection and legacy import validation. No desktop GUI dependencies are needed.
- `test:browser`: gameplay, country/regional maps, mobile typing, persistence failures, secure submission wiring, moderation, both themes at 320/390/768/1440px, dialog keyboard navigation, automated axe accessibility scans and desktop import behaviour.
- `.github/workflows/checks.yml`: runs these checks on Linux and Windows. Playwright and axe are development tools, never loaded by the application.

For an automated native-window check (requires the installed GUI runtime):

```powershell
.\.venv-desktop\Scripts\python.exe scripts/check-desktop-window.py
```

It uses a temporary profile and checks persistence across two separate launches without submitting leaderboard runs. In a Linux virtual display, use `QTWEBENGINE_CHROMIUM_FLAGS=--disable-gpu LIBGL_ALWAYS_SOFTWARE=1 PYWEBVIEW_GUI=qt xvfb-run -a .venv/bin/python scripts/check-desktop-window.py` if the virtual GPU cannot initialise.

For a manual native desktop check, launch `flag.py`, change the theme, save a revision item, close the window and reopen it. The theme and saved item should remain. Confirm country/region switching, a capital/map question and the speedrun pledge. Native runtime testing is separate from headless browser tests.

## Structure and maintenance

| Area | Files |
| --- | --- |
| Pages | `index.html`, `game.html`, `leaderboard.html`, `revise.html`, `view.html`, `feedback.html`, `admin.html` |
| Presentation | `style.css`, `theme.js`, `ui.js` (shared time formatting and dialog behaviour) |
| Quiz | `game.js`, `utils.js`, `map-view.js`, `region-map.js`, `world-map-config.js` |
| Shared data | `data.js`, `regions-data.js`, `regions-generated-data.js`, `regions-leaderboard-data.js` |
| Services | `leaderboard.js`, `leaderboard-config.js`, `analytics.js`, `feedback.js`, `admin.js` |
| Desktop | `flag.py` launcher, `desktop_app.py` host/import, `flag_legacy.py` fallback, `flag_data.py` legacy data bridge |
| Verification | `tests/`, `scripts/validate-data.js`, `scripts/smoke-check.js` |

Keep quiz behaviour in the shared web code. Avoid reimplementing it in Python. `desktop_app.py` maintains a public-asset allowlist: update it when a page gains a local runtime asset. Keep shared styling in `style.css` and preserve the mobile keyboard rules when changing gameplay layouts. Bump relevant asset query versions after edits so hosted browsers fetch the update.

## Shared services and privacy

The browser-facing Supabase URL, public browser key and function URLs are in `leaderboard-config.js`. Only public configuration belongs here. SQL, Edge Functions, moderation rules and privileged credentials belong in the private server project. Do not publish the ignored private backup directory.

`sb_publishable_...` keys are not JWTs: send them as `apikey`, not `Authorization: Bearer`. Public Edge Functions accepting these keys are deployed with `--no-verify-jwt` from the private server source. This does not grant clients privileged database access; the function and database enforce their own rules.

A completed speedrun can be published only when it is a personal best for its exact category and the player chooses to submit. Intermediate splits remain local. Public leaderboard reads contain approved result summaries; private route/telemetry details are for admin review.

Completed speedruns also send **private learning analytics automatically**, independently of public leaderboard posting. These include answer attempts, timings, typing metrics, device/player identifiers and quality flags. Failed analytics uploads use a capped local retry queue. Practice scores and revision lists are stored locally. Feedback is sent to the private review queue. The desktop uses the same service behaviour.

The private server recomputes consistency checks, establishes the official elapsed time and issues sealed completion receipts. It also compares evidence across submissions and applies separate player, client and network rate limits. Suspicious patterns can result in pending review rather than automatic publication. The pledge communicates fair-play expectations; it is not a security boundary. Browser/client evidence alone cannot prove that a player was unaided.

Timing review checks consider repeated mechanical patterns and historical evidence reused at a different speed. They require several corroborating observations; a single quick answer or consistent typing alone is not enough. These checks hold submissions for admin review rather than automatically rejecting them. If historical comparison is unavailable, publication also waits for review. Existing stored runs are not retrospectively moderated by a function deployment.

Admin access is validated by the private admin function, including trusted-device credentials. A client-side device label or editing the page does not itself authorise database access. Never put an admin password, service-role key or server signing secret in frontend code.

## Regional data generation

The generated bundle includes 193 country-level region sets; manual sets provide additional regional categories. Monaco and Vatican City are excluded at this level because the boundary source has fewer than two usable regions.

From the repository root in PowerShell:

```powershell
npm.cmd run regions:scan
npm.cmd run regions:build
npm.cmd run regions:leaderboard
npm.cmd run regions:check-maps
```

`regions:scan` updates the source report without replacing the application bundle. `regions:build` refreshes generated quiz data. `regions:leaderboard` regenerates the smaller leaderboard metadata bundle. Successful source responses are cached in ignored `.region-cache/`; reruns reuse that cache. Respect `Retry-After` responses and resume later if an upstream service is rate-limited.

For focused investigations:

```powershell
npm.cmd run regions:limits
node scripts\build-region-groups.js --country "Spain" --report-only
node scripts\build-region-groups.js --country "Spain" --report-only --wikidata-admin-fallback
```

`region-source-report.json` records included/skipped sets and reasons. Regional sources include Wikidata, GeoNames and GeoBoundaries; country maps use Natural Earth-derived `world-atlas` data. Flags use FlagCDN and verified regional sources. Missing flags are never fabricated.
