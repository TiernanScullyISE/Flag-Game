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


def check_window(phase: str, profile: str, port: int) -> int:
    import desktop_app
    import webview

    original_start = webview.start
    original_create = webview.create_window
    passed = []

    def create(*args, **kwargs):
        kwargs.update(confirm_close=False, hidden=True)
        return original_create(*args, **kwargs)

    def wait_for(window, expression):
        for _ in range(200):
            try:
                if window.evaluate_js(expression):
                    return
            except Exception:
                pass  # Navigation briefly replaces the JavaScript context.
            time.sleep(.1)
        raise AssertionError(f"Desktop page did not become ready: {expression}")

    def verify():
        window = webview.windows[0]
        try:
            wait_for(window, "document.readyState === 'complete' && !!document.querySelector('h1')")
            assert window.evaluate_js("document.querySelector('h1').textContent") == "Flag & Capital Quiz"
            if phase == "write":
                window.evaluate_js("localStorage.setItem('desktop_smoke_persistence','verified')")
            else:
                assert window.evaluate_js("localStorage.getItem('desktop_smoke_persistence')") == "verified"
            window.load_url(f"http://127.0.0.1:{port}/game.html")
            wait_for(window, "typeof state !== 'undefined' && !!state.session && typeof QuizUI !== 'undefined'")
            assert window.evaluate_js("QuizUI.formatTime(376669)") == "6:16.669"
            assert window.evaluate_js("document.querySelectorAll('.scope-segment').length") == 2
            assert window.evaluate_js("document.querySelectorAll('.quiz-segment').length") == 3
            window.evaluate_js("document.querySelector('.play-mode-segment[data-play-mode=\"speedrun\"]').click()")
            assert window.evaluate_js("document.querySelector('#speedrun-oath-modal').classList.contains('is-visible')")
            window.evaluate_js("document.querySelector('#speedrun-oath-cancel').click()")
            assert window.evaluate_js("state.playMode") == "practice"
            passed.append(True)
            print(f"Native desktop {phase}: shared game, pledge and saved state passed.", flush=True)
        except Exception as error:
            print(f"Native desktop check failed: {error!r}", file=sys.stderr, flush=True)
        finally:
            window.destroy()

    def start(**kwargs):
        original_start(func=verify, **kwargs)

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
