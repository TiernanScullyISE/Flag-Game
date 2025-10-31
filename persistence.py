# persistence.py
import json
import os

DATA_FILE = "data.json"

_DEFAULTS = {
    "revise_flags": [],
    "revise_capitals": [],
    "high_scores": {},
    "session_percentages": {}
}

def _load_all():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    # if missing or broken, start fresh
    return _DEFAULTS.copy()

def _save_all(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def load_revise_flags():
    return _load_all().get("revise_flags", []).copy()

def save_revise_flags(flags):
    data = _load_all()
    data["revise_flags"] = flags
    _save_all(data)

def load_revise_capitals():
    return _load_all().get("revise_capitals", []).copy()

def save_revise_capitals(flags):
    data = _load_all()
    data["revise_capitals"] = flags
    _save_all(data)

def load_high_scores():
    return _load_all().get("high_scores", {}).copy()

def save_high_scores(high_scores):
    data = _load_all()
    data["high_scores"] = high_scores
    _save_all(data)

def load_session_percentages():
    return _load_all().get("session_percentages", {}).copy()

def save_session_percentages(percentages):
    data = _load_all()
    data["session_percentages"] = percentages
    _save_all(data)
