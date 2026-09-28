"""Optional native smoke check: load the game and verify storage across two launches."""
from __future__ import annotations

import argparse
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def wait_for(window, expression):
    for _ in range(200):
        try:
            if window.evaluate_js(expression):
                return
        except Exception:
            pass  # Navigation briefly replaces the JavaScript context.
        time.sleep(.1)
    raise RuntimeError(f"Desktop page did not become ready: {expression}")


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def verify_window(window, phase, passed):
    try:
        wait_for(window, "document.readyState === 'complete' && localStorage.getItem('flag_game_desktop_import_v1') === 'yes' && typeof state !== 'undefined' && !!state.session && typeof QuizUI !== 'undefined'")
        require("Practise with lives" in window.evaluate_js("document.querySelector('h1').textContent"), "Game heading is missing")
        if phase == "write":
            window.evaluate_js("localStorage.setItem('desktop_smoke_persistence','verified')")
        else:
            require(window.evaluate_js("localStorage.getItem('desktop_smoke_persistence')") == "verified", "Saved state was lost")
        require(window.evaluate_js("QuizUI.formatTime(376669)") == "6:16.669", "Time formatting changed")
        require(window.evaluate_js("document.querySelectorAll('.scope-segment').length") == 2, "Scope controls are missing")
        require(window.evaluate_js("document.querySelectorAll('.quiz-segment').length") == 3, "Quiz controls are missing")
        window.evaluate_js("document.querySelector('.play-mode-segment[data-play-mode=\"speedrun\"]').click()")
        require(window.evaluate_js("document.querySelector('#speedrun-oath-modal').classList.contains('is-visible')"), "Speedrun pledge is missing")
        window.evaluate_js("document.querySelector('#speedrun-oath-cancel').click()")
        require(window.evaluate_js("state.playMode") == "practice", "Cancelling pledge changed the mode")
        passed.append(True)
        print(f"Native desktop {phase}: shared game, pledge and saved state passed.", flush=True)
    except Exception as error:
        print(f"Native desktop check failed: {error!r}", file=sys.stderr, flush=True)
    finally:
        window.destroy()


def check_window(phase: str, profile: str, port: int) -> int:
    import desktop_app
    import webview

    original_start = webview.start
    original_create = webview.create_window
    passed = []

    def create(*args, **kwargs):
        kwargs.update(confirm_close=False, hidden=True)
        return original_create(*args, **kwargs)

    def start(**kwargs):
        original_start(func=lambda: verify_window(webview.windows[0], phase, passed), **kwargs)

    webview.start = start
    webview.create_window = create
    try:
        result = desktop_app.main(["--profile", profile, "--port", str(port)])
        return 0 if passed and result == 0 else 1
    finally:
        webview.start = original_start
        webview.create_window = original_create


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phase", choices=["write", "read"])
    parser.add_argument("--profile")
    parser.add_argument("--port", type=int)
    args = parser.parse_args()
    if args.phase:
        return check_window(args.phase, args.profile, args.port)
    with socket.socket() as available:
        available.bind(("127.0.0.1", 0))
        port = available.getsockname()[1]
    with tempfile.TemporaryDirectory(prefix="flag-desktop-check-", ignore_cleanup_errors=True) as profile:
        for phase in ("write", "read"):
            result = subprocess.run([
                sys.executable, str(Path(__file__).resolve()), "--phase", phase,
                "--profile", profile, "--port", str(port),
            ], cwd=ROOT, timeout=60, check=False)
            if result.returncode:
                return result.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
