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

countries = list(country_continent.keys())

class FlagQuizApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Flag Flashcard Quiz")
        self.selected_continent = tk.StringVar(value="All")
        self.revise_flags = self.load_revise_flags()
        self.streak = 0
        self.high_scores = self.load_high_scores()
        self.session_percentages = self.load_session_percentages()
        self.hard_mode = tk.BooleanVar(value=False)
        self.correct_country = None
        
        # Session tracking variables
        self.session_flags_seen = []
        self.session_correct = 0
        self.session_total = 0
        self.current_pool = []
        self.session_answered = set()  # Track which flags have been answered (correctly or incorrectly)
        self.session_skipped = set()  # Track which flags have been skipped
        self.question_answered = False  # Track if current question has been answered
        self.flag_history = []  # Track flag order for last flag functionality
        
        self.setup_widgets()
        self.load_new_question()

    def setup_widgets(self):
        self.mode_frame = tk.Frame(self.root)
        self.mode_frame.pack(pady=10)

        self.continent_menu = ttk.Combobox(self.mode_frame, textvariable=self.selected_continent, values=["All"] + sorted(set(country_continent.values())) + ["Revise", "View All"])
        self.continent_menu.pack(side=tk.LEFT)
        self.continent_menu.bind("<<ComboboxSelected>>", lambda e: self.on_mode_change())

        self.add_revise_button = tk.Button(self.mode_frame, text="Add to Revise", command=self.toggle_revise)
        self.add_revise_button.pack(side=tk.LEFT, padx=5)

        self.hard_mode_check = tk.Checkbutton(self.mode_frame, text="Hard Mode", variable=self.hard_mode, command=self.toggle_mode)
        self.hard_mode_check.pack(side=tk.LEFT, padx=5)

        self.flag_label = tk.Label(self.root)
        self.flag_label.pack(pady=10)

        # Multiple choice buttons
        self.buttons_frame = tk.Frame(self.root)
        self.buttons_frame.pack()
        self.buttons = []
        for i in range(4):
            btn = tk.Button(self.buttons_frame, text="", width=30, command=lambda i=i: self.check_answer(i))
            btn.pack(pady=5)
            self.buttons.append(btn)

        # Text input for hard mode
        self.text_frame = tk.Frame(self.root)
        self.text_entry = tk.Entry(self.text_frame, width=40, font=("Arial", 12))
        self.text_entry.pack(side=tk.LEFT, padx=5)
        self.text_entry.bind("<Return>", self.check_text_answer)
        
        self.submit_button = tk.Button(self.text_frame, text="Submit", command=self.check_text_answer)
        self.submit_button.pack(side=tk.LEFT)

        self.give_up_button = tk.Button(self.text_frame, text="Give Up", command=self.give_up)
        self.give_up_button.pack(side=tk.LEFT, padx=5)

        self.feedback_label = tk.Label(self.root, text="", font=("Arial", 12))
        self.feedback_label.pack(pady=5)

        self.revise_feedback_label = tk.Label(self.root, text="", font=("Arial", 10), fg="blue")
        self.revise_feedback_label.pack(pady=2)

        self.score_label = tk.Label(self.root, text=self.get_score_text(), font=("Arial", 12, "bold"))
        self.score_label.pack(pady=5)

        self.percentage_label = tk.Label(self.root, text=self.get_percentage_text(), font=("Arial", 10), fg="darkgreen")
        self.percentage_label.pack(pady=2)

        self.session_label = tk.Label(self.root, text="", font=("Arial", 10), fg="purple")
        self.session_label.pack(pady=2)

        # Navigation buttons frame
        self.nav_frame = tk.Frame(self.root)
        self.nav_frame.pack(pady=10)

        self.last_button = tk.Button(self.nav_frame, text="Last Flag", command=self.last_flag)
        self.last_button.pack(side=tk.LEFT, padx=5)

        self.next_button = tk.Button(self.nav_frame, text="Next Flag", command=self.next_flag)
        self.next_button.pack(side=tk.LEFT, padx=5)

        # View All mode specific widgets
        self.view_frame = tk.Frame(self.root)
        self.view_canvas = tk.Canvas(self.view_frame, width=800, height=400)
        self.view_scrollbar = tk.Scrollbar(self.view_frame, orient="vertical", command=self.view_canvas.yview)
        self.view_scrollable_frame = tk.Frame(self.view_canvas)
        
        self.view_scrollable_frame.bind(
            "<Configure>",
            lambda e: self.view_canvas.configure(scrollregion=self.view_canvas.bbox("all"))
        )
        
        self.view_canvas.create_window((0, 0), window=self.view_scrollable_frame, anchor="nw")
        self.view_canvas.configure(yscrollcommand=self.view_scrollbar.set)
        
        self.view_canvas.pack(side="left", fill="both", expand=True)
        self.view_scrollbar.pack(side="right", fill="y")

        self.toggle_mode()

    def on_mode_change(self):
        """Handle mode changes from the dropdown"""
        self.toggle_mode()  # Switch UI mode first
        if self.selected_continent.get() != "View All":
            self.reset_session()  # Only reset session for quiz modes

    def reset_session(self):
        """Reset session tracking when changing modes"""
        self.session_flags_seen = []
        self.session_correct = 0
        self.session_total = 0
        self.current_pool = []
        self.session_answered = set()
        self.session_skipped = set()
        self.question_answered = False
        self.flag_history = []
        self.update_session_display()
        self.load_new_question()

    def update_session_display(self):
        """Update the session progress display"""
        if self.current_pool:
            remaining = len(self.current_pool) - len(self.session_flags_seen)
            total = len(self.current_pool)
            self.session_label.config(text=f"Progress: {len(self.session_flags_seen)}/{total} flags seen | {remaining} remaining")
        else:
            self.session_label.config(text="")

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

    def toggle_mode(self):
        if self.selected_continent.get() == "View All":
            # Hide quiz elements, show view all
            self.buttons_frame.pack_forget()
            self.text_frame.pack_forget()
            self.flag_label.pack_forget()
            self.feedback_label.pack_forget()
            self.revise_feedback_label.pack_forget()
            self.score_label.pack_forget()
            self.percentage_label.pack_forget()
            self.session_label.pack_forget()
            self.nav_frame.pack_forget()
            self.add_revise_button.pack_forget()
            self.hard_mode_check.pack_forget()
            self.view_frame.pack(pady=10, fill="both", expand=True)
            self.show_all_flags()
        else:
            # Hide view all, show quiz elements
            self.view_frame.pack_forget()
            self.add_revise_button.pack(side=tk.LEFT, padx=5)
            self.hard_mode_check.pack(side=tk.LEFT, padx=5)
            self.flag_label.pack(pady=10)
            self.feedback_label.pack(pady=5)
            self.revise_feedback_label.pack(pady=2)
            self.score_label.pack(pady=5)
            self.percentage_label.pack(pady=2)
            self.session_label.pack(pady=2)
            self.nav_frame.pack(pady=10)            
            if self.hard_mode.get():
                self.buttons_frame.pack_forget()
                self.text_frame.pack(pady=10)
                # Enable give up button for hard mode
                self.give_up_button.pack(side=tk.LEFT, padx=5)
                # Clear text input and enable for hard mode
                if hasattr(self, 'correct_country') and self.correct_country:
                    self.text_entry.config(state=tk.NORMAL)
                    self.text_entry.delete(0, tk.END)
                    self.submit_button.config(state=tk.NORMAL)
                    self.text_entry.focus()
            else:
                self.text_frame.pack_forget()
                self.buttons_frame.pack()
                # Hide give up button for normal mode
                self.give_up_button.pack_forget()
                # Set up multiple choice for current question if one exists
                if hasattr(self, 'correct_country') and self.correct_country and hasattr(self, 'current_pool') and self.current_pool:
                    mcq_pool = self.current_pool
                    options = [self.correct_country]
                    while len(options) < 4 and len(options) < len(mcq_pool):
                        choice = random.choice(mcq_pool)
                        if choice not in options:
                            options.append(choice)
                    random.shuffle(options)

                    for i, btn in enumerate(self.buttons):
                        if i < len(options):
                            btn.config(text=options[i], state=tk.NORMAL)
                        else:
                            btn.config(text="", state=tk.DISABLED)

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

    def toggle_revise(self):
        if not self.correct_country:
            return
            
        if self.correct_country in self.revise_flags:
            self.revise_flags.remove(self.correct_country)
            self.save_revise_flags()
            if self.hard_mode.get():
                self.revise_feedback_label.config(text="Removed from Revise list.")
            else:
                self.revise_feedback_label.config(text=f"Removed {self.correct_country} from Revise list.")
        else:
            self.revise_flags.append(self.correct_country)
            self.save_revise_flags()
            if self.hard_mode.get():
                self.revise_feedback_label.config(text="Added to Revise list.")
            else:
                self.revise_feedback_label.config(text=f"Added {self.correct_country} to Revise list.")
        
        self.update_revise_button_text()
        # Clear the feedback after 3 seconds
        self.root.after(3000, lambda: self.revise_feedback_label.config(text=""))

    def update_revise_button_text(self):
        if self.correct_country and self.correct_country in self.revise_flags:
            self.add_revise_button.config(text="Remove from Revise")
        else:
            self.add_revise_button.config(text="Add to Revise")

    def check_text_answer(self, event=None):
        user_input = self.text_entry.get().strip()
        if not user_input:
            return
        
        self.question_answered = True
        
        # Only count as attempt if this flag hasn't been answered yet
        first_attempt = self.correct_country not in self.session_answered
        if first_attempt:
            self.session_total += 1
            self.session_answered.add(self.correct_country)
            
        # Check for exact match first
        if user_input.lower() == self.correct_country.lower():
            self.feedback_label.config(text="Correct!", fg="green")
            self.text_entry.config(state=tk.DISABLED)
            self.submit_button.config(state=tk.DISABLED)
            
            # Only increase streak if this is first attempt (no previous wrong answers)
            if first_attempt:
                self.streak += 1
                self.session_correct += 1
            
            current_mode = self.selected_continent.get()
            mode_suffix = "_hard" if self.hard_mode.get() else "_normal"
            streak_key = current_mode + mode_suffix
            if self.streak > self.get_high_score_for_mode(streak_key):
                self.high_scores[streak_key] = self.streak
                self.save_high_scores()
            self.score_label.config(text=self.get_score_text())
            self.percentage_label.config(text=self.get_percentage_text())
            
            # Auto-advance after 0.2 seconds on correct answer (except in revise mode)
            current_mode = self.selected_continent.get()
            if current_mode != "Revise":
                self.root.after(200, self.load_new_question)
            else:
                # In revise mode, reset the input box for the next question
                self.text_entry.delete(0, tk.END)
                self.text_entry.config(state=tk.NORMAL)
                self.submit_button.config(state=tk.NORMAL)
            return
        
        # Check for close matches using fuzzy matching
        close_matches = difflib.get_close_matches(user_input.lower(), [country.lower() for country in countries], n=1, cutoff=0.8)
        if close_matches and close_matches[0] == self.correct_country.lower():
            self.feedback_label.config(text="Correct! (Close enough)", fg="green")
            self.text_entry.config(state=tk.DISABLED)
            self.submit_button.config(state=tk.DISABLED)
            
            # Only increase streak if this is first attempt (no previous wrong answers)
            if first_attempt:
                self.streak += 1
                self.session_correct += 1
            
            current_mode = self.selected_continent.get()
            mode_suffix = "_hard" if self.hard_mode.get() else "_normal"
            streak_key = current_mode + mode_suffix
            if self.streak > self.get_high_score_for_mode(streak_key):
                self.high_scores[streak_key] = self.streak
                self.save_high_scores()
            self.score_label.config(text=self.get_score_text())
            self.percentage_label.config(text=self.get_percentage_text())
            
            # Auto-advance after 0.2 seconds on correct answer (except in revise mode)
            current_mode = self.selected_continent.get()
            if current_mode != "Revise":
                self.root.after(200, self.load_new_question)
            else:
                # In revise mode, reset the input box for the next question
                self.text_entry.delete(0, tk.END)
                self.text_entry.config(state=tk.NORMAL)
                self.submit_button.config(state=tk.NORMAL)
        else:
            self.feedback_label.config(text="Incorrect. Try again.", fg="red")
            self.streak = 0  # Reset streak on wrong answer
            self.score_label.config(text=self.get_score_text())
            self.percentage_label.config(text=self.get_percentage_text())
            self.text_entry.select_range(0, tk.END)

    def get_flag_image(self, country):
        try:
            # Handle special country name mappings for API compatibility
            api_country_name = country
            country_code = None
            
            # print(f"Loading flag for: '{country}' (length: {len(country)})")
            
            # Special cases where we know the exact country code
            if country == "Ivory Coast":
                country_code = "ci"
                print(f"✅ Matched Ivory Coast, using code: {country_code}")
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
                        print(f"✅ Successfully loaded flag for {country}")
                        return photo
                    else:
                        print(f"❌ Failed to get flag for {country}, status code: {response.status_code}")
                        
                except Exception as net_error:
                    print(f"❌ Network error for {country}: {net_error}")
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
                    print(f"❌ REST Countries API error for {country}: {api_error}")
                    
        except Exception as e:
            print(f"❌ Error loading flag for {country}: {e}")
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
        streak_key = current_mode + mode_suffix
        current_high_score = self.get_high_score_for_mode(streak_key)
        mode_display = f"{current_mode} ({'Hard' if self.hard_mode.get() else 'Normal'})"
        return f"Streak: {self.streak}   High Streak ({mode_display}): {current_high_score}"

    def get_percentage_text(self):
        current_mode = self.selected_continent.get()
        mode_suffix = "_hard" if self.hard_mode.get() else "_normal"
        percentage_key = current_mode + mode_suffix
        best_percentage = self.get_session_percentage_for_mode(percentage_key)
        mode_display = f"{current_mode} ({'Hard' if self.hard_mode.get() else 'Normal'})"
        return f"Best Session % ({mode_display}): {best_percentage}%"

    def load_new_question(self):
        if self.selected_continent.get() == "View All":
            return
            
        self.feedback_label.config(text="")
        self.revise_feedback_label.config(text="")
        self.question_answered = False
        continent = self.selected_continent.get()
        
        # Build the pool if it's empty or mode changed
        if not self.current_pool:
            if continent == "Revise":
                self.current_pool = self.revise_flags.copy() if self.revise_flags else []
            elif continent == "All":
                self.current_pool = countries.copy()
            else:
                self.current_pool = [c for c in countries if country_continent[c] == continent]

        # Check if all flags have been seen
        unseen_flags = [flag for flag in self.current_pool if flag not in self.session_flags_seen]
        
        # If no unseen flags, check if there are skipped flags to retry
        if not unseen_flags and self.session_skipped:
            unseen_flags = list(self.session_skipped)
            self.session_skipped.clear()  # Clear the skipped set as we're reusing them
        
        if not unseen_flags:
            if self.session_total > 0:  # Only show results if we actually played
                self.show_session_results()
                return
            else:
                # No flags to show (empty revise list, etc.)
                self.flag_label.config(text="No flags available.", image="")
                for btn in self.buttons:
                    btn.config(text="", state=tk.DISABLED)
                self.text_entry.config(state=tk.DISABLED)
                self.submit_button.config(state=tk.DISABLED)
                return

        self.correct_country = random.choice(unseen_flags)
        self.session_flags_seen.append(self.correct_country)
        self.flag_history.append(self.correct_country)  # Add to history for last flag functionality
        
        self.flag_image = self.get_flag_image(self.correct_country)
        if self.flag_image:
            self.flag_label.config(image=self.flag_image, text="")
        else:
            self.flag_label.config(text=f"Flag of {self.correct_country}", image="")

        self.update_revise_button_text()
        self.update_session_display()

        if self.hard_mode.get():
            # Hard mode: enable text input and clear any previous answer
            self.text_entry.config(state=tk.NORMAL)
            self.text_entry.delete(0, tk.END)
            self.submit_button.config(state=tk.NORMAL)
            self.give_up_button.config(state=tk.NORMAL)
            self.text_entry.focus()
        else:
            # Normal mode: multiple choice
            # For MCQ, we still need to pick from the full pool to get 4 options
            mcq_pool = self.current_pool
            options = [self.correct_country]
            while len(options) < 4 and len(options) < len(mcq_pool):
                choice = random.choice(mcq_pool)
                if choice not in options:
                    options.append(choice)
            random.shuffle(options)

            for i, btn in enumerate(self.buttons):
                if i < len(options):
                    btn.config(text=options[i], state=tk.NORMAL)
                else:
                    btn.config(text="", state=tk.DISABLED)

        # Reset next button visibility - always show as skip option
        self.nav_frame.pack(pady=10)
        
        # Enable/disable last button based on history
        if len(self.flag_history) > 1:
            self.last_button.config(state=tk.NORMAL)
        else:
            self.last_button.config(state=tk.DISABLED)

        self.score_label.config(text=self.get_score_text())

    def next_flag(self):
        # If the question hasn't been answered, add it to skipped and put it back in the pool
        if not self.question_answered and self.correct_country:
            self.session_skipped.add(self.correct_country)
            # Remove from session_flags_seen so it can appear again
            if self.correct_country in self.session_flags_seen:
                self.session_flags_seen.remove(self.correct_country)
        
        self.load_new_question()
    
    def check_answer(self, index):
        selected = self.buttons[index].cget("text")
        self.question_answered = True
        
        # Only count as attempt if this flag hasn't been answered yet
        first_attempt = self.correct_country not in self.session_answered
        if first_attempt:
            self.session_total += 1
            self.session_answered.add(self.correct_country)
        
        if selected == self.correct_country:
            self.feedback_label.config(text="Correct!", fg="green")
            for btn in self.buttons:
                btn.config(state=tk.DISABLED)
            
            # Only increase streak if this is first attempt (no previous wrong answers)
            if first_attempt:
                self.streak += 1
                self.session_correct += 1
            
            current_mode = self.selected_continent.get()
            mode_suffix = "_hard" if self.hard_mode.get() else "_normal"
            streak_key = current_mode + mode_suffix
            if self.streak > self.get_high_score_for_mode(streak_key):
                self.high_scores[streak_key] = self.streak
                self.save_high_scores()
            self.score_label.config(text=self.get_score_text())
            self.percentage_label.config(text=self.get_percentage_text())
            
            # Auto-advance after 0.2 seconds on correct answer (except in revise mode)
            if current_mode != "Revise":
                self.root.after(200, self.load_new_question)
            else:
                # In revise mode, reset for the next question
                for btn in self.buttons:
                    btn.config(state=tk.NORMAL)
        else:
            self.feedback_label.config(text="Incorrect. Try again.", fg="red")
            self.streak = 0  # Reset streak on wrong answer
            self.score_label.config(text=self.get_score_text())
            self.percentage_label.config(text=self.get_percentage_text())

    def give_up(self):
        """Give up on the current session and show final results"""
        if self.session_total > 0 or (hasattr(self, 'current_pool') and self.current_pool):
            # Count remaining unseen flags as incorrect
            if hasattr(self, 'current_pool') and self.current_pool:
                # Get all unseen flags (flags that haven't been attempted yet)
                unseen_flags = [flag for flag in self.current_pool if flag not in self.session_flags_seen]
                
                # Add skipped flags that would be retried
                if self.session_skipped:
                    unseen_flags.extend(list(self.session_skipped))
                
                # Count these as incorrect attempts
                self.session_total += len(unseen_flags)
                
                # Reset streak to 0 since we're giving up
                self.streak = 0
                
            self.show_session_results()
        else:
            # If no questions answered yet, just end the session
            self.flag_label.config(text="Session ended.", image="")
            for btn in self.buttons:
                btn.config(text="", state=tk.DISABLED)
            self.text_entry.config(state=tk.DISABLED)
            self.submit_button.config(state=tk.DISABLED)
            self.give_up_button.config(state=tk.DISABLED)

    def last_flag(self):
        """Go back to the previous flag"""
        if len(self.flag_history) < 2:
            return  # Can't go back if no previous flag
        
        # Remove current flag from history and get previous
        self.flag_history.pop()  # Remove current
        previous_flag = self.flag_history.pop()  # Get previous and remove it
        
        # Remove current flag from seen list
        if self.session_flags_seen and self.session_flags_seen[-1] == self.correct_country:
            self.session_flags_seen.pop()
        
        # Set the previous flag as current
        self.correct_country = previous_flag
        self.session_flags_seen.append(self.correct_country)
        self.flag_history.append(self.correct_country)
        
        # Reset question state
        self.question_answered = False
        
        # Load the previous flag
        self.flag_image = self.get_flag_image(self.correct_country)
        if self.flag_image:
            self.flag_label.config(image=self.flag_image, text="")
        else:
            self.flag_label.config(text=f"Flag of {self.correct_country}", image="")

        self.update_revise_button_text()
        self.update_session_display()
        self.feedback_label.config(text="")
        self.revise_feedback_label.config(text="")

        if self.hard_mode.get():
            # Hard mode: enable text input and clear previous answer
            self.text_entry.delete(0, tk.END)
            self.text_entry.config(state=tk.NORMAL)
            self.submit_button.config(state=tk.NORMAL)
            self.text_entry.focus()
        else:
            # Normal mode: set up multiple choice again
            mcq_pool = self.current_pool
            options = [self.correct_country]
            while len(options) < 4 and len(options) < len(mcq_pool):
                choice = random.choice(mcq_pool)
                if choice not in options:
                    options.append(choice)
            random.shuffle(options)

            for i, btn in enumerate(self.buttons):
                if i < len(options):
                    btn.config(text=options[i], state=tk.NORMAL)
                else:
                    btn.config(text="", state=tk.DISABLED)

if __name__ == "__main__":
    print("Starting Flag Flashcard Quiz...")
    root = tk.Tk()
    print("Tkinter root created")
    app = FlagQuizApp(root)
    print("FlagQuizApp initialized")
    print("Starting main loop...")
    root.mainloop()
    print("Application closed")