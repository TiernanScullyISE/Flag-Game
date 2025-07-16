import tkinter as tk

from tkinter import messagebox, ttk

import random

import requests

from io import BytesIO

from PIL import Image, ImageTk

import difflib

 

# Country to continent mapping (partial, will be extended)

country_continent = {

    "Japan": "Asia", "United Kingdom": "Europe", "Cuba": "North America", "Sri Lanka": "Asia",

    "Germany": "Europe", "Fiji": "Oceania", "France": "Europe", "Colombia": "South America",

    "Switzerland": "Europe", "Sweden": "Europe", "Italy": "Europe", "Spain": "Europe",

    "Israel": "Asia", "India": "Asia", "Greece": "Europe", "Ireland": "Europe",

    "Finland": "Europe", "Brazil": "South America", "Timor-Leste": "Asia", "Kiribati": "Oceania",

    "Poland": "Europe", "Norway": "Europe", "Turkmenistan": "Asia", "Saudi Arabia": "Asia",

    "Panama": "North America", "Belgium": "Europe", "Denmark": "Europe", "Eswatini": "Africa",

    "Ukraine": "Europe", "Nicaragua": "North America", "Portugal": "Europe", "Singapore": "Asia",

    "Nepal": "Asia", "Samoa": "Oceania", "North Korea": "Asia", "Iceland": "Europe",

    "Cyprus": "Europe", "Croatia": "Europe", "Georgia": "Asia", "Russia": "Europe",

    "Albania": "Europe", "Pakistan": "Asia", "Lebanon": "Asia", "Iraq": "Asia",

    "Ecuador": "South America", "Yemen": "Asia", "Rwanda": "Africa", "Bangladesh": "Asia",

    "Romania": "Europe", "Slovakia": "Europe", "Austria": "Europe", "Netherlands": "Europe",

    "Luxembourg": "Europe", "Czechia": "Europe", "Liberia": "Africa", "Iran": "Asia",

    "Estonia": "Europe", "Vatican City": "Europe", "Equatorial Guinea": "Africa", "Syria": "Asia",

    "Malaysia": "Asia", "Antigua and Barbuda": "North America", "Indonesia": "Asia",

    "Dominican Republic": "North America", "Slovenia": "Europe", "Serbia": "Europe",

    "Taiwan": "Asia", "Namibia": "Africa", "North Macedonia": "Europe", "Canada": "North America",

    "Hungary": "Europe", "Saint Lucia": "North America", "South Korea": "Asia", "Guyana": "South America",

    "Latvia": "Europe", "Bahamas": "North America", "Bhutan": "Asia", "Kosovo": "Europe",

    "Angola": "Africa", "Democratic Republic of the Congo": "Africa", "Uruguay": "South America",

    "Monaco": "Europe", "Cambodia": "Asia", "Qatar": "Asia", "Afghanistan": "Asia",

    "Malta": "Europe", "Micronesia": "Oceania", "Zambia": "Africa", "Tajikistan": "Asia",

    "Mexico": "North America", "Bulgaria": "Europe", "Belarus": "Europe", "Bahrain": "Asia",

    "Zimbabwe": "Africa", "Bosnia and Herzegovina": "Europe", "Somalia": "Africa",

    "Paraguay": "South America", "Sudan": "Africa", "Kazakhstan": "Asia", "Benin": "Africa",

    "Thailand": "Asia", "Uzbekistan": "Asia", "Mongolia": "Asia", "Montenegro": "Europe",

    "Chad": "Africa", "China": "Asia", "Guinea-Bissau": "Africa", "Australia": "Oceania",

    "Laos": "Asia", "Madagascar": "Africa", "Jordan": "Asia", "Grenada": "North America",

    "San Marino": "Europe", "Armenia": "Asia", "Andorra": "Europe", "Dominica": "North America",

    "Moldova": "Europe", "Republic of the Congo": "Africa", "Algeria": "Africa", "Cabo Verde": "Africa",

    "Jamaica": "North America", "Vietnam": "Asia", "United Arab Emirates": "Asia", "Belize": "North America",

    "Kuwait": "Asia", "The Gambia": "Africa", "Sierra Leone": "Africa", "Argentina": "South America",

    "Liechtenstein": "Europe", "Bolivia": "South America", "Trinidad and Tobago": "North America",

    "Azerbaijan": "Asia", "Lithuania": "Europe", "Solomon Islands": "Oceania", "Suriname": "South America",

    "Brunei": "Asia", "Honduras": "North America", "Burkina Faso": "Africa", "Palau": "Oceania",

    "New Zealand": "Oceania", "Gabon": "Africa", "Oman": "Asia", "Maldives": "Asia",

    "Guatemala": "North America", "Kyrgyzstan": "Asia", "Central African Republic": "Africa",

    "Niger": "Africa", "El Salvador": "North America", "Vanuatu": "Oceania", "Mali": "Africa",

    "Uganda": "Africa", "Marshall Islands": "Oceania", "Togo": "Africa", "Myanmar": "Asia",

    "Malawi": "Africa", "United States": "North America", "Libya": "Africa", "Djibouti": "Africa",

    "Saint Kitts and Nevis": "North America", "Tanzania": "Africa", "Barbados": "North America",

    "Ivory Coast": "Africa", "Chile": "South America", "South Africa": "Africa", "Türkiye": "Asia",

    "South Sudan": "Africa", "Costa Rica": "North America", "Tunisia": "Africa", "Nauru": "Oceania",

    "Egypt": "Africa", "Philippines": "Asia", "Peru": "South America", "Ghana": "Africa",

    "Mauritania": "Africa", "Venezuela": "South America", "Haiti": "North America", "Cameroon": "Africa",

    "Tonga": "Oceania", "Mauritius": "Africa", "Morocco": "Africa", "Burundi": "Africa",

    "Botswana": "Africa", "Ethiopia": "Africa", "Kenya": "Africa", "Mozambique": "Africa",

    "Senegal": "Africa", "Papua New Guinea": "Oceania", "Nigeria": "Africa", "Palestine": "Asia",

    "Comoros": "Africa", "Seychelles": "Africa", "Saint Vincent and the Grenadines": "North America",

    "Tuvalu": "Oceania", "Guinea": "Africa", "Eritrea": "Africa", "São Tomé and Príncipe": "Africa",

    "Lesotho": "Africa"

}

 

# Country to capital mapping

country_capitals = {

    "Japan": "Tokyo", "United Kingdom": "London", "Cuba": "Havana", "Sri Lanka": "Colombo",

    "Germany": "Berlin", "Fiji": "Suva", "France": "Paris", "Colombia": "Bogotá",

    "Switzerland": "Bern", "Sweden": "Stockholm", "Italy": "Rome", "Spain": "Madrid",

    "Israel": "Jerusalem", "India": "New Delhi", "Greece": "Athens", "Ireland": "Dublin",

    "Finland": "Helsinki", "Brazil": "Brasília", "Timor-Leste": "Dili", "Kiribati": "Tarawa",

    "Poland": "Warsaw", "Norway": "Oslo", "Turkmenistan": "Ashgabat", "Saudi Arabia": "Riyadh",

    "Panama": "Panama City", "Belgium": "Brussels", "Denmark": "Copenhagen", "Eswatini": "Mbabane",

    "Ukraine": "Kyiv", "Nicaragua": "Managua", "Portugal": "Lisbon", "Singapore": "Singapore",

    "Nepal": "Kathmandu", "Samoa": "Apia", "North Korea": "Pyongyang", "Iceland": "Reykjavik",

    "Cyprus": "Nicosia", "Croatia": "Zagreb", "Georgia": "Tbilisi", "Russia": "Moscow",

    "Albania": "Tirana", "Pakistan": "Islamabad", "Lebanon": "Beirut", "Iraq": "Baghdad",

    "Ecuador": "Quito", "Yemen": "Sanaa", "Rwanda": "Kigali", "Bangladesh": "Dhaka",

    "Romania": "Bucharest", "Slovakia": "Bratislava", "Austria": "Vienna", "Netherlands": "Amsterdam",

    "Luxembourg": "Luxembourg City", "Czechia": "Prague", "Liberia": "Monrovia", "Iran": "Tehran",

    "Estonia": "Tallinn", "Vatican City": "Vatican City", "Equatorial Guinea": "Malabo", "Syria": "Damascus",

    "Malaysia": "Kuala Lumpur", "Antigua and Barbuda": "Saint John's", "Indonesia": "Jakarta",

    "Dominican Republic": "Santo Domingo", "Slovenia": "Ljubljana", "Serbia": "Belgrade",

    "Taiwan": "Taipei", "Namibia": "Windhoek", "North Macedonia": "Skopje", "Canada": "Ottawa",

    "Hungary": "Budapest", "Saint Lucia": "Castries", "South Korea": "Seoul", "Guyana": "Georgetown",

    "Latvia": "Riga", "Bahamas": "Nassau", "Bhutan": "Thimphu", "Kosovo": "Pristina",

    "Angola": "Luanda", "Democratic Republic of the Congo": "Kinshasa", "Uruguay": "Montevideo",

    "Monaco": "Monaco", "Cambodia": "Phnom Penh", "Qatar": "Doha", "Afghanistan": "Kabul",

    "Malta": "Valletta", "Micronesia": "Palikir", "Zambia": "Lusaka", "Tajikistan": "Dushanbe",

    "Mexico": "Mexico City", "Bulgaria": "Sofia", "Belarus": "Minsk", "Bahrain": "Manama",

    "Zimbabwe": "Harare", "Bosnia and Herzegovina": "Sarajevo", "Somalia": "Mogadishu",

    "Paraguay": "Asunción", "Sudan": "Khartoum", "Kazakhstan": "Nur-Sultan", "Benin": "Porto-Novo",

    "Thailand": "Bangkok", "Uzbekistan": "Tashkent", "Mongolia": "Ulaanbaatar", "Montenegro": "Podgorica",

    "Chad": "N'Djamena", "China": "Beijing", "Guinea-Bissau": "Bissau", "Australia": "Canberra",

    "Laos": "Vientiane", "Madagascar": "Antananarivo", "Jordan": "Amman", "Grenada": "Saint George's",

    "San Marino": "San Marino", "Armenia": "Yerevan", "Andorra": "Andorra la Vella", "Dominica": "Roseau",

    "Moldova": "Chișinău", "Republic of the Congo": "Brazzaville", "Algeria": "Algiers", "Cabo Verde": "Praia",

    "Jamaica": "Kingston", "Vietnam": "Hanoi", "United Arab Emirates": "Abu Dhabi", "Belize": "Belmopan",

    "Kuwait": "Kuwait City", "The Gambia": "Banjul", "Sierra Leone": "Freetown", "Argentina": "Buenos Aires",

    "Liechtenstein": "Vaduz", "Bolivia": "Sucre", "Trinidad and Tobago": "Port of Spain",

    "Azerbaijan": "Baku", "Lithuania": "Vilnius", "Solomon Islands": "Honiara", "Suriname": "Paramaribo",

    "Brunei": "Bandar Seri Begawan", "Honduras": "Tegucigalpa", "Burkina Faso": "Ouagadougou", "Palau": "Ngerulmud",

    "New Zealand": "Wellington", "Gabon": "Libreville", "Oman": "Muscat", "Maldives": "Malé",

    "Guatemala": "Guatemala City", "Kyrgyzstan": "Bishkek", "Central African Republic": "Bangui",

    "Niger": "Niamey", "El Salvador": "San Salvador", "Vanuatu": "Port Vila", "Mali": "Bamako",

    "Uganda": "Kampala", "Marshall Islands": "Majuro", "Togo": "Lomé", "Myanmar": "Naypyidaw",

    "Malawi": "Lilongwe", "United States": "Washington, D.C.", "Libya": "Tripoli", "Djibouti": "Djibouti",

    "Saint Kitts and Nevis": "Basseterre", "Tanzania": "Dodoma", "Barbados": "Bridgetown",

    "Ivory Coast": "Yamoussoukro", "Chile": "Santiago", "South Africa": "Cape Town", "Türkiye": "Ankara",

    "South Sudan": "Juba", "Costa Rica": "San José", "Tunisia": "Tunis", "Nauru": "Yaren",

    "Egypt": "Cairo", "Philippines": "Manila", "Peru": "Lima", "Ghana": "Accra",

    "Mauritania": "Nouakchott", "Venezuela": "Caracas", "Haiti": "Port-au-Prince", "Cameroon": "Yaoundé",

    "Tonga": "Nuku'alofa", "Mauritius": "Port Louis", "Morocco": "Rabat", "Burundi": "Gitega",

    "Botswana": "Gaborone", "Ethiopia": "Addis Ababa", "Kenya": "Nairobi", "Mozambique": "Maputo",

    "Senegal": "Dakar", "Papua New Guinea": "Port Moresby", "Nigeria": "Abuja", "Palestine": "Ramallah",

    "Comoros": "Moroni", "Seychelles": "Victoria", "Saint Vincent and the Grenadines": "Kingstown",

    "Tuvalu": "Funafuti", "Guinea": "Conakry", "Eritrea": "Asmara", "São Tomé and Príncipe": "São Tomé",

    "Lesotho": "Maseru"

}

 

countries = list(country_continent.keys())

 

class FlagQuizApp:

    def __init__(self, root):

        self.root = root

        self.root.title("Flag & Capital Quiz")

        self.root.geometry("400x600")

        self.root.resizable(False, False)  # Prevent resizing to maintain layout

       

        # Core data and settings

        self.selected_continent = tk.StringVar(value="All")

        self.revise_flags = self.load_revise_flags()

        self.revise_capitals = self.load_revise_capitals()

        self.streak = 0

        self.high_scores = self.load_high_scores()

        self.session_percentages = self.load_session_percentages()

        self.hard_mode = tk.BooleanVar(value=False)

        self.correct_country = None

        self.correct_answer = None  # For capitals, this will be the capital name

        self.quiz_type = "flags"  # "flags" or "capitals"

       

        # Session tracking variables

        self.session_flags_seen = []

        self.session_correct = 0

        self.session_total = 0

        self.current_pool = []

        self.session_answered = set()

        self.session_skipped = set()

        self.session_incorrect = set()

        self.question_answered = False

        self.flag_history = []

       

        self.setup_widgets()

        self.load_new_question()

 

    def setup_widgets(self):

        # Create notebook for tabs

        self.notebook = ttk.Notebook(self.root)

        self.notebook.pack(fill="both", expand=True, padx=5, pady=5)

       

        # Create tabs

        self.flag_tab = ttk.Frame(self.notebook)

        self.capital_tab = ttk.Frame(self.notebook)

        self.view_tab = ttk.Frame(self.notebook)

        self.view_revise_tab = ttk.Frame(self.notebook)

       

        self.notebook.add(self.flag_tab, text="Flag Quiz")

        self.notebook.add(self.capital_tab, text="Capital Quiz")

        self.notebook.add(self.view_tab, text="View All")

        self.notebook.add(self.view_revise_tab, text="View Revise")

       

        # Bind tab change event

        self.notebook.bind("<<NotebookTabChanged>>", self.on_tab_change)

       

        # Setup each tab

        self.setup_quiz_tab(self.flag_tab, "flags")

        self.setup_quiz_tab(self.capital_tab, "capitals")

        self.setup_view_tab()

        self.setup_view_revise_tab()

 

    def setup_quiz_tab(self, parent, quiz_type):

        # Mode selection frame

        mode_frame = tk.Frame(parent)

        mode_frame.pack(pady=3)

       

        continent_values = ["All"] + sorted(set(country_continent.values()))

        if quiz_type == "flags":

            continent_values.append("Revise")

        else:

            continent_values.append("Revise Capitals")

       

        continent_menu = ttk.Combobox(mode_frame, textvariable=self.selected_continent,

                                    values=continent_values, width=12)

        continent_menu.pack(side=tk.LEFT, padx=2)

        continent_menu.bind("<<ComboboxSelected>>", lambda e: self.on_mode_change())

       

        # Store reference for easy access

        setattr(self, f"{quiz_type}_continent_menu", continent_menu)

       

        add_revise_button = tk.Button(mode_frame, text="Revise", font=("Arial", 8),

                                    command=lambda: self.toggle_revise(quiz_type))

        add_revise_button.pack(side=tk.LEFT, padx=2)

        setattr(self, f"{quiz_type}_add_revise_button", add_revise_button)

       

        hard_mode_check = tk.Checkbutton(mode_frame, text="Hard", font=("Arial", 8),

                                       variable=self.hard_mode, command=self.toggle_mode)

        hard_mode_check.pack(side=tk.LEFT, padx=2)

       

        # Quiz content area

        content_frame = tk.Frame(parent)

        content_frame.pack(fill="both", expand=True, padx=3)

       

        # Image/question label

        if quiz_type == "flags":

            question_label = tk.Label(content_frame, width=320)

        else:

            question_label = tk.Label(content_frame, font=("Arial", 14, "bold"),

                                    wraplength=200, justify="center", width=320)

        question_label.pack(pady=5)

        setattr(self, f"{quiz_type}_question_label", question_label)

       

        # Multiple choice buttons

        buttons_frame = tk.Frame(content_frame)

        buttons_frame.pack()

        buttons = []

        for i in range(4):

            btn = tk.Button(buttons_frame, text="", width=28, height=1, font=("Arial", 9),

                          command=lambda i=i, qt=quiz_type: self.check_answer(i, qt))

            btn.pack(pady=2)

            buttons.append(btn)

        setattr(self, f"{quiz_type}_buttons_frame", buttons_frame)

        setattr(self, f"{quiz_type}_buttons", buttons)

       

        # Text input for hard mode

        text_frame = tk.Frame(content_frame)

        text_entry = tk.Entry(text_frame, width=25, font=("Arial", 10))

        text_entry.pack(side=tk.LEFT, padx=2)

        text_entry.bind("<Return>", lambda e: self.check_text_answer(quiz_type))

        setattr(self, f"{quiz_type}_text_frame", text_frame)

        setattr(self, f"{quiz_type}_text_entry", text_entry)

       

        submit_button = tk.Button(text_frame, text="Submit", font=("Arial", 8),

                                command=lambda: self.check_text_answer(quiz_type))

        submit_button.pack(side=tk.LEFT, padx=1)

        setattr(self, f"{quiz_type}_submit_button", submit_button)

       

        give_up_button = tk.Button(text_frame, text="Give Up", font=("Arial", 8),

                                 command=lambda: self.give_up(quiz_type))

        give_up_button.pack(side=tk.LEFT, padx=1)

        setattr(self, f"{quiz_type}_give_up_button", give_up_button)

       

        # Feedback and scoring labels

        feedback_label = tk.Label(content_frame, text="", font=("Arial", 10))

        feedback_label.pack(pady=1)

        setattr(self, f"{quiz_type}_feedback_label", feedback_label)

       

        revise_feedback_label = tk.Label(content_frame, text="", font=("Arial", 8), fg="blue")

        revise_feedback_label.pack(pady=1)

        setattr(self, f"{quiz_type}_revise_feedback_label", revise_feedback_label)

       

        # Create a compact info frame for all status information

        info_frame = tk.Frame(content_frame)

        info_frame.pack(pady=2)

       

        score_label = tk.Label(info_frame, text="", font=("Arial", 8, "bold"), wraplength=320)

        score_label.pack()

        setattr(self, f"{quiz_type}_score_label", score_label)

       

        percentage_label = tk.Label(info_frame, text="", font=("Arial", 8), fg="darkgreen", wraplength=320)

        percentage_label.pack()

        setattr(self, f"{quiz_type}_percentage_label", percentage_label)

       

        session_label = tk.Label(info_frame, text="", font=("Arial", 8), fg="purple", wraplength=320)

        session_label.pack()

        setattr(self, f"{quiz_type}_session_label", session_label)

       

        # Navigation buttons - make them smaller

        nav_frame = tk.Frame(content_frame)

        nav_frame.pack(pady=3)

        setattr(self, f"{quiz_type}_nav_frame", nav_frame)

       

        last_button = tk.Button(nav_frame, text="← Last", font=("Arial", 8),

                              command=lambda: self.last_question(quiz_type))

        last_button.pack(side=tk.LEFT, padx=3)

        setattr(self, f"{quiz_type}_last_button", last_button)

       

        next_button = tk.Button(nav_frame, text="Next →", font=("Arial", 8),

                              command=lambda: self.next_question(quiz_type))

        next_button.pack(side=tk.LEFT, padx=3)

        setattr(self, f"{quiz_type}_next_button", next_button)

 

    def setup_view_tab(self):

        # View All tab setup

        view_frame = tk.Frame(self.view_tab)

        view_frame.pack(fill="both", expand=True, padx=10, pady=10)

       

        # Tab selection for view mode

        view_mode_frame = tk.Frame(view_frame)

        view_mode_frame.pack(pady=10)

       

        tk.Label(view_mode_frame, text="View:", font=("Arial", 12)).pack(side=tk.LEFT, padx=5)

       

        self.view_mode = tk.StringVar(value="flags")

        flags_radio = tk.Radiobutton(view_mode_frame, text="Flags", variable=self.view_mode,

                                   value="flags", command=self.update_view_display)

        flags_radio.pack(side=tk.LEFT, padx=5)

       

        capitals_radio = tk.Radiobutton(view_mode_frame, text="Capitals", variable=self.view_mode,

                                      value="capitals", command=self.update_view_display)

        capitals_radio.pack(side=tk.LEFT, padx=5)

       

        # Scrollable display area

        view_canvas = tk.Canvas(view_frame, width=800, height=500)

        view_scrollbar = tk.Scrollbar(view_frame, orient="vertical", command=view_canvas.yview)

        view_scrollable_frame = tk.Frame(view_canvas)

       

        view_scrollable_frame.bind(

            "<Configure>",

            lambda e: view_canvas.configure(scrollregion=view_canvas.bbox("all"))

        )

       

        view_canvas.create_window((0, 0), window=view_scrollable_frame, anchor="nw")

        view_canvas.configure(yscrollcommand=view_scrollbar.set)

       

        view_canvas.pack(side="left", fill="both", expand=True)

        view_scrollbar.pack(side="right", fill="y")

       

        self.view_canvas = view_canvas

        self.view_scrollable_frame = view_scrollable_frame

 

    def setup_view_revise_tab(self):

        # View Revise tab setup

        view_revise_frame = tk.Frame(self.view_revise_tab)

        view_revise_frame.pack(fill="both", expand=True, padx=10, pady=10)

 

        # Header

        header_frame = tk.Frame(view_revise_frame)

        header_frame.pack(pady=10)

        tk.Label(header_frame, text="Revision Lists", font=("Arial", 16, "bold")).pack()

 

        # Tab selection for revise mode

        revise_mode_frame = tk.Frame(view_revise_frame)

        revise_mode_frame.pack(pady=5)

        tk.Label(revise_mode_frame, text="View:", font=("Arial", 12)).pack(side=tk.LEFT, padx=5)

        self.revise_mode = tk.StringVar(value="capitals")

        capitals_revise_radio = tk.Radiobutton(revise_mode_frame, text="Capital Revise", variable=self.revise_mode, value="capitals", command=self.update_view_revise_display)

        capitals_revise_radio.pack(side=tk.LEFT, padx=5)

        flags_revise_radio = tk.Radiobutton(revise_mode_frame, text="Flag Revise", variable=self.revise_mode, value="flags", command=self.update_view_revise_display)

        flags_revise_radio.pack(side=tk.LEFT, padx=5)

 

        # Continent filter

        continent_frame = tk.Frame(view_revise_frame)

        continent_frame.pack(pady=5)

        tk.Label(continent_frame, text="Continent:", font=("Arial", 12)).pack(side=tk.LEFT, padx=5)

        self.revise_continent = tk.StringVar(value="All")

        continent_options = ["All"] + sorted(set(country_continent.values()))

        continent_menu = ttk.Combobox(continent_frame, textvariable=self.revise_continent, values=continent_options, width=15, state="readonly")

        continent_menu.pack(side=tk.LEFT, padx=5)

        continent_menu.bind("<<ComboboxSelected>>", lambda e: self.update_view_revise_display())

        self.revise_continent_menu = continent_menu

 

        # Scrollable display area for revise lists (fix scrolling)

        revise_canvas = tk.Canvas(view_revise_frame, width=370, height=400)

        revise_scrollbar = tk.Scrollbar(view_revise_frame, orient="vertical", command=revise_canvas.yview)

        revise_canvas.pack(side="left", fill="both", expand=True)

        revise_scrollbar.pack(side="right", fill="y")

        revise_scrollable_frame = tk.Frame(revise_canvas)

        self.revise_canvas = revise_canvas

        self.revise_scrollable_frame = revise_scrollable_frame

        # Add mousewheel scrolling

        def _on_mousewheel(event):

            revise_canvas.yview_scroll(int(-1*(event.delta/120)), "units")

        revise_canvas.bind_all("<MouseWheel>", _on_mousewheel)

        revise_scrollable_frame.bind(

            "<Configure>",

            lambda e: revise_canvas.configure(scrollregion=revise_canvas.bbox("all"))

        )

        revise_canvas.create_window((0, 0), window=revise_scrollable_frame, anchor="nw")

        revise_canvas.configure(yscrollcommand=revise_scrollbar.set)

 

    def on_tab_change(self, event=None):

        """Handle tab changes"""

        current_tab = self.notebook.tab(self.notebook.select(), "text")

       

        if current_tab == "Flag Quiz":

            self.quiz_type = "flags"

            self.selected_continent.set("All")

            self.flags_continent_menu.config(textvariable=self.selected_continent)

        elif current_tab == "Capital Quiz":

            self.quiz_type = "capitals"

            self.selected_continent.set("All")

            self.capitals_continent_menu.config(textvariable=self.selected_continent)

        elif current_tab == "View All":

            self.update_view_display()

            return

        elif current_tab == "View Revise":

            self.update_view_revise_display()

            return

       

        # Reset session for quiz tabs

        self.reset_session()

 

    def update_view_display(self):

        """Update the view all display based on selected mode"""

        if self.view_mode.get() == "flags":

            self.show_all_flags()

        else:

            self.show_all_capitals()

 

    def update_view_revise_display(self):

        """Update the view revise display based on selected mode"""

        if self.revise_mode.get() == "flags":

            self.show_revise_flags()

        else:

            self.show_revise_capitals()

 

    def show_all_capitals(self):

        """Display all countries with their capitals"""

        # Clear previous content

        for widget in self.view_scrollable_frame.winfo_children():

            widget.destroy()

       

        # Add loading message

        loading_label = tk.Label(self.view_scrollable_frame, text="Loading capitals... Please wait",

                               font=("Arial", 14), fg="blue")

        loading_label.grid(row=0, column=0, columnspan=3, pady=20)

       

        # Update the display

        self.root.update()

       

        # Create grid of countries and capitals

        row = 1

        col = 0

        max_cols = 3

       

        sorted_countries = sorted(countries)

       

        for country in sorted_countries:

            capital = country_capitals.get(country, "Unknown")

           

            item_frame = tk.Frame(self.view_scrollable_frame, relief=tk.RAISED, borderwidth=1)

            item_frame.grid(row=row, column=col, padx=5, pady=5, sticky="nsew")

           

            # Country name

            country_label = tk.Label(item_frame, text=country, font=("Arial", 12, "bold"),

                                   wraplength=200, justify="center")

            country_label.pack(pady=2)

           

            # Capital name

            capital_label = tk.Label(item_frame, text=f"Capital: {capital}",

                                   font=("Arial", 10), wraplength=200, justify="center")

            capital_label.pack(pady=2)

           

            col += 1

            if col >= max_cols:

                col = 0

                row += 1

       

        # Remove loading message

        loading_label.destroy()

 

    def show_revise_flags(self):

        """Display all countries in the flags revise list, scrollable, filterable, with flag images and country name, smaller flag size"""

        for widget in self.revise_scrollable_frame.winfo_children():

            widget.destroy()

        continent = self.revise_continent.get()

        if continent == "All":

            filtered_flags = self.revise_flags.copy()

        else:

            filtered_flags = [c for c in self.revise_flags if country_continent.get(c) == continent]

        if not filtered_flags:

            no_items_label = tk.Label(self.revise_scrollable_frame, text="No flags in your revise list for this continent.\nAdd flags to revise from the Flag Quiz tab.", font=("Arial", 14), fg="gray", justify="center")

            no_items_label.pack(pady=50)

            return

        header_label = tk.Label(self.revise_scrollable_frame, text=f"Flags to Revise ({len(filtered_flags)} countries)", font=("Arial", 14, "bold"), fg="darkblue")

        header_label.pack(pady=10)

        for i, country in enumerate(sorted(filtered_flags), 1):

            item_frame = tk.Frame(self.revise_scrollable_frame, relief=tk.RAISED, borderwidth=1)

            item_frame.pack(fill="x", padx=10, pady=2)

            # Flag image (smaller size)

            flag_img = self.get_flag_image_for_revise(country)

            if flag_img:

                flag_label = tk.Label(item_frame, image=flag_img)

                flag_label.image = flag_img

                flag_label.pack(side=tk.LEFT, padx=5)

            else:

                flag_label = tk.Label(item_frame, text="No flag", width=8, bg="lightgray")

                flag_label.pack(side=tk.LEFT, padx=5)

            # Country name

            country_label = tk.Label(item_frame, text=f"{i}. {country}", font=("Arial", 11), anchor="w", padx=8, pady=2)

            country_label.pack(side=tk.LEFT, fill="x")

 

    def get_flag_image_for_revise(self, country):

        """Get a smaller flag image for the revise list"""

        try:

            api_country_name = country

            country_code = None

            if country == "Ivory Coast":

                country_code = "ci"

            elif country == "Türkiye":

                api_country_name = "Turkey"

            elif country == "United States":

                api_country_name = "United States of America"

            elif country == "United Kingdom":

                api_country_name = "United Kingdom of Great Britain and Northern Ireland"

            elif country == "Cabo Verde":

                api_country_name = "Cape Verde"

            elif country == "The Gambia":

                api_country_name = "Gambia"

            if country_code:

                flag_url = f"https://flagcdn.com/w80/{country_code}.png"

                try:

                    response = requests.get(flag_url, timeout=10, headers={

                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

                    })

                    if response.status_code == 200:

                        img = Image.open(BytesIO(response.content)).resize((60, 38))

                        return ImageTk.PhotoImage(img)

                except:

                    pass

            else:

                try:

                    response = requests.get(f"https://restcountries.com/v3.1/name/{api_country_name}?fullText=true", timeout=15)

                    if response.status_code == 200:

                        data = response.json()

                        code = data[0]['cca2'].lower()

                        flag_url = f"https://flagcdn.com/w80/{code}.png"

                        flag_response = requests.get(flag_url, timeout=15)

                        if flag_response.status_code == 200:

                            img = Image.open(BytesIO(flag_response.content)).resize((60, 38))

                            return ImageTk.PhotoImage(img)

                except:

                    pass

        except:

            pass

        return None

 

    def show_revise_capitals(self):

        """Display all countries in the capitals revise list with their capitals, scrollable, filterable"""

        for widget in self.revise_scrollable_frame.winfo_children():

            widget.destroy()

        continent = self.revise_continent.get()

        if continent == "All":

            filtered_capitals = self.revise_capitals.copy()

        else:

            filtered_capitals = [c for c in self.revise_capitals if country_continent.get(c) == continent]

        if not filtered_capitals:

            no_items_label = tk.Label(self.revise_scrollable_frame, text="No capitals in your revise list for this continent.\nAdd capitals to revise from the Capital Quiz tab.", font=("Arial", 14), fg="gray", justify="center")

            no_items_label.pack(pady=50)

            return

        header_label = tk.Label(self.revise_scrollable_frame, text=f"Capitals to Revise ({len(filtered_capitals)} countries)", font=("Arial", 14, "bold"), fg="darkblue")

        header_label.pack(pady=10)

        for i, country in enumerate(sorted(filtered_capitals), 1):

            capital = country_capitals.get(country, "Unknown")

            item_frame = tk.Frame(self.revise_scrollable_frame, relief=tk.RAISED, borderwidth=1)

            item_frame.pack(fill="x", padx=10, pady=2)

            country_label = tk.Label(item_frame, text=f"{i}. {country}", font=("Arial", 12, "bold"), anchor="w", padx=10, pady=2)

            country_label.pack(side=tk.LEFT, fill="x")

            capital_label = tk.Label(item_frame, text=f"Capital: {capital}", font=("Arial", 11), fg="darkgreen", anchor="w", padx=20, pady=2)

            capital_label.pack(side=tk.LEFT, fill="x")

 

    def on_mode_change(self):

        """Handle mode changes from the dropdown"""

        self.toggle_mode()  # Switch UI mode first

        self.reset_session()  # Reset session for quiz modes

 

    def toggle_mode(self):

        """Toggle between hard mode and normal mode for current quiz type"""

        if self.quiz_type == "flags":

            self.toggle_mode_for_tab("flags")

        elif self.quiz_type == "capitals":

            self.toggle_mode_for_tab("capitals")

 

    def toggle_mode_for_tab(self, quiz_type):

        """Toggle mode for specific quiz type tab"""

        buttons_frame = getattr(self, f"{quiz_type}_buttons_frame")

        text_frame = getattr(self, f"{quiz_type}_text_frame")

        text_entry = getattr(self, f"{quiz_type}_text_entry")

        submit_button = getattr(self, f"{quiz_type}_submit_button")

        give_up_button = getattr(self, f"{quiz_type}_give_up_button")

        buttons = getattr(self, f"{quiz_type}_buttons")

       

        if self.hard_mode.get():

            # Hard mode: show text input, hide multiple choice

            buttons_frame.pack_forget()

            text_frame.pack(pady=10)

            give_up_button.pack(side=tk.LEFT, padx=5)

           

            if hasattr(self, 'correct_country') and self.correct_country:

                text_entry.config(state=tk.NORMAL)

                text_entry.delete(0, tk.END)

                submit_button.config(state=tk.NORMAL)

                text_entry.focus()

        else:

            # Normal mode: show multiple choice, hide text input

            text_frame.pack_forget()

            buttons_frame.pack()

            give_up_button.pack_forget()

           

            # Set up multiple choice for current question if one exists

            if hasattr(self, 'correct_country') and self.correct_country and hasattr(self, 'current_pool') and self.current_pool:

                self.setup_multiple_choice(quiz_type)

 

    def setup_multiple_choice(self, quiz_type):

        """Set up multiple choice options for the current question"""

        buttons = getattr(self, f"{quiz_type}_buttons")

       

        if quiz_type == "flags":

            options = [self.correct_country]

            pool = self.current_pool

        else:  # capitals

            options = [self.correct_answer]  # correct_answer is the capital name

            pool = [country_capitals[country] for country in self.current_pool if country in country_capitals]

       

        while len(options) < 4 and len(options) < len(pool):

            choice = random.choice(pool)

            if choice not in options:

                options.append(choice)

        random.shuffle(options)

       

        for i, btn in enumerate(buttons):

            if i < len(options):

                btn.config(text=options[i], state=tk.NORMAL)

            else:

                btn.config(text="", state=tk.DISABLED)

 

    def reset_session(self):

        """Reset session tracking when changing modes"""

        self.session_flags_seen = []

        self.session_correct = 0

        self.session_total = 0

        self.current_pool = []

        self.session_answered = set()

        self.session_skipped = set()

        self.session_incorrect = set()

        self.question_answered = False

        self.flag_history = []

        self.update_session_display()

        self.load_new_question()

 

    def update_session_display(self):

        """Update the session progress display"""

        if hasattr(self, f"{self.quiz_type}_session_label"):

            session_label = getattr(self, f"{self.quiz_type}_session_label")

            if self.current_pool:

                answered = len(self.session_answered)

                total = len(self.current_pool)

                remaining = total - answered

                session_label.config(text=f"Progress: {answered}/{total} | Remaining: {remaining}")

            else:

                session_label.config(text="")

 

    def update_score_displays(self):

        """Update score and percentage displays for current quiz type"""

        if hasattr(self, f"{self.quiz_type}_score_label"):

            score_label = getattr(self, f"{self.quiz_type}_score_label")

            percentage_label = getattr(self, f"{self.quiz_type}_percentage_label")

            score_label.config(text=self.get_score_text())

            percentage_label.config(text=self.get_percentage_text())

 

    def show_session_results(self):

        """Show session completion results and ask to play again"""

        if self.session_total > 0:

            percentage = round((self.session_correct / self.session_total) * 100, 1)

            current_mode = self.selected_continent.get()

            mode_suffix = "_hard" if self.hard_mode.get() else "_normal"

            percentage_key = current_mode + mode_suffix

          

            # Check if this is a new percentage record

            old_percentage = self.session_percentages.get(percentage_key, 0)

            if percentage > old_percentage:

                self.session_percentages[percentage_key] = percentage

                self.save_session_percentages()

                percentage_message = f" 🎉 NEW PERCENTAGE RECORD!"

            else:

                percentage_message = f" (Best: {old_percentage}%)"

          

            # Show incorrect flags if any

            if self.session_incorrect:

                self.show_incorrect_flags_dialog(percentage, percentage_message)

            else:

                # Perfect score - just show completion message

                message = f"Session Complete!\n\nYou got {self.session_correct}/{self.session_total} flags correct ({percentage}%){percentage_message}\n\nWould you like to play this mode again?"

              

                result = messagebox.askyesno("Session Complete", message)

                if result:

                    self.reset_session()

                else:

                    # Stay on the completion screen

                    self.flag_label.config(text=f"Session Complete: {percentage}% correct", image="")

                    for btn in self.buttons:

                        btn.config(text="", state=tk.DISABLED)

                    self.text_entry.config(state=tk.DISABLED)

                    self.submit_button.config(state=tk.DISABLED)

 

    def show_incorrect_flags_dialog(self, percentage, percentage_message):

        """Show dialog with incorrect flags and option to add to revise"""

        # Create a new window for incorrect flags

        results_window = tk.Toplevel(self.root)

        results_window.title("Session Results")

        results_window.geometry("600x500")

        results_window.transient(self.root)

        results_window.grab_set()

      

        # Results header

        header_text = f"Session Complete!\n\nYou got {self.session_correct}/{self.session_total} flags correct ({percentage}%){percentage_message}"

        header_label = tk.Label(results_window, text=header_text, font=("Arial", 12, "bold"), pady=10)

        header_label.pack()

      

        # Incorrect flags section

        if self.session_incorrect:

            incorrect_label = tk.Label(results_window, text=f"Flags you got wrong ({len(self.session_incorrect)}):",

                                     font=("Arial", 11, "bold"), fg="red")

            incorrect_label.pack(pady=(10, 5))

          

            # Scrollable frame for incorrect flags

            canvas = tk.Canvas(results_window, height=200)

            scrollbar = tk.Scrollbar(results_window, orient="vertical", command=canvas.yview)

            scrollable_frame = tk.Frame(canvas)

          

            scrollable_frame.bind(

                "<Configure>",

                lambda e: canvas.configure(scrollregion=canvas.bbox("all"))

            )

          

            canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")

            canvas.configure(yscrollcommand=scrollbar.set)

          

            # Track which flags to add to revise

            revise_vars = {}

          

            # Add checkboxes for each incorrect flag

            for i, flag in enumerate(sorted(self.session_incorrect)):

                var = tk.BooleanVar()

                revise_vars[flag] = var

              

                flag_frame = tk.Frame(scrollable_frame)

                flag_frame.pack(fill="x", padx=5, pady=2)

              

                check = tk.Checkbutton(flag_frame, variable=var, text=flag,

                                     font=("Arial", 10), anchor="w")

                check.pack(fill="x")

          

            canvas.pack(side="left", fill="both", expand=True, padx=(10, 0))

            scrollbar.pack(side="right", fill="y", padx=(0, 10))

          

            # Buttons frame

            button_frame = tk.Frame(results_window)

            button_frame.pack(pady=20)

          

            def add_selected_to_revise():

                added_count = 0

                for flag, var in revise_vars.items():

                    if var.get() and flag not in self.revise_flags:

                        self.revise_flags.append(flag)

                        added_count += 1

              

                if added_count > 0:

                    self.save_revise_flags()

                    messagebox.showinfo("Added to Revise", f"Added {added_count} flags to your revise list!")

          

            def select_all():

                for var in revise_vars.values():

                    var.set(True)

          

            def deselect_all():

                for var in revise_vars.values():

                    var.set(False)

          

            select_all_btn = tk.Button(button_frame, text="Select All", command=select_all)

            select_all_btn.pack(side="left", padx=5)

          

            deselect_all_btn = tk.Button(button_frame, text="Deselect All", command=deselect_all)

            deselect_all_btn.pack(side="left", padx=5)

          

            add_revise_btn = tk.Button(button_frame, text="Add Selected to Revise",

                                     command=add_selected_to_revise, bg="lightblue")

            add_revise_btn.pack(side="left", padx=10)

      

        # Bottom buttons

        bottom_frame = tk.Frame(results_window)

        bottom_frame.pack(pady=20)

      

        def play_again():

            results_window.destroy()

            self.reset_session()

      

        def close_results():

            results_window.destroy()

            # Stay on the completion screen

            self.flag_label.config(text=f"Session Complete: {percentage}% correct", image="")

            for btn in self.buttons:

                btn.config(text="", state=tk.DISABLED)

            self.text_entry.config(state=tk.DISABLED)

            self.submit_button.config(state=tk.DISABLED)

      

        play_again_btn = tk.Button(bottom_frame, text="Play Again", command=play_again,

                                 bg="lightgreen", font=("Arial", 11, "bold"))

        play_again_btn.pack(side="left", padx=10)

      

        close_btn = tk.Button(bottom_frame, text="Close", command=close_results,

                            font=("Arial", 11))

        close_btn.pack(side="left", padx=10)

 

    def load_revise_capitals(self):

        """Load capitals revise list"""

        try:

            with open("revise_capitals.txt", "r", encoding="utf-8") as f:

                return [line.strip() for line in f if line.strip() in countries]

        except:

            return []

 

    def save_revise_capitals(self):

        """Save capitals revise list"""

        try:

            with open("revise_capitals.txt", "w", encoding="utf-8") as f:

                for country in self.revise_capitals:

                    f.write(country + "\n")

        except Exception as e:

            print("Error saving revise capitals:", e)

 

    def show_all_flags(self):

        """Display all flags with their names for verification"""

        # Clear previous content

        for widget in self.view_scrollable_frame.winfo_children():

            widget.destroy()

      

        # Add loading message

        loading_label = tk.Label(self.view_scrollable_frame, text="Loading flags... Please wait",

                               font=("Arial", 14), fg="blue")

        loading_label.grid(row=0, column=0, columnspan=3, pady=20)

      

        # Update the display to show loading message

        self.root.update()

      

        # Create grid of flags (without loading images initially)

        row = 1  # Start from row 1 since loading message is in row 0

        col = 0

        max_cols = 3

      

        # Sort countries but put Ivory Coast first for testing

        sorted_countries = sorted(countries)

        if "Ivory Coast" in sorted_countries:

            sorted_countries.remove("Ivory Coast")

            sorted_countries.insert(0, "Ivory Coast")

      

        for country in sorted_countries:

            flag_frame = tk.Frame(self.view_scrollable_frame, relief=tk.RAISED, borderwidth=1)

            flag_frame.grid(row=row, column=col, padx=5, pady=5, sticky="nsew")

          

            # Country name label

            name_label = tk.Label(flag_frame, text=country, font=("Arial", 10, "bold"), wraplength=200)

            name_label.pack(pady=2)

          

            # Placeholder for flag - will load later

            flag_label = tk.Label(flag_frame, text=f"Loading...",

                                width=30, height=8, relief=tk.SUNKEN, bg="lightgray")

            flag_label.pack(pady=2)

          

            col += 1

            if col >= max_cols:

                col = 0

                row += 1

      

        # Remove loading message

        loading_label.destroy()

      

        # Schedule loading of flag images one by one to prevent freezing

        self.load_flags_gradually(sorted_countries, 0)

 

    def load_flags_gradually(self, countries_list, index):

        """Load flag images gradually to prevent UI freezing"""

        if index >= len(countries_list):

            return  # All flags loaded

      

        country = countries_list[index]

      

        # Find the flag frame for this country

        row = (index // 3) + 1  # +1 because row 0 was for loading message

        col = index % 3

      

        # Find the frame at this grid position

        for widget in self.view_scrollable_frame.winfo_children():

            if hasattr(widget, 'grid_info'):

                info = widget.grid_info()

                if info.get('row') == row and info.get('column') == col:

                    # This is the frame for our country

                    # Find the flag label (second child after name label)

                    children = widget.winfo_children()

                    if len(children) >= 2:

                        flag_label = children[1]  # Second child should be the flag label

                      

                        # Try to load the flag image

                        flag_image = self.get_flag_image(country)

                        if flag_image:

                            flag_label.config(image=flag_image, text="")

                            flag_label.image = flag_image  # Keep a reference

                        else:

                            flag_label.config(text=f"Flag of {country}", bg="lightcoral")

                    break

      

        # Schedule loading of next flag after a short delay

        self.root.after(50, lambda: self.load_flags_gradually(countries_list, index + 1))

 

    def toggle_revise(self, quiz_type):

        """Toggle revise status for current item"""

        if not self.correct_country:

            return

       

        if quiz_type == "flags":

            revise_list = self.revise_flags

            save_method = self.save_revise_flags

            item_name = self.correct_country

            revise_feedback_label = getattr(self, f"{quiz_type}_revise_feedback_label")

            add_revise_button = getattr(self, f"{quiz_type}_add_revise_button")

        else:  # capitals

            revise_list = self.revise_capitals

            save_method = self.save_revise_capitals

            item_name = self.correct_country

            revise_feedback_label = getattr(self, f"{quiz_type}_revise_feedback_label")

            add_revise_button = getattr(self, f"{quiz_type}_add_revise_button")

           

        if item_name in revise_list:

            revise_list.remove(item_name)

            save_method()

            if self.hard_mode.get():

                revise_feedback_label.config(text="Removed from Revise list.")

            else:

                revise_feedback_label.config(text=f"Removed {item_name} from Revise list.")

        else:

            revise_list.append(item_name)

            save_method()

            if self.hard_mode.get():

                revise_feedback_label.config(text="Added to Revise list.")

            else:

                revise_feedback_label.config(text=f"Added {item_name} to Revise list.")

       

        self.update_revise_button_text(quiz_type)

        # Clear the feedback after 3 seconds

        self.root.after(3000, lambda: revise_feedback_label.config(text=""))

 

    def update_revise_button_text(self, quiz_type):

        """Update the revise button text for the current quiz type"""

        if quiz_type == "flags":

            revise_list = self.revise_flags

        else:

            revise_list = self.revise_capitals

           

        add_revise_button = getattr(self, f"{quiz_type}_add_revise_button")

       

        if self.correct_country and self.correct_country in revise_list:

            add_revise_button.config(text="Remove from Revise")

        else:

            add_revise_button.config(text="Add to Revise")

 

    def check_custom_aliases(self, user_input, quiz_type):

        """Check if user input matches any custom aliases"""

        if quiz_type == "flags":

            # Country aliases

            aliases = {

                "United States": ["usa"],

                "Vatican City": ["vatican"],

                "Saint Vincent and the Grenadines": ["st vincent"],

                "United Kingdom": ["uk"],

                "Papua New Guinea": ["png"],

                "São Tomé and Príncipe": ["sao"],

                "Saint Kitts and Nevis": ["st kitts"],

                "Republic of the Congo": ["repcongo"],

                "Democratic Republic of the Congo": ["drc"],

                "Central African Republic": ["car"],

                "North Korea": ["dprk"],

                "United Arab Emirates": ["uae"],

                "Türkiye": ["turkey"],

                "North Macedonia": ["macedonia"],

                "South Africa": ["rsa"],

                "The Gambia": ["gambia"]

            }

           

            if self.correct_country in aliases:

                return user_input in aliases[self.correct_country]

        else:  # capitals

            # Capital aliases

            aliases = {

                "Washington, D.C.": ["washington", "dc", "washington dc"],

                "New Delhi": ["delhi"],

                "Vatican City": ["vatican"],

                "Luxembourg City": ["luxembourg"],

                "Kuwait City": ["kuwait"],

                "Panama City": ["panama"],

                "Guatemala City": ["guatemala"],

                "Mexico City": ["mexico"],

                "Saint John's": ["st johns"],

                "Saint George's": ["st georges"],

                "Port of Spain": ["port-of-spain"],

                "San José": ["san jose"],

                "São Tomé": ["sao tome"],

                "N'Djamena": ["ndjamena"],

                "Nur-Sultan": ["nur sultan", "astana"],  # Former name

                "Bandar Seri Begawan": ["bsb"]

            }

           

            if self.correct_answer in aliases:

                return user_input in aliases[self.correct_answer]

       

        return False

 

    def check_text_answer(self, quiz_type, event=None):

        """Check text answer for both flags and capitals"""

        text_entry = getattr(self, f"{quiz_type}_text_entry")

        feedback_label = getattr(self, f"{quiz_type}_feedback_label")

        submit_button = getattr(self, f"{quiz_type}_submit_button")

       

        user_input = text_entry.get().strip()

        if not user_input:

            return

      

        self.question_answered = True

      

        # Only count as attempt if this item hasn't been answered yet

        first_attempt = self.correct_country not in self.session_answered

        if first_attempt:

            self.session_total += 1

            self.session_answered.add(self.correct_country)

       

        # Determine what we're checking against

        if quiz_type == "flags":

            correct_answer = self.correct_country

            comparison_list = countries

        else:  # capitals

            correct_answer = self.correct_answer  # The capital name

            comparison_list = list(country_capitals.values())

          

        # Check for exact match first

        if user_input.lower() == correct_answer.lower():

            feedback_label.config(text="Correct!", fg="green")

            text_entry.config(state=tk.DISABLED)

            submit_button.config(state=tk.DISABLED)

          

            # Only increase streak if this is first attempt

            if first_attempt:

                self.streak += 1

                self.session_correct += 1

          

            self.update_scores_and_advance(quiz_type)

            return

      

        # Check for custom aliases

        if self.check_custom_aliases(user_input.lower(), quiz_type):

            feedback_label.config(text="Correct!", fg="green")

            text_entry.config(state=tk.DISABLED)

            submit_button.config(state=tk.DISABLED)

          

            # Only increase streak if this is first attempt

            if first_attempt:

                self.streak += 1

                self.session_correct += 1

          

            self.update_scores_and_advance(quiz_type)

            return

      

        # Check for close matches using fuzzy matching

        close_matches = difflib.get_close_matches(user_input.lower(),

                                                [item.lower() for item in comparison_list],

                                                n=1, cutoff=0.8)

        if close_matches and close_matches[0] == correct_answer.lower():

            feedback_label.config(text="Correct! (Close enough)", fg="green")

            text_entry.config(state=tk.DISABLED)

            submit_button.config(state=tk.DISABLED)

          

            # Only increase streak if this is first attempt

            if first_attempt:

                self.streak += 1

                self.session_correct += 1

          

            self.update_scores_and_advance(quiz_type)

        else:

            feedback_label.config(text="Incorrect. Try again.", fg="red")

            self.streak = 0  # Reset streak on wrong answer

          

            # Track incorrect answers for session summary

            if first_attempt and hasattr(self, 'session_incorrect'):

                self.session_incorrect.add(self.correct_country)

          

            self.update_score_displays()

            text_entry.select_range(0, tk.END)

 

    def update_scores_and_advance(self, quiz_type):

        """Update scores and advance to next question"""

        current_mode = self.selected_continent.get()

        mode_suffix = "_hard" if self.hard_mode.get() else "_normal"

        quiz_prefix = f"{self.quiz_type}_"

        streak_key = quiz_prefix + current_mode + mode_suffix

       

        if self.streak > self.get_high_score_for_mode(streak_key):

            self.high_scores[streak_key] = self.streak

            self.save_high_scores()

       

        self.update_score_displays()

      

        # Auto-advance after 0.2 seconds on correct answer (except in revise mode)

        if not (current_mode == "Revise" or current_mode == "Revise Capitals"):

            self.root.after(200, self.load_new_question)

        else:

            # In revise mode, reset the input box for the next question

            text_entry = getattr(self, f"{quiz_type}_text_entry")

            submit_button = getattr(self, f"{quiz_type}_submit_button")

            text_entry.delete(0, tk.END)

            text_entry.config(state=tk.NORMAL)

            submit_button.config(state=tk.NORMAL)

 

    def get_flag_image(self, country):

        try:

            # Handle special country name mappings for API compatibility

            api_country_name = country

            country_code = None

          

            # print(f"Loading flag for: '{country}' (length: {len(country)})")

          

            # Special cases where we know the exact country code

            if country == "Ivory Coast":

                country_code = "ci"

                print(f"Matched Ivory Coast, using code: {country_code}")

            elif country == "Türkiye":

                api_country_name = "Turkey"

            elif country == "United States":

                api_country_name = "United States of America"

            elif country == "United Kingdom":

                api_country_name = "United Kingdom of Great Britain and Northern Ireland"

            elif country == "Cabo Verde":

                api_country_name = "Cape Verde"

            elif country == "The Gambia":

                api_country_name = "Gambia"

          

            # If we have a direct country code, use it

            if country_code:

                flag_url = f"https://flagcdn.com/w320/{country_code}.png"

                print(f"Trying direct URL for {country}: {flag_url}")

              

                try:

                    response = requests.get(flag_url, timeout=10, headers={

                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

                    })

                    print(f"Response status: {response.status_code}")

                  

                    if response.status_code == 200:

                        # Load directly from response content

                        img = Image.open(BytesIO(response.content)).resize((320, 200))

                        photo = ImageTk.PhotoImage(img)

                        print(f"Successfully loaded flag for {country}")

                        return photo

                    else:

                        print(f"Failed to get flag for {country}, status code: {response.status_code}")

                      

                except Exception as net_error:

                    print(f"Network error for {country}: {net_error}")

            else:

                # Otherwise, use the REST Countries API to get the country code

                try:

                    response = requests.get(f"https://restcountries.com/v3.1/name/{api_country_name}?fullText=true", timeout=15)

                    if response.status_code == 200:

                        data = response.json()

                        code = data[0]['cca2'].lower()

                        flag_url = f"https://flagcdn.com/w320/{code}.png"

                        flag_response = requests.get(flag_url, timeout=15)

                        if flag_response.status_code == 200:

                            img = Image.open(BytesIO(flag_response.content)).resize((320, 200))

                            return ImageTk.PhotoImage(img)

                except Exception as api_error:

                    print(f"REST Countries API error for {country}: {api_error}")

                  

        except Exception as e:

            print(f"Error loading flag for {country}: {e}")

            import traceback

            traceback.print_exc()

        return None

 

    def save_revise_flags(self):

        try:

            with open("revise_flags.txt", "w", encoding="utf-8") as f:

                for flag in self.revise_flags:

                    f.write(flag + "\n")

        except Exception as e:

            print("Error saving revise flags:", e)

 

    def load_revise_flags(self):

        try:

            with open("revise_flags.txt", "r", encoding="utf-8") as f:

                return [line.strip() for line in f if line.strip() in countries]

        except:

            return []

 

    def save_high_scores(self):

        try:

            with open("high_scores.txt", "w", encoding="utf-8") as f:

                for mode, score in self.high_scores.items():

                    f.write(f"{mode}:{score}\n")

        except Exception as e:

            print("Error saving high scores:", e)

 

    def load_high_scores(self):

        try:

            high_scores = {}

            with open("high_scores.txt", "r", encoding="utf-8") as f:

                for line in f:

                    if ":" in line:

                        mode, score = line.strip().split(":", 1)

                        high_scores[mode] = int(score)

            return high_scores

        except:

            return {}

 

    def save_session_percentages(self):

        try:

            with open("session_percentages.txt", "w", encoding="utf-8") as f:

                for mode, percentage in self.session_percentages.items():

                    f.write(f"{mode}:{percentage}\n")

        except Exception as e:

            print("Error saving session percentages:", e)

 

    def load_session_percentages(self):

        try:

            percentages = {}

            with open("session_percentages.txt", "r", encoding="utf-8") as f:

                for line in f:

                    if ":" in line:

                        mode, percentage = line.strip().split(":", 1)

                        percentages[mode] = float(percentage)

            return percentages

        except:

            return {}

 

    def get_session_percentage_for_mode(self, mode):

        return self.session_percentages.get(mode, 0.0)

 

    def get_high_score_for_mode(self, mode):

        return self.high_scores.get(mode, 0)

 

    def get_score_text(self):

        current_mode = self.selected_continent.get()

        mode_suffix = "_hard" if self.hard_mode.get() else "_normal"

        quiz_prefix = f"{self.quiz_type}_"

        streak_key = quiz_prefix + current_mode + mode_suffix

        current_high_score = self.get_high_score_for_mode(streak_key)

        mode_display = f"{current_mode} ({'H' if self.hard_mode.get() else 'N'})"

        return f"Streak: {self.streak} | High: {current_high_score} ({mode_display})"

 

    def get_percentage_text(self):

        current_mode = self.selected_continent.get()

        mode_suffix = "_hard" if self.hard_mode.get() else "_normal"

        quiz_prefix = f"{self.quiz_type}_"

        percentage_key = quiz_prefix + current_mode + mode_suffix

        best_percentage = self.get_session_percentage_for_mode(percentage_key)

        mode_display = f"{current_mode} ({'H' if self.hard_mode.get() else 'N'})"

        return f"Best Session: {best_percentage}% ({mode_display})"

 

    def load_new_question(self):

        """Load a new question for the current quiz type"""

        continent = self.selected_continent.get()

       

        # Clear feedback

        if hasattr(self, f"{self.quiz_type}_feedback_label"):

            feedback_label = getattr(self, f"{self.quiz_type}_feedback_label")

            revise_feedback_label = getattr(self, f"{self.quiz_type}_revise_feedback_label")

            feedback_label.config(text="")

            revise_feedback_label.config(text="")

       

        self.question_answered = False

      

        # Build the pool if it's empty or mode changed

        if not self.current_pool:

            if continent == "Revise":

                self.current_pool = self.revise_flags.copy() if self.revise_flags else []

            elif continent == "Revise Capitals":

                self.current_pool = self.revise_capitals.copy() if self.revise_capitals else []

            elif continent == "All":

                self.current_pool = countries.copy()

            else:

                self.current_pool = [c for c in countries if country_continent[c] == continent]

 

        # Check if all items have been answered

        unanswered_items = [item for item in self.current_pool if item not in self.session_answered]

      

        # If no unanswered items, check if there are skipped items to retry

        if not unanswered_items and self.session_skipped:

            unanswered_items = list(self.session_skipped)

            self.session_skipped.clear()

      

        if not unanswered_items:

            if self.session_total > 0:  # Only show results if we actually played

                self.show_session_results()

                return

            else:

                # No items to show

                question_label = getattr(self, f"{self.quiz_type}_question_label")

                buttons = getattr(self, f"{self.quiz_type}_buttons")

                text_entry = getattr(self, f"{self.quiz_type}_text_entry")

                submit_button = getattr(self, f"{self.quiz_type}_submit_button")

               

                question_label.config(text="No items available.", image="")

                for btn in buttons:

                    btn.config(text="", state=tk.DISABLED)

                text_entry.config(state=tk.DISABLED)

                submit_button.config(state=tk.DISABLED)

                return

 

        self.correct_country = random.choice(unanswered_items)

        self.session_flags_seen.append(self.correct_country)

        self.flag_history.append(self.correct_country)

       

        # Set up the question based on quiz type

        question_label = getattr(self, f"{self.quiz_type}_question_label")

       

        if self.quiz_type == "flags":

            # Show flag image

            self.correct_answer = self.correct_country  # For flags, answer is the country name

            self.flag_image = self.get_flag_image(self.correct_country)

            if self.flag_image:

                question_label.config(image=self.flag_image, text="")

            else:

                question_label.config(text=f"Flag of {self.correct_country}", image="")

        else:  # capitals

            # Show country name and flag, ask for capital

            self.correct_answer = country_capitals.get(self.correct_country, "Unknown")

            self.flag_image = self.get_flag_image(self.correct_country)

            if self.flag_image:

                question_label.config(image=self.flag_image, text="")

            else:

                question_label.config(image="", text="")

           

            # Always show country name below the flag for capitals quiz

            country_label = getattr(self, f"{self.quiz_type}_country_label", None)

            if not country_label:

                # Create country label if it doesn't exist

                content_frame = question_label.master

                country_label = tk.Label(content_frame, text=f"What is the capital of {self.correct_country}?",

                                       font=("Arial", 14, "bold"), fg="darkblue")

                country_label.pack(after=question_label, pady=(5, 10))

                setattr(self, f"{self.quiz_type}_country_label", country_label)

            else:

                country_label.config(text=f"What is the capital of {self.correct_country}?")

 

        self.update_revise_button_text(self.quiz_type)

        self.update_session_display()

        self.update_score_displays()

 

        # Set up input method based on hard mode

        if self.hard_mode.get():

            # Hard mode: enable text input

            text_entry = getattr(self, f"{self.quiz_type}_text_entry")

            submit_button = getattr(self, f"{self.quiz_type}_submit_button")

            give_up_button = getattr(self, f"{self.quiz_type}_give_up_button")

           

            text_entry.config(state=tk.NORMAL)

            text_entry.delete(0, tk.END)

            submit_button.config(state=tk.NORMAL)

            give_up_button.config(state=tk.NORMAL)

            text_entry.focus()

        else:

            # Normal mode: set up multiple choice

            self.setup_multiple_choice(self.quiz_type)

 

        # Enable/disable last button based on history

        last_button = getattr(self, f"{self.quiz_type}_last_button")

        if len(self.flag_history) > 1:

            last_button.config(state=tk.NORMAL)

        else:

            last_button.config(state=tk.DISABLED)

 

    def next_question(self, quiz_type):

        """Move to next question (skip current)"""

        # If the question hasn't been answered, add it to skipped

        if not self.question_answered and self.correct_country:

            self.session_skipped.add(self.correct_country)

            # Remove from session_flags_seen so it can appear again

            if self.correct_country in self.session_flags_seen:

                self.session_flags_seen.remove(self.correct_country)

      

        self.load_new_question()

  

    def check_answer(self, index, quiz_type):

        """Check multiple choice answer"""

        buttons = getattr(self, f"{quiz_type}_buttons")

        feedback_label = getattr(self, f"{quiz_type}_feedback_label")

       

        selected = buttons[index].cget("text")

        self.question_answered = True

      

        # Only count as attempt if this item hasn't been answered yet

        first_attempt = self.correct_country not in self.session_answered

        if first_attempt:

            self.session_total += 1

            self.session_answered.add(self.correct_country)

       

        # Determine correct answer based on quiz type

        if quiz_type == "flags":

            correct_answer = self.correct_country

        else:  # capitals

            correct_answer = self.correct_answer

      

        if selected == correct_answer:

            feedback_label.config(text="Correct!", fg="green")

            for btn in buttons:

                btn.config(state=tk.DISABLED)

          

            # Only increase streak if this is first attempt

            if first_attempt:

                self.streak += 1

                self.session_correct += 1

          

            self.update_scores_and_advance(quiz_type)

        else:

            feedback_label.config(text="Incorrect. Try again.", fg="red")

            self.streak = 0  # Reset streak on wrong answer

          

            # Track incorrect answers for session summary

            if first_attempt:

                self.session_incorrect.add(self.correct_country)

          

            self.update_score_displays()

 

    def give_up(self, quiz_type):

        """Give up on the current session and show final results"""

        if hasattr(self, 'current_pool') and self.current_pool:

            # Get all items that haven't been answered (correctly or incorrectly)

            unanswered_items = [item for item in self.current_pool if item not in self.session_answered]

          

            # Add unanswered items to incorrect list and count as attempts

            for item in unanswered_items:

                self.session_incorrect.add(item)

                self.session_total += 1

                self.session_answered.add(item)

          

            # Reset streak to 0 since we're giving up

            self.streak = 0

          

            self.show_session_results()

        else:

            # If no questions answered yet, just end the session

            question_label = getattr(self, f"{quiz_type}_question_label")

            buttons = getattr(self, f"{quiz_type}_buttons")

            text_entry = getattr(self, f"{quiz_type}_text_entry")

            submit_button = getattr(self, f"{quiz_type}_submit_button")

            give_up_button = getattr(self, f"{quiz_type}_give_up_button")

           

            question_label.config(text="Session ended.", image="")

            for btn in buttons:

                btn.config(text="", state=tk.DISABLED)

            text_entry.config(state=tk.DISABLED)

            submit_button.config(state=tk.DISABLED)

            give_up_button.config(state=tk.DISABLED)

 

    def last_question(self, quiz_type):

        """Go back to the previous question"""

        if len(self.flag_history) < 2:

            return  # Can't go back if no previous question

      

        # Remove current item from history and get previous

        self.flag_history.pop()  # Remove current

        previous_item = self.flag_history.pop()  # Get previous and remove it

      

        # Remove current item from seen list

        if self.session_flags_seen and self.session_flags_seen[-1] == self.correct_country:

            self.session_flags_seen.pop()

      

        # Set the previous item as current

        self.correct_country = previous_item

        self.session_flags_seen.append(self.correct_country)

        self.flag_history.append(self.correct_country)

      

        # Reset question state

        self.question_answered = False

       

        # Set up the question based on quiz type

        question_label = getattr(self, f"{quiz_type}_question_label")

        feedback_label = getattr(self, f"{quiz_type}_feedback_label")

        revise_feedback_label = getattr(self, f"{quiz_type}_revise_feedback_label")

       

        if self.quiz_type == "flags":

            # Show flag image

            self.correct_answer = self.correct_country

            self.flag_image = self.get_flag_image(self.correct_country)

            if self.flag_image:

                question_label.config(image=self.flag_image, text="")

            else:

                question_label.config(text=f"Flag of {self.correct_country}", image="")

        else:  # capitals

            # Show country name and flag, ask for capital

            self.correct_answer = country_capitals.get(self.correct_country, "Unknown")

            self.flag_image = self.get_flag_image(self.correct_country)

            if self.flag_image:

                question_label.config(image=self.flag_image, text="")

            else:

                question_label.config(image="", text="")

           

            # Always show country name below the flag for capitals quiz

            country_label = getattr(self, f"{self.quiz_type}_country_label", None)

            if country_label:

                country_label.config(text=f"What is the capital of {self.correct_country}?")

 

        self.update_revise_button_text(quiz_type)

        self.update_session_display()

        feedback_label.config(text="")

        revise_feedback_label.config(text="")

 

        if self.hard_mode.get():

            # Hard mode: enable text input and clear previous answer

            text_entry = getattr(self, f"{quiz_type}_text_entry")

            submit_button = getattr(self, f"{quiz_type}_submit_button")

            text_entry.delete(0, tk.END)

            text_entry.config(state=tk.NORMAL)

            submit_button.config(state=tk.NORMAL)

            text_entry.focus()

        else:

            # Normal mode: set up multiple choice again

            self.setup_multiple_choice(quiz_type)

 

if __name__ == "__main__":

    print("Starting Flag & Capital Quiz...")

    root = tk.Tk()

    print("Tkinter root created")

    app = FlagQuizApp(root)

    print("FlagQuizApp initialized")

    print("Starting main loop...")

    root.mainloop()

    print("Application closed")