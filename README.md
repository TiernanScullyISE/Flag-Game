# Flag-Game

## Overview

A Tkinter-based flashcard quiz to help users learn world flags by continent, with both multiple-choice and text-entry (hard) modes, plus persistence of progress and high-score tracking.

---

## Modes & Navigation

* **Continent Filter**

  * Dropdown to select “All”, any individual continent, “Revise” (user-flagged), or “View All” (browse).
* **Normal (MCQ) vs Hard Mode**

  * **Normal**: four-button multiple choice.
  * **Hard**: free-text entry with fuzzy matching (`difflib.get_close_matches`).
* **Revise List**

  * “Add to Revise” / “Remove from Revise” toggles per flag.
  * Persists in `revise_flags.txt`.
* **View All**

  * Scrollable grid of every flag + country name.
  * Lazy-loads images one by one (50 ms delay) to prevent UI lock-ups.
* **Next / Last**

  * “Next Flag” skips current (marks as skipped), “Last Flag” revisits previous question.

---

## Session Tracking & Statistics

* **Per-session stats**: flags seen, correct vs total, progress bar.
* **Streaks & High Scores**

  * Tracks current streak; updates per-mode high streak in `high_scores.txt`.
* **Best Session Percentage**

  * Calculates “% correct” per mode; stores best in `session_percentages.txt`.
* **Give Up**

  * Counts all unseen/skipped flags as incorrect and shows summary dialogue.

---

## Data Persistence

Best practice: use `with open(..., encoding='utf-8')` and guard against file errors.

```python
def save_high_scores(self):
    try:
        with open("high_scores.txt", "w", encoding="utf-8") as f:
            for mode, score in self.high_scores.items():
                f.write(f"{mode}:{score}\n")
    except IOError as e:
        print("Error saving high scores:", e)
```

---

## Flag Image Loading

* **Special-case mappings** (e.g. “Ivory Coast” → code “ci”, “Türkiye” → “Turkey”).
* **Primary source**: `https://flagcdn.com/w320/{code}.png` via `requests`.
* **Fallback**: REST Countries API to look up `cca2` code.
* Graceful failure falls back to text placeholder.

---

## UI Structure

* **Frames & Widgets**

  * Top-level: mode selector, revise button, hard-mode checkbox.
  * Central: `Label` for flag image, feedback labels.
  * Bottom: score/percentage/session labels + nav buttons.
* **Clear Separation**

  * `setup_widgets()`, `toggle_mode()`, `show_all_flags()`, etc., keep layout logic organised.

---

## How to Run

```bash
git clone https://github.com/TiernanScullyISE/flag-game
cd flag-quiz
python3 flag_quiz.py
```

