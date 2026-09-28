"""Behaviour checks for the optional Tkinter fallback without opening a window."""
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

import flag_legacy as legacy


class LegacyPracticeTests(unittest.TestCase):
    def test_accented_answers_and_close_spelling(self):
        self.assertEqual(legacy.normalise("São Tomé"), "sao tome")
        self.assertTrue(legacy.fuzzy_match("Porto-Nova", "Porto-Novo"))
        self.assertFalse(legacy.fuzzy_match("Berlin", "Paris"))

    def test_practice_files_ignore_invalid_items_and_scores(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            revision = root / "revision.txt"
            scores = root / "scores.txt"
            legacy.save_list(revision, ["France", "Germany"])
            revision.write_text(revision.read_text(encoding="utf-8") + "not-a-country\n", encoding="utf-8")
            self.assertEqual(legacy.load_list(revision), ["France", "Germany"])
            scores.write_text("flags_All:12\ninvalid\nflags_Europe:nope\n", encoding="utf-8")
            self.assertEqual(legacy.load_scores(scores, int), {"flags_All": 12})
            legacy.save_scores(scores, {"flags_Europe": 8, "flags_All": 12})
            self.assertEqual(scores.read_text(encoding="utf-8"), "flags_All:12\nflags_Europe:8\n")
            self.assertEqual(legacy.load_list(root / "missing.txt"), [])
            self.assertEqual(legacy.load_scores(root / "missing.txt", int), {})

    def test_multiple_choice_contains_the_answer_and_unique_distractors(self):
        class Button:
            def __init__(self):
                self.text = ""
                self.state = ""

            def config(self, **values):
                self.text = values.get("text", self.text)
                self.state = values.get("state", self.state)

        app = legacy.FlagQuizApp.__new__(legacy.FlagQuizApp)
        app.states = {"flags": legacy.QuizState(
            correct_country="France",
            current_pool=["France", "Germany", "Italy", "Spain"],
        )}
        buttons = [Button() for _ in range(4)]
        app.controls = {"flags": {"mcq_buttons": buttons}}
        app.setup_multiple_choice("flags")
        self.assertEqual({button.text for button in buttons}, set(app.states["flags"].current_pool))
        self.assertTrue(all(button.state == legacy.tk.NORMAL for button in buttons))

    def test_skipped_question_returns_after_other_questions_are_answered(self):
        class Control:
            def __init__(self):
                self.values = {}

            def config(self, **values):
                self.values.update(values)

        app = legacy.FlagQuizApp.__new__(legacy.FlagQuizApp)
        state = legacy.QuizState(
            current_pool=["France", "Germany"],
            session_answered={"France", "Germany"},
            session_skipped={"France"},
        )
        app.states = {"flags": state}
        app.controls = {"flags": {"prompt_label": Control(), "last_button": Control()}}
        app.clear_feedback = lambda _which: None
        app.render_flag = lambda *_args: None
        app.update_revise_button = lambda _which: None
        app.update_session_display = lambda _which: None
        app.update_score_displays = lambda _which: None
        app.is_hard = lambda _which: False
        app.setup_multiple_choice = lambda _which: None
        with patch.object(legacy.tk, "Label", Control), patch.object(legacy.tk, "Button", Control):
            app.load_question("flags")
        self.assertEqual(state.correct_country, "France")
        self.assertEqual(state.session_skipped, set())
        self.assertEqual(state.history, ["France"])


if __name__ == "__main__":
    unittest.main()
