"""Desktop hosting and migration checks; no GUI or external service required."""
import http.client
import tempfile
from pathlib import Path
import unittest

from desktop_app import PUBLIC_ASSETS, ROOT, read_legacy_progress, serve_app


class DesktopServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.context = serve_app(port=0)
        cls.server = cls.context.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.context.__exit__(None, None, None)

    def request(self, path, method="GET", headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        connection.request(method, path, headers=headers or {})
        response = connection.getresponse()
        result = (response.status, dict(response.getheaders()), response.read())
        connection.close()
        return result

    def test_public_assets_are_available(self):
        for asset in PUBLIC_ASSETS:
            with self.subTest(asset=asset):
                status, headers, body = self.request("/" + asset + "?v=test")
                self.assertEqual(status, 200)
                self.assertEqual(body, (ROOT / asset).read_bytes())
                self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(self.request("/")[0], 200)
        self.assertEqual(self.request("/game.js", "HEAD")[2], b"")

    def test_private_files_and_traversal_are_not_served(self):
        for path in ["/admin_password.txt", "/.git/config", "/requirements.txt", "/flag.py",
                     "/.private-supabase-backup/supabase/functions/submit-speedrun/index.ts",
                     "/../game.html", "/%2e%2e/game.html", "//admin_password.txt", "/node_modules/"]:
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 404)

    def test_relaunch_reuses_origin_but_second_live_instance_is_refused(self):
        with serve_app(port=0) as first:
            port = first.server_port
            with self.assertRaises(OSError):
                with serve_app(port=port):
                    pass
        with serve_app(port=port) as restarted:
            self.assertEqual(restarted.server_port, port)

    def test_external_host_and_writes_are_refused(self):
        self.assertEqual(self.request("/index.html", headers={"Host": "attacker.example"})[0], 403)
        self.assertEqual(self.request("/game.js", "POST")[0], 501)


class MigrationTests(unittest.TestCase):
    def test_import_preserves_valid_records_and_ignores_bad_values(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "revise_flags.txt").write_text("France\nFrance\nnot-a-country\n", encoding="utf-8")
            scores = "flags_All_hard:36\ncapitals_Europe_normal:9\nAll_hard:21\nbad:42\nflags_All_normal:nan\nflags_Asia_hard:-4\n"
            (root / "high_scores.txt").write_text(scores, encoding="utf-8")
            (root / "session_percentages.txt").write_text("All_hard:92.9\nEurope_hard:101\n", encoding="utf-8")
            result = read_legacy_progress(root)
            self.assertEqual(result["revise_flags"], ["France"])
            self.assertEqual(result["revise_capitals"], [])
            self.assertEqual(result["high_scores"], {
                "countries_flags_all_hard_unlimited": 36,
                "countries_capitals_europe_normal_unlimited": 9,
            })
            self.assertEqual(result["session_percentages"], {"countries_flags_all_hard_unlimited": 92.9})
            self.assertEqual((root / "high_scores.txt").read_text(), scores)
            self.assertNotIn("speed_run_records", result)


if __name__ == "__main__":
    unittest.main()
