from __future__ import annotations

import random
import unicodedata
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from typing import Callable

import requests
import tkinter as tk
from PIL import Image, ImageTk
from tkinter import messagebox, ttk

from flag_data import (
    CAPITAL_ALIASES,
    CONTINENTS,
    COUNTRIES,
    COUNTRY_ALIASES,
    COUNTRY_CAPITALS,
    COUNTRY_CONTINENTS,
    FLAG_CODES,
    validate_data,
)


APP_TITLE = "Flag & Capital Quiz"
IMAGE_SIZE = (380, 238)
THUMB_SIZE = (96, 60)

ROOT = Path(__file__).resolve().parent
FILES = {
    "revise_flags": ROOT / "revise_flags.txt",
    "revise_capitals": ROOT / "revise_capitals.txt",
    "high_scores": ROOT / "high_scores.txt",
    "session_percentages": ROOT / "session_percentages.txt",
}

COLORS = {
    "bg": "#101820",
    "panel": "#f7efe2",
    "panel_strong": "#fff9ee",
    "ink": "#172029",
    "muted": "#5d7078",
    "accent": "#d95f3f",
    "accent_dark": "#a43e29",
    "green": "#1f8b6d",
    "red": "#bd3f3f",
    "blue": "#2f6f9f",
    "gold": "#f0bd62",
}


def normalise(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold())
    without_marks = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return "".join(ch for ch in without_marks if ch.isalnum() or ch.isspace()).strip()


def levenshtein(left: str, right: str) -> int:
    left = normalise(left)
    right = normalise(right)
    if not left:
        return len(right)
    if not right:
        return len(left)

    previous = list(range(len(right) + 1))
    for i, left_char in enumerate(left, start=1):
        current = [i]
        for j, right_char in enumerate(right, start=1):
            insert = current[j - 1] + 1
            delete = previous[j] + 1
            replace = previous[j - 1] + (left_char != right_char)
            current.append(min(insert, delete, replace))
        previous = current
    return previous[-1]


def fuzzy_match(user_input: str, answer: str) -> bool:
    left = normalise(user_input)
    right = normalise(answer)
    if left == right:
        return True
    threshold = max(1, int(len(right) * 0.2))
    return levenshtein(left, right) <= threshold


def load_list(path: Path) -> list[str]:
    try:
        return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip() in COUNTRIES]
    except OSError:
        return []


def save_list(path: Path, values: list[str]) -> None:
    path.write_text("\n".join(values) + ("\n" if values else ""), encoding="utf-8")


def load_scores(path: Path, cast: Callable[[str], int | float]) -> dict[str, int | float]:
    values: dict[str, int | float] = {}
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            if ":" not in line:
                continue
            key, raw_value = line.split(":", 1)
            try:
                values[key] = cast(raw_value)
            except ValueError:
                continue
    except OSError:
        pass
    return values


def save_scores(path: Path, values: dict[str, int | float]) -> None:
    lines = [f"{key}:{value}" for key, value in sorted(values.items())]
    path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")


@dataclass
class QuizState:
    correct_country: str | None = None
    correct_answer: str | None = None
    current_pool: list[str] = field(default_factory=list)
    session_answered: set[str] = field(default_factory=set)
    session_skipped: set[str] = field(default_factory=set)
    session_incorrect: set[str] = field(default_factory=set)
    session_correct: int = 0
    session_total: int = 0
    streak: int = 0
    question_answered: bool = False
    history: list[str] = field(default_factory=list)


class FlagImageService:
    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "FlagGame/1.0"})
        self.cache: dict[tuple[str, tuple[int, int]], ImageTk.PhotoImage] = {}
        self.resample = getattr(getattr(Image, "Resampling", Image), "LANCZOS")

    def get(self, country: str, size: tuple[int, int]) -> ImageTk.PhotoImage | None:
        key = (country, size)
        if key in self.cache:
            return self.cache[key]

        code = FLAG_CODES.get(country)
        if not code:
            return None

        url = f"https://flagcdn.com/w640/{code.lower()}.png"
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            image = Image.open(BytesIO(response.content)).convert("RGBA")
            image.thumbnail(size, self.resample)
            photo = ImageTk.PhotoImage(image)
        except (requests.RequestException, OSError):
            return None

        self.cache[key] = photo
        return photo


class FlagQuizApp:
    def __init__(self, root: tk.Tk) -> None:
        validate_data()
        self.root = root
        self.root.title(APP_TITLE)
        self.root.geometry("820x780")
        self.root.minsize(720, 660)
        self.root.configure(bg=COLORS["bg"])

        self.image_service = FlagImageService()
        self.states = {"flags": QuizState(), "capitals": QuizState()}
        self.controls: dict[str, dict[str, object]] = {}

        self.revise_flags = load_list(FILES["revise_flags"])
        self.revise_capitals = load_list(FILES["revise_capitals"])
        self.high_scores = load_scores(FILES["high_scores"], int)
        self.session_percentages = load_scores(FILES["session_percentages"], float)

        self.view_mode = tk.StringVar(value="flags")
        self.revise_view_mode = tk.StringVar(value="capitals")
        self.revise_view_continent = tk.StringVar(value="All")
        self.view_load_token = 0

        self.configure_styles()
        self.setup_widgets()
        self.load_question("flags")

    def configure_styles(self) -> None:
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("TNotebook", background=COLORS["bg"], borderwidth=0)
        style.configure("TNotebook.Tab", padding=(18, 10), font=("Segoe UI", 10, "bold"))
        style.map("TNotebook.Tab", background=[("selected", COLORS["panel"])], foreground=[("selected", COLORS["ink"])])
        style.configure("TCombobox", fieldbackground=COLORS["panel_strong"], background=COLORS["panel"])

    def setup_widgets(self) -> None:
        header = tk.Frame(self.root, bg=COLORS["bg"])
        header.pack(fill="x", padx=22, pady=(18, 6))
        tk.Label(
            header,
            text=APP_TITLE,
            bg=COLORS["bg"],
            fg=COLORS["panel_strong"],
            font=("Georgia", 25, "bold"),
        ).pack(anchor="w")
        tk.Label(
            header,
            text="Practise flags and capitals with streaks, hard mode, revision lists and local records.",
            bg=COLORS["bg"],
            fg="#d7cdbf",
            font=("Segoe UI", 10),
        ).pack(anchor="w", pady=(4, 0))

        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True, padx=18, pady=(6, 18))
        self.notebook.bind("<<NotebookTabChanged>>", self.on_tab_change)

        self.flag_tab = self.make_tab("Flag Quiz")
        self.capital_tab = self.make_tab("Capital Quiz")
        self.view_tab = self.make_tab("View All")
        self.revise_tab = self.make_tab("View Revise")

        self.setup_quiz_tab(self.flag_tab, "flags")
        self.setup_quiz_tab(self.capital_tab, "capitals")
        self.setup_view_tab()
        self.setup_revise_tab()

    def make_tab(self, title: str) -> tk.Frame:
        frame = tk.Frame(self.notebook, bg=COLORS["bg"])
        self.notebook.add(frame, text=title)
        return frame

    def setup_quiz_tab(self, parent: tk.Frame, which: str) -> None:
        title = "Flag Quiz" if which == "flags" else "Capital Quiz"
        description = "Name the country from its flag." if which == "flags" else "Name the capital for the country shown."
        revise_label = "Revise" if which == "flags" else "Revise Capitals"

        outer = tk.Frame(parent, bg=COLORS["bg"])
        outer.pack(fill="both", expand=True, padx=16, pady=16)

        intro = tk.Frame(outer, bg=COLORS["bg"])
        intro.pack(fill="x", pady=(0, 12))
        tk.Label(intro, text=title, bg=COLORS["bg"], fg=COLORS["panel_strong"], font=("Georgia", 20, "bold")).pack(anchor="w")
        tk.Label(intro, text=description, bg=COLORS["bg"], fg="#d7cdbf", font=("Segoe UI", 10)).pack(anchor="w", pady=(2, 0))

        toolbar = self.card_frame(outer, bg="#1a2831", pad=12)
        toolbar.pack(fill="x", pady=(0, 12))

        continent_var = tk.StringVar(value="All")
        hard_var = tk.BooleanVar(value=False)
        values = ["All", *CONTINENTS, revise_label]

        tk.Label(toolbar, text="Continent", bg="#1a2831", fg=COLORS["panel_strong"], font=("Segoe UI", 9, "bold")).grid(row=0, column=0, sticky="w")
        continent_menu = ttk.Combobox(toolbar, textvariable=continent_var, values=values, state="readonly", width=24)
        continent_menu.grid(row=1, column=0, sticky="ew", padx=(0, 10), pady=(5, 0))
        continent_menu.bind("<<ComboboxSelected>>", lambda _event, mode=which: self.reset_session(mode))

        revise_button = self.make_button(toolbar, "Add to Revise", lambda mode=which: self.toggle_revise(mode), "subtle")
        revise_button.grid(row=1, column=1, padx=(0, 10), pady=(5, 0))

        hard_check = tk.Checkbutton(
            toolbar,
            text="Hard mode",
            variable=hard_var,
            command=lambda mode=which: self.toggle_hard_mode(mode),
            bg="#1a2831",
            fg=COLORS["panel_strong"],
            activebackground="#1a2831",
            activeforeground=COLORS["panel_strong"],
            selectcolor=COLORS["bg"],
            font=("Segoe UI", 9, "bold"),
        )
        hard_check.grid(row=1, column=2, pady=(5, 0), sticky="w")
        toolbar.columnconfigure(0, weight=1)

        stage = self.card_frame(outer, bg=COLORS["panel"], pad=0)
        stage.pack(fill="both", expand=True)

        flag_shell = tk.Frame(stage, bg=COLORS["panel_strong"], highlightthickness=1, highlightbackground="#d9cfc0")
        flag_shell.pack(fill="x", padx=18, pady=18)
        flag_label = tk.Label(
            flag_shell,
            text="Loading flag...",
            bg=COLORS["panel_strong"],
            fg=COLORS["muted"],
            width=46,
            height=12,
            compound="center",
            font=("Segoe UI", 12, "bold"),
        )
        flag_label.pack(expand=True, pady=14)

        prompt_label = tk.Label(stage, text="", bg=COLORS["panel"], fg=COLORS["accent_dark"], font=("Georgia", 16, "bold"))
        prompt_label.pack(fill="x", padx=18, pady=(0, 12))

        answer_slot = tk.Frame(stage, bg=COLORS["panel"])
        answer_slot.pack(fill="x", padx=18, pady=(0, 12))

        mcq_frame = tk.Frame(answer_slot, bg=COLORS["panel"])
        mcq_buttons: list[tk.Button] = []
        for index in range(4):
            button = self.make_button(mcq_frame, "", lambda i=index, mode=which: self.check_mcq(i, mode), "choice")
            row, column = divmod(index, 2)
            button.grid(row=row, column=column, sticky="ew", padx=5, pady=5)
            mcq_buttons.append(button)
        mcq_frame.columnconfigure(0, weight=1)
        mcq_frame.columnconfigure(1, weight=1)

        text_frame = tk.Frame(answer_slot, bg=COLORS["panel"])
        answer_entry = tk.Entry(text_frame, font=("Segoe UI", 12), relief="flat", bg=COLORS["panel_strong"], fg=COLORS["ink"])
        answer_entry.pack(side="left", fill="x", expand=True, ipady=9, padx=(0, 8))
        answer_entry.bind("<Return>", lambda _event, mode=which: self.check_text_answer(mode))
        submit_button = self.make_button(text_frame, "Submit", lambda mode=which: self.check_text_answer(mode), "primary")
        submit_button.pack(side="left", padx=(0, 8))
        giveup_button = self.make_button(text_frame, "Give Up", lambda mode=which: self.give_up(mode), "danger")
        giveup_button.pack(side="left")

        feedback_label = tk.Label(stage, text="", bg=COLORS["panel"], fg=COLORS["muted"], font=("Segoe UI", 11, "bold"))
        feedback_label.pack(fill="x", padx=18)
        revise_feedback_label = tk.Label(stage, text="", bg=COLORS["panel"], fg=COLORS["blue"], font=("Segoe UI", 9, "bold"))
        revise_feedback_label.pack(fill="x", padx=18, pady=(2, 8))

        stats_frame = tk.Frame(stage, bg=COLORS["panel"])
        stats_frame.pack(fill="x", padx=18, pady=(0, 12))
        score_label = self.stat_label(stats_frame, COLORS["ink"])
        best_label = self.stat_label(stats_frame, COLORS["green"])
        session_label = self.stat_label(stats_frame, COLORS["accent_dark"])
        score_label.grid(row=0, column=0, sticky="ew", padx=(0, 6))
        best_label.grid(row=0, column=1, sticky="ew", padx=6)
        session_label.grid(row=0, column=2, sticky="ew", padx=(6, 0))
        for column in range(3):
            stats_frame.columnconfigure(column, weight=1)

        nav_frame = tk.Frame(stage, bg=COLORS["panel"])
        nav_frame.pack(fill="x", padx=18, pady=(0, 18))
        last_button = self.make_button(nav_frame, "Last", lambda mode=which: self.last_question(mode), "subtle")
        next_button = self.make_button(nav_frame, "Next", lambda mode=which: self.next_question(mode), "subtle")
        next_button.pack(side="right")
        last_button.pack(side="right", padx=(0, 8))

        self.controls[which] = {
            "continent_var": continent_var,
            "hard_var": hard_var,
            "flag_label": flag_label,
            "prompt_label": prompt_label,
            "answer_slot": answer_slot,
            "mcq_frame": mcq_frame,
            "mcq_buttons": mcq_buttons,
            "text_frame": text_frame,
            "answer_entry": answer_entry,
            "submit_button": submit_button,
            "giveup_button": giveup_button,
            "feedback_label": feedback_label,
            "revise_feedback_label": revise_feedback_label,
            "score_label": score_label,
            "best_label": best_label,
            "session_label": session_label,
            "last_button": last_button,
            "revise_button": revise_button,
            "photo": None,
        }
        self.apply_hard_mode_ui(which)

    def setup_view_tab(self) -> None:
        outer = tk.Frame(self.view_tab, bg=COLORS["bg"])
        outer.pack(fill="both", expand=True, padx=16, pady=16)
        self.section_header(outer, "Reference", "Browse every country, flag and capital in the active data set.")

        controls = self.card_frame(outer, bg="#1a2831", pad=10)
        controls.pack(fill="x", pady=(0, 12))
        for text, value in (("Flags", "flags"), ("Capitals", "capitals")):
            tk.Radiobutton(
                controls,
                text=text,
                variable=self.view_mode,
                value=value,
                command=self.update_view_display,
                bg="#1a2831",
                fg=COLORS["panel_strong"],
                activebackground="#1a2831",
                activeforeground=COLORS["panel_strong"],
                selectcolor=COLORS["bg"],
                font=("Segoe UI", 9, "bold"),
            ).pack(side="left", padx=(0, 12))

        self.view_canvas, self.view_content = self.scroll_area(outer)

    def setup_revise_tab(self) -> None:
        outer = tk.Frame(self.revise_tab, bg=COLORS["bg"])
        outer.pack(fill="both", expand=True, padx=16, pady=16)
        self.section_header(outer, "Revision", "Review the countries you marked from either quiz mode.")

        controls = self.card_frame(outer, bg="#1a2831", pad=10)
        controls.pack(fill="x", pady=(0, 12))
        for text, value in (("Capitals", "capitals"), ("Flags", "flags")):
            tk.Radiobutton(
                controls,
                text=text,
                variable=self.revise_view_mode,
                value=value,
                command=self.update_revise_display,
                bg="#1a2831",
                fg=COLORS["panel_strong"],
                activebackground="#1a2831",
                activeforeground=COLORS["panel_strong"],
                selectcolor=COLORS["bg"],
                font=("Segoe UI", 9, "bold"),
            ).pack(side="left", padx=(0, 12))

        continent_menu = ttk.Combobox(
            controls,
            textvariable=self.revise_view_continent,
            values=["All", *CONTINENTS],
            state="readonly",
            width=22,
        )
        continent_menu.pack(side="left", padx=(10, 0))
        continent_menu.bind("<<ComboboxSelected>>", lambda _event: self.update_revise_display())

        self.revise_canvas, self.revise_content = self.scroll_area(outer)

    def card_frame(self, parent: tk.Widget, bg: str, pad: int) -> tk.Frame:
        frame = tk.Frame(parent, bg=bg, padx=pad, pady=pad, highlightthickness=1, highlightbackground="#263946")
        return frame

    def section_header(self, parent: tk.Widget, title: str, text: str) -> None:
        tk.Label(parent, text=title, bg=COLORS["bg"], fg=COLORS["panel_strong"], font=("Georgia", 20, "bold")).pack(anchor="w")
        tk.Label(parent, text=text, bg=COLORS["bg"], fg="#d7cdbf", font=("Segoe UI", 10)).pack(anchor="w", pady=(2, 12))

    def make_button(self, parent: tk.Widget, text: str, command: Callable[[], None], variant: str) -> tk.Button:
        palettes = {
            "primary": (COLORS["accent"], "#ffffff"),
            "danger": (COLORS["red"], "#ffffff"),
            "subtle": ("#263946", COLORS["panel_strong"]),
            "choice": (COLORS["panel_strong"], COLORS["ink"]),
        }
        bg, fg = palettes[variant]
        return tk.Button(
            parent,
            text=text,
            command=command,
            bg=bg,
            fg=fg,
            activebackground=bg,
            activeforeground=fg,
            relief="flat",
            bd=0,
            padx=14,
            pady=9,
            cursor="hand2",
            wraplength=260 if variant == "choice" else 0,
            justify="left" if variant == "choice" else "center",
            font=("Segoe UI", 10, "bold"),
        )

    def stat_label(self, parent: tk.Widget, fg: str) -> tk.Label:
        return tk.Label(parent, text="", bg=COLORS["panel_strong"], fg=fg, font=("Segoe UI", 9, "bold"), padx=10, pady=10)

    def scroll_area(self, parent: tk.Widget) -> tuple[tk.Canvas, tk.Frame]:
        shell = tk.Frame(parent, bg=COLORS["bg"])
        shell.pack(fill="both", expand=True)
        canvas = tk.Canvas(shell, bg=COLORS["bg"], highlightthickness=0)
        scrollbar = ttk.Scrollbar(shell, orient="vertical", command=canvas.yview)
        content = tk.Frame(canvas, bg=COLORS["bg"])
        window = canvas.create_window((0, 0), window=content, anchor="nw")

        def configure_content(_event: tk.Event) -> None:
            canvas.configure(scrollregion=canvas.bbox("all"))

        def configure_canvas(event: tk.Event) -> None:
            canvas.itemconfigure(window, width=event.width)

        content.bind("<Configure>", configure_content)
        canvas.bind("<Configure>", configure_canvas)
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        return canvas, content

    def on_tab_change(self, _event: tk.Event | None = None) -> None:
        index = self.notebook.index("current")
        if index == 0 and not self.states["flags"].correct_country:
            self.load_question("flags")
        elif index == 1 and not self.states["capitals"].correct_country:
            self.load_question("capitals")
        elif index == 2:
            self.update_view_display()
        elif index == 3:
            self.update_revise_display()

    def reset_session(self, which: str) -> None:
        self.states[which] = QuizState()
        self.clear_feedback(which)
        self.load_question(which)

    def toggle_hard_mode(self, which: str) -> None:
        self.apply_hard_mode_ui(which)
        if not self.is_hard(which):
            self.setup_multiple_choice(which)

    def apply_hard_mode_ui(self, which: str) -> None:
        controls = self.controls[which]
        mcq_frame = controls["mcq_frame"]
        text_frame = controls["text_frame"]
        assert isinstance(mcq_frame, tk.Frame)
        assert isinstance(text_frame, tk.Frame)
        mcq_frame.pack_forget()
        text_frame.pack_forget()
        if self.is_hard(which):
            text_frame.pack(fill="x")
        else:
            mcq_frame.pack(fill="x")

    def is_hard(self, which: str) -> bool:
        var = self.controls[which]["hard_var"]
        assert isinstance(var, tk.BooleanVar)
        return bool(var.get())

    def selected_continent(self, which: str) -> str:
        var = self.controls[which]["continent_var"]
        assert isinstance(var, tk.StringVar)
        return var.get()

    def build_pool(self, which: str) -> list[str]:
        continent = self.selected_continent(which)
        if continent == "Revise":
            return list(self.revise_flags)
        if continent == "Revise Capitals":
            return list(self.revise_capitals)
        if continent == "All":
            return list(COUNTRIES)
        return [country for country in COUNTRIES if COUNTRY_CONTINENTS[country] == continent]

    def load_question(self, which: str) -> None:
        controls = self.controls[which]
        state = self.states[which]
        self.clear_feedback(which)

        if not state.current_pool:
            state.current_pool = self.build_pool(which)

        unanswered = [country for country in state.current_pool if country not in state.session_answered]
        if not unanswered and state.session_skipped:
            unanswered = sorted(state.session_skipped)
            state.session_skipped.clear()

        if not unanswered:
            if state.session_total > 0:
                self.show_session_results(which)
            else:
                self.render_empty_question(which)
            return

        country = random.choice(unanswered)
        state.correct_country = country
        state.correct_answer = country if which == "flags" else COUNTRY_CAPITALS.get(country, "Unknown")
        state.question_answered = False
        state.history.append(country)

        prompt = "" if which == "flags" else f"What is the capital of {country}?"
        prompt_label = controls["prompt_label"]
        assert isinstance(prompt_label, tk.Label)
        prompt_label.config(text=prompt)

        self.render_flag(which, country, IMAGE_SIZE)
        self.update_revise_button(which)
        self.update_session_display(which)
        self.update_score_displays(which)

        last_button = controls["last_button"]
        assert isinstance(last_button, tk.Button)
        last_button.config(state=tk.NORMAL if len(state.history) > 1 else tk.DISABLED)

        if self.is_hard(which):
            entry = controls["answer_entry"]
            submit = controls["submit_button"]
            assert isinstance(entry, tk.Entry)
            assert isinstance(submit, tk.Button)
            entry.config(state=tk.NORMAL)
            entry.delete(0, tk.END)
            submit.config(state=tk.NORMAL)
            entry.focus_set()
        else:
            self.setup_multiple_choice(which)

    def render_flag(self, which: str, country: str, size: tuple[int, int]) -> None:
        controls = self.controls[which]
        label = controls["flag_label"]
        assert isinstance(label, tk.Label)
        label.config(text="Loading flag...", image="")
        self.root.update_idletasks()

        photo = self.image_service.get(country, size)
        controls["photo"] = photo
        if photo:
            label.config(image=photo, text="")
        else:
            label.config(image="", text=f"Flag unavailable\n{country}")

    def render_empty_question(self, which: str) -> None:
        controls = self.controls[which]
        label = controls["flag_label"]
        prompt = controls["prompt_label"]
        assert isinstance(label, tk.Label)
        assert isinstance(prompt, tk.Label)
        label.config(image="", text="No items available.")
        prompt.config(text="")
        for button in self.mcq_buttons(which):
            button.config(text="", state=tk.DISABLED)
        entry = controls["answer_entry"]
        submit = controls["submit_button"]
        assert isinstance(entry, tk.Entry)
        assert isinstance(submit, tk.Button)
        entry.config(state=tk.DISABLED)
        submit.config(state=tk.DISABLED)
        self.update_session_display(which)

    def setup_multiple_choice(self, which: str) -> None:
        state = self.states[which]
        if not state.correct_country or not state.current_pool:
            return

        if which == "flags":
            options = [state.correct_country]
            pool = state.current_pool
        else:
            options = [state.correct_answer or ""]
            pool = [COUNTRY_CAPITALS[country] for country in state.current_pool if country in COUNTRY_CAPITALS]

        while len(options) < 4 and len(options) < len(pool):
            choice = random.choice(pool)
            if choice not in options:
                options.append(choice)
        random.shuffle(options)

        for index, button in enumerate(self.mcq_buttons(which)):
            if index < len(options):
                button.config(text=options[index], state=tk.NORMAL)
            else:
                button.config(text="", state=tk.DISABLED)

    def mcq_buttons(self, which: str) -> list[tk.Button]:
        buttons = self.controls[which]["mcq_buttons"]
        assert isinstance(buttons, list)
        return buttons

    def register_attempt(self, which: str) -> bool:
        state = self.states[which]
        first_attempt = state.correct_country not in state.session_answered
        if first_attempt and state.correct_country:
            state.session_total += 1
            state.session_answered.add(state.correct_country)
        state.question_answered = True
        return first_attempt

    def check_mcq(self, index: int, which: str) -> None:
        state = self.states[which]
        if not state.correct_country:
            return
        buttons = self.mcq_buttons(which)
        selected = buttons[index].cget("text")
        correct = state.correct_country if which == "flags" else state.correct_answer
        first_attempt = self.register_attempt(which)

        if selected == correct:
            self.set_feedback(which, "Correct!", True)
            for button in buttons:
                button.config(state=tk.DISABLED)
            if first_attempt:
                state.streak += 1
                state.session_correct += 1
            self.update_scores_and_advance(which)
        else:
            self.set_feedback(which, "Incorrect. Try again.", False)
            state.streak = 0
            if first_attempt:
                state.session_incorrect.add(state.correct_country)
            self.update_score_displays(which)

    def check_text_answer(self, which: str) -> None:
        state = self.states[which]
        if not state.correct_country or not state.correct_answer:
            return
        controls = self.controls[which]
        entry = controls["answer_entry"]
        submit = controls["submit_button"]
        assert isinstance(entry, tk.Entry)
        assert isinstance(submit, tk.Button)

        value = entry.get().strip()
        if not value:
            return

        first_attempt = self.register_attempt(which)
        correct = state.correct_country if which == "flags" else state.correct_answer
        if normalise(value) == normalise(correct) or self.alias_match(which, value) or fuzzy_match(value, correct):
            message = "Correct!" if normalise(value) == normalise(correct) or self.alias_match(which, value) else "Correct! (Close enough)"
            self.set_feedback(which, message, True)
            entry.config(state=tk.DISABLED)
            submit.config(state=tk.DISABLED)
            if first_attempt:
                state.streak += 1
                state.session_correct += 1
            self.update_scores_and_advance(which)
            return

        self.set_feedback(which, "Incorrect. Try again.", False)
        state.streak = 0
        if first_attempt:
            state.session_incorrect.add(state.correct_country)
        self.update_score_displays(which)
        entry.select_range(0, tk.END)

    def alias_match(self, which: str, value: str) -> bool:
        state = self.states[which]
        lookup = normalise(value)
        if which == "flags" and state.correct_country:
            return any(normalise(alias) == lookup for alias in COUNTRY_ALIASES.get(state.correct_country, []))
        if which == "capitals" and state.correct_answer:
            return any(normalise(alias) == lookup for alias in CAPITAL_ALIASES.get(state.correct_answer, []))
        return False

    def update_scores_and_advance(self, which: str) -> None:
        state = self.states[which]
        mode_key = self.mode_key(which)
        if state.streak > int(self.high_scores.get(mode_key, 0)):
            self.high_scores[mode_key] = state.streak
            save_scores(FILES["high_scores"], self.high_scores)
        self.update_score_displays(which)

        if self.selected_continent(which) not in {"Revise", "Revise Capitals"}:
            self.root.after(200, lambda mode=which: self.load_question(mode))
        elif self.is_hard(which):
            controls = self.controls[which]
            entry = controls["answer_entry"]
            submit = controls["submit_button"]
            assert isinstance(entry, tk.Entry)
            assert isinstance(submit, tk.Button)
            entry.config(state=tk.NORMAL)
            entry.delete(0, tk.END)
            submit.config(state=tk.NORMAL)
            entry.focus_set()

    def mode_key(self, which: str) -> str:
        suffix = "hard" if self.is_hard(which) else "normal"
        return f"{which}_{self.selected_continent(which)}_{suffix}"

    def update_score_displays(self, which: str) -> None:
        state = self.states[which]
        key = self.mode_key(which)
        hard_label = "H" if self.is_hard(which) else "N"
        mode = f"{self.selected_continent(which)} ({hard_label})"
        score = self.controls[which]["score_label"]
        best = self.controls[which]["best_label"]
        assert isinstance(score, tk.Label)
        assert isinstance(best, tk.Label)
        score.config(text=f"Streak: {state.streak} | High: {int(self.high_scores.get(key, 0))} ({mode})")
        best.config(text=f"Best Session: {self.session_percentages.get(key, 0)}% ({mode})")

    def update_session_display(self, which: str) -> None:
        state = self.states[which]
        label = self.controls[which]["session_label"]
        assert isinstance(label, tk.Label)
        if not state.current_pool:
            label.config(text="")
            return
        answered = len(state.session_answered)
        total = len(state.current_pool)
        label.config(text=f"Progress: {answered}/{total} | Remaining: {total - answered}")

    def show_session_results(self, which: str) -> None:
        state = self.states[which]
        if state.session_total <= 0:
            return

        percentage = round((state.session_correct / state.session_total) * 1000) / 10
        key = self.mode_key(which)
        old_best = float(self.session_percentages.get(key, 0))
        if percentage > old_best:
            self.session_percentages[key] = percentage
            save_scores(FILES["session_percentages"], self.session_percentages)
            record_text = "New percentage record."
        else:
            record_text = f"Best: {old_best}%."

        wrong = ""
        if state.session_incorrect:
            wrong = "\n\nIncorrect or skipped:\n" + "\n".join(f"- {country}" for country in sorted(state.session_incorrect))

        messagebox.showinfo(
            "Session complete",
            f"Correct: {state.session_correct}/{state.session_total} ({percentage}%).\n{record_text}{wrong}\n\nPress OK to play this mode again.",
        )
        self.reset_session(which)

    def next_question(self, which: str) -> None:
        state = self.states[which]
        if not state.question_answered and state.correct_country:
            state.session_skipped.add(state.correct_country)
            if state.history and state.history[-1] == state.correct_country:
                state.history.pop()
        self.load_question(which)

    def last_question(self, which: str) -> None:
        state = self.states[which]
        if len(state.history) < 2:
            return

        state.history.pop()
        previous = state.history.pop()
        state.correct_country = previous
        state.correct_answer = previous if which == "flags" else COUNTRY_CAPITALS.get(previous, "Unknown")
        state.question_answered = False
        state.history.append(previous)

        prompt = "" if which == "flags" else f"What is the capital of {previous}?"
        prompt_label = self.controls[which]["prompt_label"]
        assert isinstance(prompt_label, tk.Label)
        prompt_label.config(text=prompt)
        self.render_flag(which, previous, IMAGE_SIZE)
        self.update_revise_button(which)
        self.update_session_display(which)
        self.clear_feedback(which)

        if self.is_hard(which):
            entry = self.controls[which]["answer_entry"]
            submit = self.controls[which]["submit_button"]
            assert isinstance(entry, tk.Entry)
            assert isinstance(submit, tk.Button)
            entry.config(state=tk.NORMAL)
            entry.delete(0, tk.END)
            submit.config(state=tk.NORMAL)
            entry.focus_set()
        else:
            self.setup_multiple_choice(which)

    def give_up(self, which: str) -> None:
        state = self.states[which]
        if not state.current_pool:
            self.render_empty_question(which)
            return

        for country in [item for item in state.current_pool if item not in state.session_answered]:
            state.session_incorrect.add(country)
            state.session_total += 1
            state.session_answered.add(country)
        state.streak = 0
        self.show_session_results(which)

    def revise_list(self, which: str) -> list[str]:
        return self.revise_flags if which == "flags" else self.revise_capitals

    def revise_file(self, which: str) -> Path:
        return FILES["revise_flags"] if which == "flags" else FILES["revise_capitals"]

    def toggle_revise(self, which: str) -> None:
        state = self.states[which]
        if not state.correct_country:
            return
        items = self.revise_list(which)
        if state.correct_country in items:
            items.remove(state.correct_country)
            added = False
        else:
            items.append(state.correct_country)
            added = True
        save_list(self.revise_file(which), items)
        self.update_revise_button(which)
        self.set_revise_feedback(which, added)
        self.root.after(3000, lambda mode=which: self.clear_revise_feedback(mode))

    def update_revise_button(self, which: str) -> None:
        button = self.controls[which]["revise_button"]
        state = self.states[which]
        assert isinstance(button, tk.Button)
        text = "Remove from Revise" if state.correct_country in self.revise_list(which) else "Add to Revise"
        button.config(text=text)

    def set_revise_feedback(self, which: str, added: bool) -> None:
        label = self.controls[which]["revise_feedback_label"]
        assert isinstance(label, tk.Label)
        country = self.states[which].correct_country or "country"
        action = "Added" if added else "Removed"
        label.config(text=f"{action} {country} {'to' if added else 'from'} Revise.")

    def clear_revise_feedback(self, which: str) -> None:
        label = self.controls[which]["revise_feedback_label"]
        assert isinstance(label, tk.Label)
        label.config(text="")

    def set_feedback(self, which: str, text: str, ok: bool) -> None:
        label = self.controls[which]["feedback_label"]
        assert isinstance(label, tk.Label)
        label.config(text=text, fg=COLORS["green"] if ok else COLORS["red"])

    def clear_feedback(self, which: str) -> None:
        feedback = self.controls[which]["feedback_label"]
        revise = self.controls[which]["revise_feedback_label"]
        assert isinstance(feedback, tk.Label)
        assert isinstance(revise, tk.Label)
        feedback.config(text="", fg=COLORS["muted"])
        revise.config(text="")

    def clear_frame(self, frame: tk.Frame) -> None:
        for child in frame.winfo_children():
            child.destroy()

    def update_view_display(self) -> None:
        self.view_load_token += 1
        token = self.view_load_token
        self.clear_frame(self.view_content)
        self.view_canvas.yview_moveto(0)
        mode = self.view_mode.get()

        if mode == "capitals":
            for country in COUNTRIES:
                self.reference_row(self.view_content, country, f"Capital: {COUNTRY_CAPITALS.get(country, 'Unknown')}")
            return

        def render_next(index: int) -> None:
            if token != self.view_load_token or index >= len(COUNTRIES):
                return
            country = COUNTRIES[index]
            self.reference_row(self.view_content, country, f"Continent: {COUNTRY_CONTINENTS[country]}", include_flag=True)
            self.root.after(12, lambda: render_next(index + 1))

        render_next(0)

    def reference_row(
        self,
        parent: tk.Frame,
        country: str,
        detail: str,
        include_flag: bool = False,
        title: str | None = None,
    ) -> None:
        row = self.card_frame(parent, bg=COLORS["panel"], pad=10)
        row.pack(fill="x", pady=5)
        if include_flag:
            flag = tk.Label(row, bg=COLORS["panel_strong"], width=96, height=60)
            flag.pack(side="left", padx=(0, 12))
            photo = self.image_service.get(country, THUMB_SIZE)
            flag.image = photo
            if photo:
                flag.config(image=photo)
            else:
                flag.config(text="No flag", fg=COLORS["muted"])

        text = tk.Frame(row, bg=COLORS["panel"])
        text.pack(side="left", fill="x", expand=True)
        tk.Label(text, text=title or country, bg=COLORS["panel"], fg=COLORS["ink"], font=("Georgia", 13, "bold")).pack(anchor="w")
        tk.Label(text, text=detail, bg=COLORS["panel"], fg=COLORS["muted"], font=("Segoe UI", 10)).pack(anchor="w", pady=(2, 0))

    def update_revise_display(self) -> None:
        self.clear_frame(self.revise_content)
        self.revise_canvas.yview_moveto(0)
        mode = self.revise_view_mode.get()
        continent = self.revise_view_continent.get()
        items = list(self.revise_flags if mode == "flags" else self.revise_capitals)
        if continent != "All":
            items = [country for country in items if COUNTRY_CONTINENTS.get(country) == continent]

        if not items:
            self.empty_row(
                self.revise_content,
                "No revision items match this filter. Add countries from the quiz tabs.",
            )
            return

        for index, country in enumerate(items, start=1):
            if mode == "flags":
                self.reference_row(
                    self.revise_content,
                    country,
                    COUNTRY_CONTINENTS[country],
                    include_flag=True,
                    title=f"{index}. {country}",
                )
            else:
                self.reference_row(
                    self.revise_content,
                    country,
                    f"Capital: {COUNTRY_CAPITALS.get(country, 'Unknown')}",
                    title=f"{index}. {country}",
                )

    def empty_row(self, parent: tk.Frame, text: str) -> None:
        row = self.card_frame(parent, bg="#1a2831", pad=16)
        row.pack(fill="x", pady=6)
        tk.Label(row, text=text, bg="#1a2831", fg="#d7cdbf", font=("Segoe UI", 10, "bold")).pack(anchor="w")


if __name__ == "__main__":
    root = tk.Tk()
    app = FlagQuizApp(root)
    root.mainloop()
