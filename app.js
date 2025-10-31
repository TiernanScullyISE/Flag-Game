/* Flag & Capital Quiz – GitHub Pages version
 * Plain JS, no frameworks. Data is stored in localStorage.
 * British English, no em dashes, no fluff.
 */

/* =========================
   Data
   ========================= */

const countryContinent = {
  "Japan":"Asia","United Kingdom":"Europe","Cuba":"North America","Sri Lanka":"Asia",
  "Germany":"Europe","Fiji":"Oceania","France":"Europe","Colombia":"South America",
  "Switzerland":"Europe","Sweden":"Europe","Italy":"Europe","Spain":"Europe",
  "Israel":"Asia","India":"Asia","Greece":"Europe","Ireland":"Europe",
  "Finland":"Europe","Brazil":"South America","Timor-Leste":"Asia","Kiribati":"Oceania",
  "Poland":"Europe","Norway":"Europe","Turkmenistan":"Asia","Saudi Arabia":"Asia",
  "Panama":"North America","Belgium":"Europe","Denmark":"Europe","Eswatini":"Africa",
  "Ukraine":"Europe","Nicaragua":"North America","Portugal":"Europe","Singapore":"Asia",
  "Nepal":"Asia","Samoa":"Oceania","North Korea":"Asia","Iceland":"Europe",
  "Cyprus":"Europe","Croatia":"Europe","Georgia":"Asia","Russia":"Europe",
  "Albania":"Europe","Pakistan":"Asia","Lebanon":"Asia","Iraq":"Asia",
  "Ecuador":"South America","Yemen":"Asia","Rwanda":"Africa","Bangladesh":"Asia",
  "Romania":"Europe","Slovakia":"Europe","Austria":"Europe","Netherlands":"Europe",
  "Luxembourg":"Europe","Czechia":"Europe","Liberia":"Africa","Iran":"Asia",
  "Estonia":"Europe","Vatican City":"Europe","Equatorial Guinea":"Africa","Syria":"Asia",
  "Malaysia":"Asia","Antigua and Barbuda":"North America","Indonesia":"Asia",
  "Dominican Republic":"North America","Slovenia":"Europe","Serbia":"Europe",
  "Taiwan":"Asia","Namibia":"Africa","North Macedonia":"Europe","Canada":"North America",
  "Hungary":"Europe","Saint Lucia":"North America","South Korea":"Asia","Guyana":"South America",
  "Latvia":"Europe","Bahamas":"North America","Bhutan":"Asia","Kosovo":"Europe",
  "Angola":"Africa","Democratic Republic of the Congo":"Africa","Uruguay":"South America",
  "Monaco":"Europe","Cambodia":"Asia","Qatar":"Asia","Afghanistan":"Asia",
  "Malta":"Europe","Micronesia":"Oceania","Zambia":"Africa","Tajikistan":"Asia",
  "Mexico":"North America","Bulgaria":"Europe","Belarus":"Europe","Bahrain":"Asia",
  "Zimbabwe":"Africa","Bosnia and Herzegovina":"Europe","Somalia":"Africa",
  "Paraguay":"South America","Sudan":"Africa","Kazakhstan":"Asia","Benin":"Africa",
  "Thailand":"Asia","Uzbekistan":"Asia","Mongolia":"Asia","Montenegro":"Europe",
  "Chad":"Africa","China":"Asia","Guinea-Bissau":"Africa","Australia":"Oceania",
  "Laos":"Asia","Madagascar":"Africa","Jordan":"Asia","Grenada":"North America",
  "San Marino":"Europe","Armenia":"Asia","Andorra":"Europe","Dominica":"North America",
  "Moldova":"Europe","Republic of the Congo":"Africa","Algeria":"Africa","Cabo Verde":"Africa",
  "Jamaica":"North America","Vietnam":"Asia","United Arab Emirates":"Asia","Belize":"North America",
  "Kuwait":"Asia","The Gambia":"Africa","Sierra Leone":"Africa","Argentina":"South America",
  "Liechtenstein":"Europe","Bolivia":"South America","Trinidad and Tobago":"North America",
  "Azerbaijan":"Asia","Lithuania":"Europe","Solomon Islands":"Oceania","Suriname":"South America",
  "Brunei":"Asia","Honduras":"North America","Burkina Faso":"Africa","Palau":"Oceania",
  "New Zealand":"Oceania","Gabon":"Africa","Oman":"Asia","Maldives":"Asia",
  "Guatemala":"North America","Kyrgyzstan":"Asia","Central African Republic":"Africa",
  "Niger":"Africa","El Salvador":"North America","Vanuatu":"Oceania","Mali":"Africa",
  "Uganda":"Africa","Marshall Islands":"Oceania","Togo":"Africa","Myanmar":"Asia",
  "Malawi":"Africa","United States":"North America","Libya":"Africa","Djibouti":"Africa",
  "Saint Kitts and Nevis":"North America","Tanzania":"Africa","Barbados":"North America",
  "Ivory Coast":"Africa","Chile":"South America","South Africa":"Africa","Türkiye":"Asia",
  "South Sudan":"Africa","Costa Rica":"North America","Tunisia":"Africa","Nauru":"Oceania",
  "Egypt":"Africa","Philippines":"Asia","Peru":"South America","Ghana":"Africa",
  "Mauritania":"Africa","Venezuela":"South America","Haiti":"North America","Cameroon":"Africa",
  "Tonga":"Oceania","Mauritius":"Africa","Morocco":"Africa","Burundi":"Africa",
  "Botswana":"Africa","Ethiopia":"Africa","Kenya":"Africa","Mozambique":"Africa",
  "Senegal":"Africa","Papua New Guinea":"Oceania","Nigeria":"Africa","Palestine":"Asia",
  "Comoros":"Africa","Seychelles":"Africa","Saint Vincent and the Grenadines":"North America",
  "Tuvalu":"Oceania","Guinea":"Africa","Eritrea":"Africa","São Tomé and Príncipe":"Africa",
  "Lesotho":"Africa"
};

const countryCapitals = {
  "Japan":"Tokyo","United Kingdom":"London","Cuba":"Havana","Sri Lanka":"Colombo",
  "Germany":"Berlin","Fiji":"Suva","France":"Paris","Colombia":"Bogotá",
  "Switzerland":"Bern","Sweden":"Stockholm","Italy":"Rome","Spain":"Madrid",
  "Israel":"Jerusalem","India":"New Delhi","Greece":"Athens","Ireland":"Dublin",
  "Finland":"Helsinki","Brazil":"Brasília","Timor-Leste":"Dili","Kiribati":"Tarawa",
  "Poland":"Warsaw","Norway":"Oslo","Turkmenistan":"Ashgabat","Saudi Arabia":"Riyadh",
  "Panama":"Panama City","Belgium":"Brussels","Denmark":"Copenhagen","Eswatini":"Mbabane",
  "Ukraine":"Kyiv","Nicaragua":"Managua","Portugal":"Lisbon","Singapore":"Singapore",
  "Nepal":"Kathmandu","Samoa":"Apia","North Korea":"Pyongyang","Iceland":"Reykjavik",
  "Cyprus":"Nicosia","Croatia":"Zagreb","Georgia":"Tbilisi","Russia":"Moscow",
  "Albania":"Tirana","Pakistan":"Islamabad","Lebanon":"Beirut","Iraq":"Baghdad",
  "Ecuador":"Quito","Yemen":"Sanaa","Rwanda":"Kigali","Bangladesh":"Dhaka",
  "Romania":"Bucharest","Slovakia":"Bratislava","Austria":"Vienna","Netherlands":"Amsterdam",
  "Luxembourg":"Luxembourg City","Czechia":"Prague","Liberia":"Monrovia","Iran":"Tehran",
  "Estonia":"Tallinn","Vatican City":"Vatican City","Equatorial Guinea":"Malabo","Syria":"Damascus",
  "Malaysia":"Kuala Lumpur","Antigua and Barbuda":"Saint John's","Indonesia":"Jakarta",
  "Dominican Republic":"Santo Domingo","Slovenia":"Ljubljana","Serbia":"Belgrade",
  "Taiwan":"Taipei","Namibia":"Windhoek","North Macedonia":"Skopje","Canada":"Ottawa",
  "Hungary":"Budapest","Saint Lucia":"Castries","South Korea":"Seoul","Guyana":"Georgetown",
  "Latvia":"Riga","Bahamas":"Nassau","Bhutan":"Thimphu","Kosovo":"Pristina",
  "Angola":"Luanda","Democratic Republic of the Congo":"Kinshasa","Uruguay":"Montevideo",
  "Monaco":"Monaco","Cambodia":"Phnom Penh","Qatar":"Doha","Afghanistan":"Kabul",
  "Malta":"Valletta","Micronesia":"Palikir","Zambia":"Lusaka","Tajikistan":"Dushanbe",
  "Mexico":"Mexico City","Bulgaria":"Sofia","Belarus":"Minsk","Bahrain":"Manama",
  "Zimbabwe":"Harare","Bosnia and Herzegovina":"Sarajevo","Somalia":"Mogadishu",
  "Paraguay":"Asunción","Sudan":"Khartoum","Kazakhstan":"Nur-Sultan","Benin":"Porto-Novo",
  "Thailand":"Bangkok","Uzbekistan":"Tashkent","Mongolia":"Ulaanbaatar","Montenegro":"Podgorica",
  "Chad":"N'Djamena","China":"Beijing","Guinea-Bissau":"Bissau","Australia":"Canberra",
  "Laos":"Vientiane","Madagascar":"Antananarivo","Jordan":"Amman","Grenada":"Saint George's",
  "San Marino":"San Marino","Armenia":"Yerevan","Andorra":"Andorra la Vella","Dominica":"Roseau",
  "Moldova":"Chișinău","Republic of the Congo":"Brazzaville","Algeria":"Algiers","Cabo Verde":"Praia",
  "Jamaica":"Kingston","Vietnam":"Hanoi","United Arab Emirates":"Abu Dhabi","Belize":"Belmopan",
  "Kuwait":"Kuwait City","The Gambia":"Banjul","Sierra Leone":"Freetown","Argentina":"Buenos Aires",
  "Liechtenstein":"Vaduz","Bolivia":"Sucre","Trinidad and Tobago":"Port of Spain",
  "Azerbaijan":"Baku","Lithuania":"Vilnius","Solomon Islands":"Honiara","Suriname":"Paramaribo",
  "Brunei":"Bandar Seri Begawan","Honduras":"Tegucigalpa","Burkina Faso":"Ouagadougou","Palau":"Ngerulmud",
  "New Zealand":"Wellington","Gabon":"Libreville","Oman":"Muscat","Maldives":"Malé",
  "Guatemala":"Guatemala City","Kyrgyzstan":"Bishkek","Central African Republic":"Bangui",
  "Niger":"Niamey","El Salvador":"San Salvador","Vanuatu":"Port Vila","Mali":"Bamako",
  "Uganda":"Kampala","Marshall Islands":"Majuro","Togo":"Lomé","Myanmar":"Naypyidaw",
  "Malawi":"Lilongwe","United States":"Washington, D.C.","Libya":"Tripoli","Djibouti":"Djibouti",
  "Saint Kitts and Nevis":"Basseterre","Tanzania":"Dodoma","Barbados":"Bridgetown",
  "Ivory Coast":"Yamoussoukro","Chile":"Santiago","South Africa":"Cape Town","Türkiye":"Ankara",
  "South Sudan":"Juba","Costa Rica":"San José","Tunisia":"Tunis","Nauru":"Yaren",
  "Egypt":"Cairo","Philippines":"Manila","Peru":"Lima","Ghana":"Accra",
  "Mauritania":"Nouakchott","Venezuela":"Caracas","Haiti":"Port-au-Prince","Cameroon":"Yaoundé",
  "Tonga":"Nuku'alofa","Mauritius":"Port Louis","Morocco":"Rabat","Burundi":"Gitega",
  "Botswana":"Gaborone","Ethiopia":"Addis Ababa","Kenya":"Nairobi","Mozambique":"Maputo",
  "Senegal":"Dakar","Papua New Guinea":"Port Moresby","Nigeria":"Abuja","Palestine":"Ramallah",
  "Comoros":"Moroni","Seychelles":"Victoria","Saint Vincent and the Grenadines":"Kingstown",
  "Tuvalu":"Funafuti","Guinea":"Conakry","Eritrea":"Asmara","São Tomé and Príncipe":"São Tomé",
  "Lesotho":"Maseru"
};

const countries = Object.keys(countryContinent).sort();

/* A minimal special-case alpha-2 mapping to avoid REST lookups for known tricky names. */
const alpha2Overrides = {
  "Ivory Coast": "ci",
  "Türkiye": "tr",
  "United States": "us",
  "United Kingdom": "gb",
  "Cabo Verde": "cv",
  "The Gambia": "gm",
  "Czechia": "cz",
  "Taiwan": "tw",
  "North Macedonia": "mk",
  "South Korea": "kr",
  "North Korea": "kp",
  "Russia": "ru",
  "Vatican City": "va",
  "Myanmar": "mm",
  "Eswatini": "sz",
  "Congo": "cg",
  "Republic of the Congo": "cg",
  "Democratic Republic of the Congo": "cd",
  "São Tomé and Príncipe": "st",
  "Palestine": "ps",
  "Timor-Leste": "tl",
  "Micronesia": "fm",
  "Solomon Islands": "sb",
  "Marshall Islands": "mh",
  "Antigua and Barbuda": "ag",
  "Saint Kitts and Nevis": "kn",
  "Saint Lucia": "lc",
  "Saint Vincent and the Grenadines": "vc",
  "Trinidad and Tobago": "tt",
  "Cape Verde": "cv" // legacy name safeguard
};

/* =========================
   LocalStorage helpers
   ========================= */
const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const LS_KEYS = {
  reviseFlags: "revise_flags",
  reviseCapitals: "revise_capitals",
  highScores: "high_scores",
  sessionPercentages: "session_percentages"
};

/* =========================
   Utility: Levenshtein distance
   ========================= */
function normalise(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim();
}
function levenshtein(a, b) {
  a = normalise(a); b = normalise(b);
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}
function fuzzyMatch(input, answer) {
  const a = normalise(input);
  const b = normalise(answer);
  if (a === b) return true;
  const d = levenshtein(a, b);
  const threshold = Math.max(1, Math.floor(b.length * 0.2));
  return d <= threshold;
}

/* =========================
   Aliases
   ========================= */
const countryAliases = {
  "United States": ["usa", "us", "america", "united states of america"],
  "Vatican City": ["vatican"],
  "Saint Vincent and the Grenadines": ["st vincent", "saint vincent"],
  "United Kingdom": ["uk", "gb", "great britain", "britain"],
  "Papua New Guinea": ["png"],
  "São Tomé and Príncipe": ["sao tome", "sao"],
  "Saint Kitts and Nevis": ["st kitts"],
  "Republic of the Congo": ["congo", "rep congo"],
  "Democratic Republic of the Congo": ["drc", "congo drc", "congo kinshasa"],
  "Central African Republic": ["car"],
  "North Korea": ["dprk"],
  "United Arab Emirates": ["uae"],
  "Türkiye": ["turkey"],
  "North Macedonia": ["macedonia"],
  "South Africa": ["rsa"],
  "The Gambia": ["gambia"]
};

const capitalAliases = {
  "Washington, D.C.": ["washington", "dc", "washington dc"],
  "New Delhi": ["delhi"],
  "Vatican City": ["vatican"],
  "Luxembourg City": ["luxembourg"],
  "Kuwait City": ["kuwait"],
  "Panama City": ["panama"],
  "Guatemala City": ["guatemala"],
  "Mexico City": ["mexico"],
  "Saint John's": ["st johns", "saint johns"],
  "Saint George's": ["st georges", "saint georges"],
  "Port of Spain": ["port-of-spain","port of spain"],
  "San José": ["san jose"],
  "São Tomé": ["sao tome"],
  "N'Djamena": ["ndjamena"],
  "Nur-Sultan": ["nur sultan", "astana"],
  "Bandar Seri Begawan": ["bsb"]
};

/* =========================
   Flag helpers
   ========================= */
async function getAlpha2(countryName) {
  if (alpha2Overrides[countryName]) return alpha2Overrides[countryName];

  try {
    const resp = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true`
    );
    if (!resp.ok) throw new Error("restcountries not ok");
    const data = await resp.json();
    const code = (data && data[0] && data[0].cca2) ? data[0].cca2.toLowerCase() : null;
    return code;
  } catch {
    return null;
  }
}
function flagUrlFromAlpha2(alpha2, size = 320) {
  return `https://flagcdn.com/w${size}/${alpha2}.png`;
}

/* Graceful flag element creator */
async function createFlagImg(country, size = 320, fallbackLabel = "") {
  const img = document.createElement("img");
  img.alt = `Flag of ${country}`;
  img.loading = "lazy";

  // Try override first, then REST if needed
  let alpha2 = alpha2Overrides[country] || null;
  if (!alpha2) alpha2 = await getAlpha2(country);
  if (alpha2) {
    img.src = flagUrlFromAlpha2(alpha2, size);
  } else {
    // Fallback to text label
    const div = document.createElement("div");
    div.style.width = `${size}px`;
    div.style.height = `${Math.round(size * 0.625)}px`;
    div.className = "flag-fallback";
    div.textContent = fallbackLabel || `Flag of ${country}`;
    return div;
  }

  // If image fails, replace with text
  img.addEventListener("error", () => {
    const div = document.createElement("div");
    div.style.width = `${size}px`;
    div.style.height = `${Math.round(size * 0.625)}px`;
    div.className = "flag-fallback";
    div.textContent = fallbackLabel || `Flag of ${country}`;
    img.replaceWith(div);
  });

  return img;
}

/* =========================
   DOM refs
   ========================= */
const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = {
  flags: document.getElementById("tab-flags"),
  capitals: document.getElementById("tab-capitals"),
  viewAll: document.getElementById("tab-view-all"),
  viewRevise: document.getElementById("tab-view-revise")
};

/* Flag tab refs */
const flagsContinent = document.getElementById("flags-continent");
const flagsToggleReviseBtn = document.getElementById("flags-toggle-revise");
const flagsHard = document.getElementById("flags-hard");
const flagsVisual = document.getElementById("flags-question-visual");
const flagsMcq = document.getElementById("flags-mcq");
const flagsMcqBtns = Array.from(flagsMcq.querySelectorAll(".mcq-btn"));
const flagsTextBox = document.getElementById("flags-text");
const flagsInput = document.getElementById("flags-input");
const flagsSubmit = document.getElementById("flags-submit");
const flagsGiveup = document.getElementById("flags-giveup");
const flagsFeedback = document.getElementById("flags-feedback");
const flagsReviseFeedback = document.getElementById("flags-revise-feedback");
const flagsScore = document.getElementById("flags-score");
const flagsPercentage = document.getElementById("flags-percentage");
const flagsSession = document.getElementById("flags-session");
const flagsLast = document.getElementById("flags-last");
const flagsNext = document.getElementById("flags-next");

/* Capital tab refs */
const capitalsContinent = document.getElementById("capitals-continent");
const capitalsToggleReviseBtn = document.getElementById("capitals-toggle-revise");
const capitalsHard = document.getElementById("capitals-hard");
const capitalsVisual = document.getElementById("capitals-question-visual");
const capitalsCountryLabel = document.getElementById("capitals-country-label");
const capitalsMcq = document.getElementById("capitals-mcq");
const capitalsMcqBtns = Array.from(capitalsMcq.querySelectorAll(".mcq-btn"));
const capitalsTextBox = document.getElementById("capitals-text");
const capitalsInput = document.getElementById("capitals-input");
const capitalsSubmit = document.getElementById("capitals-submit");
const capitalsGiveup = document.getElementById("capitals-giveup");
const capitalsFeedback = document.getElementById("capitals-feedback");
const capitalsReviseFeedback = document.getElementById("capitals-revise-feedback");
const capitalsScore = document.getElementById("capitals-score");
const capitalsPercentage = document.getElementById("capitals-percentage");
const capitalsSession = document.getElementById("capitals-session");
const capitalsLast = document.getElementById("capitals-last");
const capitalsNext = document.getElementById("capitals-next");

/* View all */
const viewAllGrid = document.getElementById("view-all-grid");
/* View revise */
const reviseContinent = document.getElementById("revise-continent");
const reviseList = document.getElementById("revise-list");

/* =========================
   Global quiz state
   ========================= */
const state = {
  tab: "flags", // "flags" | "capitals" | "view-all" | "view-revise"
  selectedContinent: "All",
  hardMode: { flags: false, capitals: false },

  // persistent
  reviseFlags: storage.get(LS_KEYS.reviseFlags, []),
  reviseCapitals: storage.get(LS_KEYS.reviseCapitals, []),
  highScores: storage.get(LS_KEYS.highScores, {}),
  sessionPercentages: storage.get(LS_KEYS.sessionPercentages, {}),

  // dynamic session (per quiz)
  flags: {
    correctCountry: null,
    correctAnswer: null, // same as country for flags
    currentPool: [],
    sessionAnswered: new Set(),
    sessionSkipped: new Set(),
    sessionIncorrect: new Set(),
    sessionCorrect: 0,
    sessionTotal: 0,
    streak: 0,
    questionAnswered: false,
    history: []
  },
  capitals: {
    correctCountry: null,
    correctAnswer: null, // capital name
    currentPool: [],
    sessionAnswered: new Set(),
    sessionSkipped: new Set(),
    sessionIncorrect: new Set(),
    sessionCorrect: 0,
    sessionTotal: 0,
    streak: 0,
    questionAnswered: false,
    history: []
  }
};

/* =========================
   Init
   ========================= */

function init() {
  // Tabs
  tabs.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Populate continent selects
  const continents = Array.from(new Set(Object.values(countryContinent))).sort();
  const flagOpts = ["All", ...continents, "Revise"];
  const capitalOpts = ["All", ...continents, "Revise Capitals"];

  populateSelect(flagsContinent, flagOpts);
  populateSelect(capitalsContinent, capitalOpts);
  populateSelect(reviseContinent, ["All", ...continents]);

  // Defaults
  flagsContinent.value = "All";
  capitalsContinent.value = "All";
  reviseContinent.value = "All";

  // Hook controls
  flagsHard.addEventListener("change", () => toggleMode("flags"));
  capitalsHard.addEventListener("change", () => toggleMode("capitals"));
  flagsContinent.addEventListener("change", () => onModeChange("flags"));
  capitalsContinent.addEventListener("change", () => onModeChange("capitals"));

  flagsSubmit.addEventListener("click", () => checkTextAnswer("flags"));
  capitalsSubmit.addEventListener("click", () => checkTextAnswer("capitals"));
  flagsInput.addEventListener("keydown", e => { if (e.key === "Enter") checkTextAnswer("flags"); });
  capitalsInput.addEventListener("keydown", e => { if (e.key === "Enter") checkTextAnswer("capitals"); });

  flagsGiveup.addEventListener("click", () => giveUp("flags"));
  capitalsGiveup.addEventListener("click", () => giveUp("capitals"));

  flagsNext.addEventListener("click", () => nextQuestion("flags"));
  capitalsNext.addEventListener("click", () => nextQuestion("capitals"));
  flagsLast.addEventListener("click", () => lastQuestion("flags"));
  capitalsLast.addEventListener("click", () => lastQuestion("capitals"));

  flagsToggleReviseBtn.addEventListener("click", () => toggleRevise("flags"));
  capitalsToggleReviseBtn.addEventListener("click", () => toggleRevise("capitals"));

  // MCQ handlers
  flagsMcqBtns.forEach((b, i) => b.addEventListener("click", () => checkMcq(i, "flags")));
  capitalsMcqBtns.forEach((b, i) => b.addEventListener("click", () => checkMcq(i, "capitals")));

  // View switches
  document.querySelectorAll('input[name="view-mode"]').forEach(r => {
    r.addEventListener("change", updateViewAll);
  });
  document.querySelectorAll('input[name="revise-mode"]').forEach(r => {
    r.addEventListener("change", updateViewRevise);
  });
  reviseContinent.addEventListener("change", updateViewRevise);

  // First questions
  loadNewQuestion("flags");
  loadNewQuestion("capitals");
  updateViewAll();
  updateViewRevise();
  applyHardModeUI("flags");
  applyHardModeUI("capitals");
}

function populateSelect(select, values) {
  select.innerHTML = "";
  values.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

/* =========================
   Tabs
   ========================= */
function switchTab(tabKey) {
  state.tab = tabKey;
  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabKey));
  panels.flags.classList.toggle("active", tabKey === "flags");
  panels.capitals.classList.toggle("active", tabKey === "capitals");
  panels.viewAll.classList.toggle("active", tabKey === "view-all");
  panels.viewRevise.classList.toggle("active", tabKey === "view-revise");

  if (tabKey === "view-all") updateViewAll();
  if (tabKey === "view-revise") updateViewRevise();
}

/* =========================
   Mode switching and session reset
   ========================= */
function onModeChange(which) {
  toggleMode(which); // refresh UI block arrangement
  resetSession(which);
}

function toggleMode(which) {
  const hard = (which === "flags") ? flagsHard.checked : capitalsHard.checked;
  state.hardMode[which] = hard;
  applyHardModeUI(which);
  // if a question is already loaded, refresh MCQ arrangements if needed
  if (!hard) setupMultipleChoice(which);
}

function applyHardModeUI(which) {
  const hard = state.hardMode[which];
  const mcq = (which === "flags") ? flagsMcq : capitalsMcq;
  const textBox = (which === "flags") ? flagsTextBox : capitalsTextBox;
  mcq.style.display = hard ? "none" : "grid";
  textBox.style.display = hard ? "flex" : "none";
}

function resetSession(which) {
  const s = state[which];
  s.currentPool = [];
  s.sessionAnswered = new Set();
  s.sessionSkipped = new Set();
  s.sessionIncorrect = new Set();
  s.sessionCorrect = 0;
  s.sessionTotal = 0;
  s.streak = 0;
  s.questionAnswered = false;
  s.history = [];
  updateSessionDisplay(which);
  clearFeedback(which);
  loadNewQuestion(which);
}

/* =========================
   Question loading
   ========================= */
async function loadNewQuestion(which) {
  const continentSel = (which === "flags") ? flagsContinent.value : capitalsContinent.value;
  const s = state[which];

  clearFeedback(which);

  // Build pool once per session/mode
  if (s.currentPool.length === 0) {
    if (continentSel === "Revise") {
      s.currentPool = [...state.reviseFlags];
    } else if (continentSel === "Revise Capitals") {
      s.currentPool = [...state.reviseCapitals];
    } else if (continentSel === "All") {
      s.currentPool = [...countries];
    } else {
      s.currentPool = countries.filter(c => countryContinent[c] === continentSel);
    }
  }

  // Determine unanswered
  let unanswered = s.currentPool.filter(c => !s.sessionAnswered.has(c));
  if (unanswered.length === 0 && s.sessionSkipped.size > 0) {
    unanswered = Array.from(s.sessionSkipped);
    s.sessionSkipped.clear();
  }

  // No items to show
  if (unanswered.length === 0) {
    if (s.sessionTotal > 0) {
      showSessionResults(which);
      return;
    }
    renderEmptyQuestion(which);
    return;
  }

  s.correctCountry = unanswered[Math.floor(Math.random() * unanswered.length)];
  s.history.push(s.correctCountry);
  s.questionAnswered = false;

  // Prepare view
  if (which === "flags") {
    s.correctAnswer = s.correctCountry;
    await renderFlagQuestion("flags", s.correctCountry);
  } else {
    s.correctAnswer = countryCapitals[s.correctCountry] || "Unknown";
    await renderFlagQuestion("capitals", s.correctCountry);
    capitalsCountryLabel.textContent = `What is the capital of ${s.correctCountry}?`;
  }

  updateReviseButton(which);
  updateSessionDisplay(which);
  updateScoreDisplays(which);

  // Input focus for hard mode
  if (state.hardMode[which]) {
    const input = which === "flags" ? flagsInput : capitalsInput;
    input.value = "";
    input.disabled = false;
    const submit = which === "flags" ? flagsSubmit : capitalsSubmit;
    submit.disabled = false;
    input.focus();
  } else {
    setupMultipleChoice(which);
  }

  // Enable or disable Last
  const lastBtn = which === "flags" ? flagsLast : capitalsLast;
  lastBtn.disabled = state[which].history.length <= 1;
}

function renderEmptyQuestion(which) {
  const visual = (which === "flags") ? flagsVisual : capitalsVisual;
  visual.innerHTML = `<div style="padding:24px;color:#aab2c0">No items available.</div>`;
  const mcqBtns = which === "flags" ? flagsMcqBtns : capitalsMcqBtns;
  mcqBtns.forEach(b => { b.textContent = ""; b.disabled = true; });
  if (state.hardMode[which]) {
    const input = which === "flags" ? flagsInput : capitalsInput;
    const submit = which === "flags" ? flagsSubmit : capitalsSubmit;
    input.disabled = true; submit.disabled = true;
  }
}

/* Render the flag image into the visual container */
async function renderFlagQuestion(which, country) {
  const visual = (which === "flags") ? flagsVisual : capitalsVisual;
  visual.innerHTML = "";
  const holder = document.createElement("div");
  holder.style.minHeight = "210px";
  holder.style.display = "grid";
  holder.style.placeItems = "center";
  visual.appendChild(holder);

  const img = await createFlagImg(country, 320, `Flag of ${country}`);
  holder.innerHTML = ""; // clear
  holder.appendChild(img);
}

/* =========================
   MCQ setup and answer checking
   ========================= */
function setupMultipleChoice(which) {
  const s = state[which];
  if (!s.correctCountry || s.currentPool.length === 0) return;

  let options;
  let pool;
  if (which === "flags") {
    options = [s.correctCountry];
    pool = s.currentPool;
  } else {
    options = [s.correctAnswer];
    pool = s.currentPool.map(c => countryCapitals[c]).filter(Boolean);
  }

  while (options.length < 4 && options.length < pool.length) {
    const choice = pool[Math.floor(Math.random() * pool.length)];
    if (!options.includes(choice)) options.push(choice);
  }
  shuffle(options);

  const buttons = which === "flags" ? flagsMcqBtns : capitalsMcqBtns;
  buttons.forEach((btn, i) => {
    if (i < options.length) {
      btn.textContent = options[i];
      btn.disabled = false;
      btn.style.opacity = "1";
    } else {
      btn.textContent = "";
      btn.disabled = true;
      btn.style.opacity = "0.7";
    }
  });
}

function checkMcq(index, which) {
  const buttons = which === "flags" ? flagsMcqBtns : capitalsMcqBtns;
  const s = state[which];
  const selected = buttons[index].textContent;
  s.questionAnswered = true;

  const firstAttempt = !s.sessionAnswered.has(s.correctCountry);
  if (firstAttempt) {
    s.sessionTotal += 1;
    s.sessionAnswered.add(s.correctCountry);
  }

  const correct = which === "flags" ? s.correctCountry : s.correctAnswer;
  if (selected === correct) {
    setFeedback(which, "Correct!", true);
    buttons.forEach(b => b.disabled = true);
    if (firstAttempt) {
      s.streak += 1;
      s.sessionCorrect += 1;
    }
    updateScoresAndAdvance(which);
  } else {
    setFeedback(which, "Incorrect. Try again.", false);
    s.streak = 0;
    if (firstAttempt) s.sessionIncorrect.add(s.correctCountry);
    updateScoreDisplays(which);
  }
}

/* =========================
   Text answers
   ========================= */
function checkTextAnswer(which) {
  const s = state[which];
  const inputEl = which === "flags" ? flagsInput : capitalsInput;
  const submitEl = which === "flags" ? flagsSubmit : capitalsSubmit;
  const val = inputEl.value.trim();
  if (!val) return;

  s.questionAnswered = true;
  const firstAttempt = !s.sessionAnswered.has(s.correctCountry);
  if (firstAttempt) {
    s.sessionTotal += 1;
    s.sessionAnswered.add(s.correctCountry);
  }

  const correct = which === "flags" ? s.correctCountry : s.correctAnswer;

  // exact
  if (normalise(val) === normalise(correct)
      || aliasMatch(which, val, s)) {
    setFeedback(which, "Correct!", true);
    inputEl.disabled = true; submitEl.disabled = true;
    if (firstAttempt) {
      s.streak += 1;
      s.sessionCorrect += 1;
    }
    updateScoresAndAdvance(which);
    return;
  }

  // fuzzy
  if (fuzzyMatch(val, correct)) {
    setFeedback(which, "Correct! (Close enough)", true);
    inputEl.disabled = true; submitEl.disabled = true;
    if (firstAttempt) {
      s.streak += 1;
      s.sessionCorrect += 1;
    }
    updateScoresAndAdvance(which);
    return;
  }

  setFeedback(which, "Incorrect. Try again.", false);
  s.streak = 0;
  if (firstAttempt) s.sessionIncorrect.add(s.correctCountry);
  updateScoreDisplays(which);
  inputEl.select();
}

function aliasMatch(which, userInput, s) {
  const text = normalise(userInput);
  if (which === "flags") {
    const aliases = countryAliases[s.correctCountry];
    return aliases ? aliases.some(a => normalise(a) === text) : false;
  } else {
    const aliases = capitalAliases[s.correctAnswer];
    return aliases ? aliases.some(a => normalise(a) === text) : false;
  }
}

/* =========================
   Scores, high scores, percentages
   ========================= */
function updateScoresAndAdvance(which) {
  const mode = getModeKey(which);
  const s = state[which];

  // high score (streak)
  const currentHigh = state.highScores[mode] || 0;
  if (s.streak > currentHigh) {
    state.highScores[mode] = s.streak;
    storage.set(LS_KEYS.highScores, state.highScores);
  }

  updateScoreDisplays(which);

  const continentSel = (which === "flags") ? flagsContinent.value : capitalsContinent.value;
  const inReviseMode = (continentSel === "Revise" || continentSel === "Revise Capitals");

  if (!inReviseMode) {
    // auto advance quickly
    setTimeout(() => loadNewQuestion(which), 200);
  } else {
    // keep input ready in revise mode
    const inputEl = which === "flags" ? flagsInput : capitalsInput;
    const submitEl = which === "flags" ? flagsSubmit : capitalsSubmit;
    inputEl.value = "";
    inputEl.disabled = false;
    submitEl.disabled = false;
    inputEl.focus();
  }
}

function getModeKey(which) {
  const continentSel = (which === "flags") ? flagsContinent.value : capitalsContinent.value;
  const hardSuffix = state.hardMode[which] ? "_hard" : "_normal";
  return `${which}_${continentSel}${hardSuffix}`;
}

function updateScoreDisplays(which) {
  const s = state[which];
  const scoreEl = which === "flags" ? flagsScore : capitalsScore;
  const pctEl = which === "flags" ? flagsPercentage : capitalsPercentage;

  const mode = getModeKey(which);
  const high = state.highScores[mode] || 0;
  const dispMode = `${getContinentDisplay(which)} (${state.hardMode[which] ? "H" : "N"})`;
  scoreEl.textContent = `Streak: ${s.streak} | High: ${high} (${dispMode})`;

  const bestPct = state.sessionPercentages[mode] || 0;
  pctEl.textContent = `Best Session: ${bestPct}% (${dispMode})`;
}

function getContinentDisplay(which) {
  return which === "flags" ? flagsContinent.value : capitalsContinent.value;
}

function updateSessionDisplay(which) {
  const s = state[which];
  const sessionEl = which === "flags" ? flagsSession : capitalsSession;
  if (s.currentPool.length) {
    const answered = s.sessionAnswered.size;
    const total = s.currentPool.length;
    sessionEl.textContent = `Progress: ${answered}/${total} | Remaining: ${total - answered}`;
  } else {
    sessionEl.textContent = "";
  }
}

/* Session results dialog (inline, simple) */
function showSessionResults(which) {
  const s = state[which];
  if (s.sessionTotal <= 0) return;

  const percentage = Math.round((s.sessionCorrect / s.sessionTotal) * 1000) / 10;
  const mode = getModeKey(which);

  const oldBest = state.sessionPercentages[mode] || 0;
  let recordNote = "";
  if (percentage > oldBest) {
    state.sessionPercentages[mode] = percentage;
    storage.set(LS_KEYS.sessionPercentages, state.sessionPercentages);
    recordNote = "  NEW PERCENTAGE RECORD!";
  } else {
    recordNote = `  (Best: ${oldBest}%)`;
  }

  // Build incorrect list summary
  let wrongList = "";
  if (s.sessionIncorrect.size > 0) {
    const arr = Array.from(s.sessionIncorrect).sort();
    wrongList = "\n\nGot these wrong:\n• " + arr.join("\n• ");
  }

  alert(
    `Session Complete!\n` +
    `Correct: ${s.sessionCorrect}/${s.sessionTotal} (${percentage}%)${recordNote}` +
    wrongList +
    `\n\nOK = Play this mode again.`
  );

  resetSession(which);
}

/* =========================
   Navigation
   ========================= */
function nextQuestion(which) {
  const s = state[which];
  if (!s.questionAnswered && s.correctCountry) {
    s.sessionSkipped.add(s.correctCountry);
    // allow reappearance
    if (s.history.length && s.history[s.history.length - 1] === s.correctCountry) {
      s.history.pop();
    }
  }
  loadNewQuestion(which);
}

async function lastQuestion(which) {
  const s = state[which];
  if (s.history.length < 2) return;

  // remove current
  s.history.pop();
  const prev = s.history.pop();
  s.correctCountry = prev;
  s.questionAnswered = false;

  if (which === "flags") {
    s.correctAnswer = s.correctCountry;
    await renderFlagQuestion("flags", s.correctCountry);
  } else {
    s.correctAnswer = countryCapitals[s.correctCountry] || "Unknown";
    await renderFlagQuestion("capitals", s.correctCountry);
    capitalsCountryLabel.textContent = `What is the capital of ${s.correctCountry}?`;
  }

  s.history.push(s.correctCountry);
  updateReviseButton(which);
  updateSessionDisplay(which);
  clearFeedback(which);

  if (state.hardMode[which]) {
    const input = which === "flags" ? flagsInput : capitalsInput;
    const submit = which === "flags" ? flagsSubmit : capitalsSubmit;
    input.value = "";
    input.disabled = false;
    submit.disabled = false;
    input.focus();
  } else {
    setupMultipleChoice(which);
  }
}

/* =========================
   Revise lists
   ========================= */
function toggleRevise(which) {
  const s = state[which];
  if (!s.correctCountry) return;

  const list = which === "flags" ? state.reviseFlags : state.reviseCapitals;
  const storageKey = which === "flags" ? LS_KEYS.reviseFlags : LS_KEYS.reviseCapitals;
  const feedbackEl = which === "flags" ? flagsReviseFeedback : capitalsReviseFeedback;

  const idx = list.indexOf(s.correctCountry);
  if (idx >= 0) {
    list.splice(idx, 1);
    setReviseFeedback(feedbackEl, which, false);
  } else {
    list.push(s.correctCountry);
    setReviseFeedback(feedbackEl, which, true);
  }
  storage.set(storageKey, list);
  updateReviseButton(which);

  // clear feedback after 3 seconds
  setTimeout(() => { feedbackEl.textContent = ""; }, 3000);
}

function updateReviseButton(which) {
  const s = state[which];
  const list = which === "flags" ? state.reviseFlags : state.reviseCapitals;
  const btn = which === "flags" ? flagsToggleReviseBtn : capitalsToggleReviseBtn;
  if (s.correctCountry && list.includes(s.correctCountry)) {
    btn.textContent = "Remove from Revise";
  } else {
    btn.textContent = "Add to Revise";
  }
}
function setReviseFeedback(el, which, added) {
  const country = state[which].correctCountry || "";
  if (state.hardMode[which]) {
    el.textContent = added ? "Added to Revise list." : "Removed from Revise list.";
  } else {
    el.textContent = added ? `Added ${country} to Revise list.` : `Removed ${country} from Revise list.`;
  }
}

/* =========================
   Give up
   ========================= */
function giveUp(which) {
  const s = state[which];
  if (s.currentPool.length === 0) {
    renderEmptyQuestion(which);
    return;
  }

  const unanswered = s.currentPool.filter(c => !s.sessionAnswered.has(c));
  for (const item of unanswered) {
    s.sessionIncorrect.add(item);
    s.sessionTotal += 1;
    s.sessionAnswered.add(item);
  }
  s.streak = 0;
  showSessionResults(which);
}

/* =========================
   Feedback helpers
   ========================= */
function setFeedback(which, text, ok) {
  const el = which === "flags" ? flagsFeedback : capitalsFeedback;
  el.textContent = text;
  el.classList.remove("ok", "err");
  el.classList.add(ok ? "ok" : "err");
}
function clearFeedback(which) {
  const el = which === "flags" ? flagsFeedback : capitalsFeedback;
  const r = which === "flags" ? flagsReviseFeedback : capitalsReviseFeedback;
  el.textContent = "";
  el.classList.remove("ok","err");
  r.textContent = "";
}

/* =========================
   View All
   ========================= */
async function updateViewAll() {
  const mode = document.querySelector('input[name="view-mode"]:checked').value; // flags | capitals
  viewAllGrid.innerHTML = "";

  // simple lazy render
  if (mode === "flags") {
    for (const c of countries) {
      const card = document.createElement("div");
      card.className = "card";
      const img = await createFlagImg(c, 320, `Flag of ${c}`);
      img.classList.add("flag");

      const title = document.createElement("div");
      title.className = "title";
      title.textContent = c;

      const cap = document.createElement("div");
      cap.className = "muted";
      cap.textContent = `Continent: ${countryContinent[c]}`;

      card.append(img, title, cap);
      viewAllGrid.appendChild(card);
    }
  } else {
    for (const c of countries) {
      const card = document.createElement("div");
      card.className = "card";
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = c;

      const cap = document.createElement("div");
      cap.className = "muted";
      cap.textContent = `Capital: ${countryCapitals[c] || "Unknown"}`;

      card.append(title, cap);
      viewAllGrid.appendChild(card);
    }
  }
}

/* =========================
   View Revise
   ========================= */
async function updateViewRevise() {
  const mode = document.querySelector('input[name="revise-mode"]:checked').value; // flags | capitals
  const continent = reviseContinent.value;
  reviseList.innerHTML = "";

  let items = mode === "flags" ? [...state.reviseFlags] : [...state.reviseCapitals];
  if (continent !== "All") {
    items = items.filter(c => countryContinent[c] === continent);
  }

  if (items.length === 0) {
    const p = document.createElement("p");
    p.style.color = "#aab2c0";
    p.style.padding = "18px 6px";
    p.textContent = mode === "flags"
      ? "No flags in your revise list for this continent. Add some from the Flag Quiz tab."
      : "No capitals in your revise list for this continent. Add some from the Capital Quiz tab.";
    reviseList.appendChild(p);
    return;
  }

  const header = document.createElement("h3");
  header.textContent = `${mode === "flags" ? "Flags" : "Capitals"} to Revise (${items.length} countries)`;
  reviseList.appendChild(header);

  for (let i = 0; i < items.length; i++) {
    const country = items[i];
    const row = document.createElement("div");
    row.className = "revise-item";

    if (mode === "flags") {
      const img = await createFlagImg(country, 80, "No flag");
      img.classList.add("revise-flag");
      row.appendChild(img);
      const label = document.createElement("div");
      label.textContent = `${i + 1}. ${country}`;
      row.appendChild(label);
    } else {
      const label = document.createElement("div");
      label.innerHTML = `<strong>${i + 1}. ${country}</strong> — Capital: <span style="color:#7bd09f">${countryCapitals[country] || "Unknown"}</span>`;
      row.appendChild(label);
    }

    reviseList.appendChild(row);
  }
}

/* =========================
   Small helpers
   ========================= */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* =========================
   Boot
   ========================= */
document.addEventListener("DOMContentLoaded", init);
