"""Desktop host for the shared web app; no privileged API is exposed to JavaScript."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
import json
import math
import mimetypes
import os
from pathlib import Path
import re
import runpy
import socket
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
DEFAULT_PORT = 18763  # A stable origin preserves localStorage between launches.
PUBLIC_ASSETS = frozenset({
    "index.html", "game.html", "leaderboard.html", "revise.html", "view.html",
    "feedback.html", "admin.html", "favicon.svg", "style.css", "theme.js", "ui.js",
    "data.js", "regions-data.js", "regions-generated-data.js", "regions-leaderboard-data.js",
    "utils.js", "game.js", "leaderboard.js", "leaderboard-page.js", "leaderboard-config.js",
    "revise.js", "view.js", "feedback.js", "admin.js", "analytics.js", "map-view.js",
    "region-map.js", "world-map-config.js",
})


def profile_directory() -> Path:
    if sys.platform == "win32":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return base / "FlagGame" / "webview"


class LocalAppServer(ThreadingHTTPServer):
    # Unix needs reuse for immediate relaunch after TIME_WAIT; Windows needs
    # exclusive binding so another process cannot share the desktop origin.
    allow_reuse_address = sys.platform != "win32"
    daemon_threads = True

    def __init__(self, root: Path, port: int):
        self.root = root.resolve()
        super().__init__(("127.0.0.1", port), AppRequestHandler)

    def server_bind(self):
        if sys.platform == "win32":
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()

    @property
    def origin(self) -> str:
        return f"http://127.0.0.1:{self.server_port}"


class AppRequestHandler(BaseHTTPRequestHandler):
    """Serve only named public assets, never directories, saved records or server source."""
    server: LocalAppServer

    def do_GET(self) -> None:
        self.serve_asset(send_body=True)

    def do_HEAD(self) -> None:
        self.serve_asset(send_body=False)

    def serve_asset(self, send_body: bool) -> None:
        if self.headers.get("Host") != f"127.0.0.1:{self.server.server_port}":
            self.send_error(403)
            return
        path = unquote(urlsplit(self.path).path)
        name = "index.html" if path == "/" else path.removeprefix("/")
        if name not in PUBLIC_ASSETS:
            self.send_error(404)
            return
        asset = self.server.root / name
        if asset.is_symlink() or not asset.is_file():
            self.send_error(404)
            return
        try:
            content = asset.read_bytes()
        except OSError:
            self.send_error(404)
            return
        content_type = {".js": "text/javascript", ".css": "text/css", ".html": "text/html"}.get(
            asset.suffix, mimetypes.guess_type(name)[0] or "application/octet-stream"
        )
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        try:
            self.end_headers()
            if send_body:
                self.wfile.write(content)
        except ConnectionError:
            # Navigation or closing the window can cancel an in-flight asset.
            pass

    def log_message(self, _format: str, *args: object) -> None:
        pass


@contextmanager
def serve_app(root: Path = ROOT, port: int = DEFAULT_PORT):
    server = LocalAppServer(root, port)
    thread = Thread(target=server.serve_forever, name="flag-game-assets", daemon=True)
    thread.start()
    try:
        yield server
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def read_legacy_progress(root: Path = ROOT) -> dict:
    """Import known practice files only; never manufacture competitive run records."""
    from flag_data import COUNTRIES

    def lines(name: str) -> list[str]:
        try:
            return (root / name).read_text(encoding="utf-8-sig").splitlines()
        except (OSError, UnicodeError):
            return []

    progress = {}
    for key in ("revise_flags", "revise_capitals"):
        progress[key] = sorted({line.strip() for line in lines(key + ".txt") if line.strip() in COUNTRIES})
    for key in ("high_scores", "session_percentages"):
        values = {}
        for line in lines(key + ".txt"):
            name, separator, raw = line.partition(":")
            match = re.fullmatch(r"(?:(flags|capitals)_)?(.+)_(hard|normal)", name)
            if not separator or not match:
                continue
            try:
                value = float(raw)
            except ValueError:
                continue
            if not math.isfinite(value) or value < 0 or (key == "session_percentages" and value > 100):
                continue
            mode, continent, difficulty = match.groups()
            set_key = re.sub(r"\s+", "-", continent.lower().strip())
            new_key = f"countries_{mode or 'flags'}_{set_key}_{difficulty}_unlimited"
            values[new_key] = max(values.get(new_key, 0), int(value) if key == "high_scores" else value)
        progress[key] = values
    return progress


def migration_script(progress: dict) -> str:
    # Values are serialised as JSON, never interpolated into executable strings.
    return """(()=>{
      const marker = 'flag_game_desktop_import_v1';
      if(localStorage.getItem(marker)) return false;
      const progress = %s;
      for(const [key, imported] of Object.entries(progress)){
        let current;
        try{ current = JSON.parse(localStorage.getItem(key) || 'null'); }catch{ current = null; }
        if(Array.isArray(imported)){
          localStorage.setItem(key, JSON.stringify([...new Set([...(Array.isArray(current) ? current : []), ...imported])]));
        }else{
          const merged = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
          for(const [mode, value] of Object.entries(imported)){
            merged[mode] = Math.max(Number(merged[mode]) || 0, value);
          }
          localStorage.setItem(key, JSON.stringify(merged));
        }
      }
      localStorage.setItem(marker, 'yes');
      return true;
    })()""" % json.dumps(progress, ensure_ascii=True, allow_nan=False)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--legacy", action="store_true", help="Open the original Tkinter country quiz")
    parser.add_argument("--serve", action="store_true", help="Serve public assets for browser verification without a window")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Local port (keep it stable to retain the same saved progress)")
    parser.add_argument("--profile", type=Path, help="Desktop profile directory; defaults to the user's application data folder")
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    if args.legacy:
        runpy.run_path(str(ROOT / "flag_legacy.py"), run_name="__main__")
        return 0
    if not args.serve:
        try:
            import webview
        except ImportError:
            print("Install desktop dependencies: python -m pip install -r requirements.txt", file=sys.stderr)
            return 1
    try:
        with serve_app(port=args.port) as server:
            print(f"Flag & Capital Quiz: {server.origin}/index.html (PID {os.getpid()})", flush=True)
            if args.serve:
                from threading import Event
                Event().wait()
                return 0
            profile = (args.profile or profile_directory()).resolve()
            profile.mkdir(parents=True, exist_ok=True)
            webview.settings["ALLOW_FILE_URLS"] = False
            webview.settings["ALLOW_DOWNLOADS"] = True
            window = webview.create_window(
                "Flag & Capital Quiz", f"{server.origin}/index.html",
                width=1280, height=860, min_size=(640, 600), background_color="#101820",
                text_select=True, zoomable=True, confirm_close=True,
            )
            progress = read_legacy_progress()

            def import_progress():
                # Run on the home page only, before the player starts the game.
                if window.get_current_url() != f"{server.origin}/index.html":
                    return
                try:
                    window.evaluate_js(migration_script(progress))
                except Exception:
                    print("Could not import previous practice records. Original files are unchanged; import will retry on the home page.", file=sys.stderr)

            window.events.loaded += import_progress
            webview.start(
                gui="edgechromium" if sys.platform == "win32" else None,
                private_mode=False, storage_path=str(profile), debug=False,
            )
    except KeyboardInterrupt:
        return 0
    except OSError as error:
        print(f"Could not start the desktop app: {error}. Close an existing copy if the local port is in use.", file=sys.stderr)
        return 1
    except Exception as error:
        print(f"Desktop window could not start: {error}. Check the desktop runtime instructions in README.md, or use python flag.py --legacy.", file=sys.stderr)
        return 1
    return 0
