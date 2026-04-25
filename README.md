# Flag & Capital Quiz

A geography quiz with two front ends:

- **GitHub Pages static site**: browser-based flag and capital quizzes, revision lists, hard mode, streaks and session records stored in `localStorage`.
- **Tkinter desktop app**: the same quiz modes and persistence model using local text files.

## Features

- Flag quiz and capital quiz.
- Normal multiple-choice mode and hard typed-answer mode.
- Continent filters plus separate flag and capital revision lists.
- Current streak, per-mode high streak and best session percentage.
- "Next", "Last" and "Give Up" session controls.
- Direct FlagCDN image loading through a complete local alpha-2 country-code map.

## Project Structure

- `index.html`, `game.html`, `revise.html`, `view.html`: GitHub Pages entry points.
- `style.css`: shared responsive web styling.
- `data.js`: canonical browser data for countries, capitals, continents, aliases and flag codes.
- `utils.js`, `game.js`, `revise.js`, `view.js`: active browser logic.
- `flag_data.py`: desktop data bridge that reads `data.js`.
- `flag.py`: Tkinter desktop app.
- `revise_flags.txt`, `revise_capitals.txt`, `high_scores.txt`, `session_percentages.txt`: desktop persistence files.

## Run the Web Version Locally

Use any static file server from the repository root, then open the printed local URL.

```bash
python -m http.server 8000
```

The web version can also be served directly by GitHub Pages from the repo root.

## Run the Desktop Version

```bash
pip install -r requirements.txt
python flag.py
```

The desktop app reads the same country data as the web app, so data changes should be made in `data.js`.
