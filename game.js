const ANSWER_FLASH_MS = 100;
const TIMER_TICK_MS = 100;
const SPEEDRUN_SPLITS = [10, 25, 50, 100, 150];
const MAX_LEADERBOARD_RUNS = 5;
const MAX_SHARED_LEADERBOARD_RUNS = 5;
const LEADERBOARD_REFRESH_MS = 30000;
const MIN_SOLVED_QUESTION_MS = 180;
const WORLD_MAP_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const WORLD_MAP_WIDTH = 1440;
const WORLD_MAP_HEIGHT = 760;
const WORLD_MAP_MAIN_BOUNDS = [-180, -58, 180, 84];
const WORLD_MAP_FLAG_FILL_IDLE_TIMEOUT_MS = 1000;
const WORLD_MAP_FLAG_FILL_FALLBACK_MS = 180;
const WORLD_MAP_PANELS = [
  {id:"main", label:"World", x:0, y:0, width:1440, height:492},
  {id:"europe", label:"Europe detail", x:8, y:508, width:270, height:236, bounds:[-15, 34, 45, 72]},
  {id:"caribbean", label:"Caribbean detail", x:286, y:508, width:250, height:236, bounds:[-91, 7, -58, 29]},
  {id:"westafrica", label:"West Africa detail", x:544, y:508, width:290, height:236, bounds:[-20, -6, 18, 20]},
  {id:"gulf", label:"Gulf detail", x:842, y:508, width:190, height:236, bounds:[32, 11, 60, 34]},
  {id:"seasia", label:"SE Asia detail", x:1040, y:508, width:210, height:236, bounds:[94, -12, 132, 24]},
  {id:"oceania", label:"Oceania detail", x:1258, y:508, width:174, height:236, bounds:[112, -49, 205, 16]}
];
const WORLD_MAP_CONTINENT_BOUNDS = {
  "Africa":[-20, -36, 55, 38],
  "Asia":[25, -12, 190, 82],
  "Europe":[-25, 34, 45, 72],
  "North America":[-170, 5, -50, 84],
  "South America":[-83, -56, -34, 14],
  "Oceania":[95, -50, 205, 25]
};
const WORLD_MAP_COUNTRY_CONTINENTS = {
  "Russia":["Europe", "Asia"]
};
const WORLD_MAP_SMALL_MARKER_COUNTRIES = new Set([
  "Andorra",
  "Antigua and Barbuda",
  "Bahrain",
  "Barbados",
  "Brunei",
  "Cabo Verde",
  "Comoros",
  "Dominica",
  "Equatorial Guinea",
  "Grenada",
  "Kiribati",
  "Liechtenstein",
  "Luxembourg",
  "Maldives",
  "Malta",
  "Marshall Islands",
  "Mauritius",
  "Micronesia",
  "Monaco",
  "Nauru",
  "Palau",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "São Tomé and Príncipe",
  "Seychelles",
  "Singapore",
  "The Gambia",
  "Tonga",
  "Tuvalu",
  "Vatican City"
]);
const WORLD_MAP_CONTINENT_ORDER = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];
const WORLD_MAP_CONTINENT_SHORT_LABELS = {
  "Africa":"Afr",
  "Asia":"Asia",
  "Europe":"Eur",
  "North America":"N Am",
  "South America":"S Am",
  "Oceania":"Oce"
};

const WORLD_MAP_ID_OVERRIDES = {
  "070":"Bosnia and Herzegovina",
  "132":"Cabo Verde",
  "140":"Central African Republic",
  "178":"Republic of the Congo",
  "180":"Democratic Republic of the Congo",
  "203":"Czechia",
  "214":"Dominican Republic",
  "226":"Equatorial Guinea",
  "336":"Vatican City",
  "384":"Ivory Coast",
  "584":"Marshall Islands",
  "659":"Saint Kitts and Nevis",
  "670":"Saint Vincent and the Grenadines",
  "678":"São Tomé and Príncipe",
  "728":"South Sudan",
  "748":"Eswatini",
  "792":"Türkiye",
  "807":"North Macedonia",
  "840":"United States"
};

const WORLD_MAP_NAME_OVERRIDES = {
  "Antigua and Barb.":"Antigua and Barbuda",
  "Bosnia and Herz.":"Bosnia and Herzegovina",
  "Cape Verde":"Cabo Verde",
  "Central African Rep.":"Central African Republic",
  "Congo":"Republic of the Congo",
  "Czech Republic":"Czechia",
  "Dem. Rep. Congo":"Democratic Republic of the Congo",
  "Dominican Rep.":"Dominican Republic",
  "Eq. Guinea":"Equatorial Guinea",
  "eSwatini":"Eswatini",
  "Gambia":"The Gambia",
  "Ivory Coast":"Ivory Coast",
  "Macedonia":"North Macedonia",
  "Marshall Is.":"Marshall Islands",
  "S. Sudan":"South Sudan",
  "Sao Tome and Principe":"São Tomé and Príncipe",
  "Solomon Is.":"Solomon Islands",
  "St. Kitts and Nevis":"Saint Kitts and Nevis",
  "St. Vin. and Gren.":"Saint Vincent and the Grenadines",
  "Turkey":"Türkiye",
  "United States of America":"United States",
  "Vatican":"Vatican City"
};

const WORLD_MAP_CONTEXT_FEATURES = {
  "304": {name:"Greenland", continent:"North America", ownerCountry:"Denmark"}
};

const WORLD_MAP_CONTEXT_NAME_OVERRIDES = {
  "Greenland": {name:"Greenland", continent:"North America", ownerCountry:"Denmark"}
};

const WORLD_COUNTRY_EXTRA_ALIASES = {
  "Bahamas":["the bahamas"],
  "Cabo Verde":["cape verde"],
  "Czechia":["czech republic"],
  "Eswatini":["swaziland"],
  "Ivory Coast":["cote d ivoire","cote divoire"],
  "Myanmar":["burma"],
  "Palestine":["palestinian territories"],
  "São Tomé and Príncipe":["sao tome","sao","sao tome and principe"],
  "Türkiye":["turkey","turkiye"]
};

const WORLD_COUNTRY_EXTRA_ALIAS_CODES = {
  bs:["the bahamas"],
  cv:["cape verde"],
  cz:["czech republic"],
  sz:["swaziland"],
  ci:["cote d ivoire","cote divoire"],
  mm:["burma"],
  ps:["palestinian territories"],
  st:["sao tome","sao","sao tome and principe"],
  tr:["turkey","turkiye"]
};

const worldMapState = {
  features: null,
  loadPromise: null,
  error: "",
  renderToken: 0,
  defs: null,
  progress: null,
  pathElementsByCountry: new Map(),
  markerElementsByCountry: new Map(),
  pendingSolvedCountries: new Set(),
  pendingFlagFillCountries: new Set(),
  updateFrameId: 0,
  flagFillTimerId: 0
};

let countryAnswerIndex = null;

const state = {
  playMode: "practice",
  which: "flags",
  hard: false,
  selectedContinent: "All",
  lifeSetting: "unlimited",
  speedTarget: "all",
  playerName: storage.get(LS_KEYS.playerName, "Player"),
  playerId: storage.get(LS_KEYS.playerId, ""),
  playerNameHistory: storage.get(LS_KEYS.playerNameHistory, []),

  reviseFlags: storage.get(LS_KEYS.reviseFlags, []),
  reviseCapitals: storage.get(LS_KEYS.reviseCapitals, []),
  highScores: storage.get(LS_KEYS.highScores, {}),
  sessionPercentages: storage.get(LS_KEYS.sessionPercentages, {}),
  speedRuns: storage.get(LS_KEYS.speedRuns, {}),
  sharedLeaderboardRuns: {},
  sharedLeaderboardLoading: false,
  sharedLeaderboardLoadingKey: "",
  sharedLeaderboardError: "",
  sharedLeaderboardMessage: "",
  sharedLeaderboardLastLoadedKey: "",
  pendingSharedRun: null,
  lastCompletedRun: null,

  session: makeSession()
};

function makeSession(){
  return {
    correctCountry: null,
    correctAnswer: null,
    pool: [],
    answered: new Set(),
    solved: new Set(),
    skipped: new Set(),
    incorrect: new Set(),
    correctFirstTry: 0,
    totalFirstAttempts: 0,
    streak: 0,
    questionAnswered: false,
    currentWrongAttempts: 0,
    livesRemaining: null,
    gameOver: false,
    history: [],
    route: [],
    currentRouteIndex: -1,
    security: makeSecurityTelemetry(),
    worldAnswerStartedMs: null,
    worldLastSolvedMs: 0,
    worldWrongSubmissions: 0,
    speedRun: {
      started: false,
      startMs: 0,
      elapsedMs: 0,
      timerId: null,
      splits: {},
      gaveUp: false,
      recorded: false
    }
  };
}

function makeSecurityTelemetry(){
  return {
    nonce: makeNonce(),
    startedAt: new Date().toISOString(),
    focusLosses: 0,
    hiddenEvents: 0,
    pasteEvents: 0,
    keyEvents: 0,
    inputEvents: 0,
    pointerEvents: 0,
    suspiciousEvents: []
  };
}

function makeNonce(){
  const bytes = new Uint8Array(12);
  if(window.crypto && window.crypto.getRandomValues){
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte=>byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

const playModeButtons = Array.from(document.querySelectorAll(".play-mode-segment"));
const quizButtons = Array.from(document.querySelectorAll(".quiz-segment"));
const continentSelect = document.getElementById("continent-select");
const hardToggle = document.getElementById("hard-toggle");
const hardLabel = document.getElementById("hard-label");
const lifeSelect = document.getElementById("life-select");
const speedTargetSelect = document.getElementById("speed-target-select");
const reviseToggle = document.getElementById("revise-toggle");

const livesValue = document.getElementById("lives-value");
const livesStatus = document.getElementById("lives-status");
const timerValue = document.getElementById("timer-value");
const timerStatus = document.getElementById("timer-status");
const splitList = document.getElementById("split-list");
const leaderboardScopeLabel = document.getElementById("leaderboard-scope-label");
const leaderboardTitle = document.getElementById("leaderboard-title");
const leaderboardList = document.getElementById("leaderboard-list");
const answerFlash = document.getElementById("answer-flash");

const questionVisual = document.getElementById("question-visual");
const countryLabel = document.getElementById("country-label");
const mcq = document.getElementById("mcq");
const mcqBtns = Array.from(mcq.querySelectorAll(".mcq-btn"));
const textWrap = document.getElementById("text-answer");
const answerInput = document.getElementById("answer-input");
const submitBtn = document.getElementById("submit-btn");
const giveupBtn = document.getElementById("giveup-btn");
const feedback = document.getElementById("feedback");
const reviseFeedback = document.getElementById("revise-feedback");
const score = document.getElementById("score");
const best = document.getElementById("best");
const sessionText = document.getElementById("session");
const lastBtn = document.getElementById("last-btn");
const nextBtn = document.getElementById("next-btn");

const resultModal = document.getElementById("result-modal");
const resultKicker = document.getElementById("result-kicker");
const resultTitle = document.getElementById("result-title");
const resultHero = document.getElementById("result-hero");
const resultSummary = document.getElementById("result-summary");
const resultDetails = document.getElementById("result-details");
const leaderboardPublish = document.getElementById("leaderboard-publish");
const leaderboardPublishTitle = document.getElementById("leaderboard-publish-title");
const leaderboardPublishRow = document.getElementById("leaderboard-publish-row");
const resultPlayerNameInput = document.getElementById("result-player-name");
const postLeaderboardBtn = document.getElementById("post-leaderboard-btn");
const leaderboardPublishStatus = document.getElementById("leaderboard-publish-status");
const resultRetry = document.getElementById("result-retry");
const resultClose = document.getElementById("result-close");

function init(){
  playModeButtons.forEach(button=>{
    button.addEventListener("click", ()=>{
      if(state.playMode === button.dataset.playMode) return;
      state.playMode = button.dataset.playMode;
      if(state.playMode === "speedrun" && isRevisionMode()) state.selectedContinent = "All";
      if(state.playMode === "speedrun"){
        state.hard = true;
        state.speedTarget = "all";
      }
      syncModeButtons();
      populateContinents();
      populateSpeedTargets();
      resetSession();
    });
  });

  quizButtons.forEach(button=>{
    button.addEventListener("click", ()=>{
      if(state.which === button.dataset.mode) return;
      state.which = button.dataset.mode;
      state.selectedContinent = "All";
      if(isWorldMode()){
        state.hard = true;
        state.speedTarget = "all";
      }
      syncModeButtons();
      populateContinents();
      populateSpeedTargets();
      resetSession();
    });
  });

  continentSelect.addEventListener("change", ()=>{
    state.selectedContinent = continentSelect.value;
    populateSpeedTargets();
    resetSession();
  });
  hardToggle.addEventListener("change", ()=>{
    if(state.playMode === "speedrun"){
      state.hard = true;
      syncModeButtons();
      return;
    }
    state.hard = hardToggle.checked;
    resetSession();
  });
  lifeSelect.addEventListener("change", ()=>{
    state.lifeSetting = lifeSelect.value;
    resetSession();
  });
  speedTargetSelect.addEventListener("change", ()=>{
    state.speedTarget = speedTargetSelect.value;
    resetSession();
  });
  state.playerId = getOrCreatePlayerId();
  state.playerNameHistory = getCleanPlayerNameHistory();
  state.playerName = getDefaultPlayerName();
  if(resultPlayerNameInput){
    resultPlayerNameInput.value = state.playerName;
    resultPlayerNameInput.addEventListener("change", savePlayerName);
    resultPlayerNameInput.addEventListener("blur", savePlayerName);
  }

  mcqBtns.forEach((button,index)=>button.addEventListener("click",()=>checkMcq(index)));
  submitBtn.addEventListener("click", ()=>{
    checkText();
    keepAnswerInputFocused();
  });
  answerInput.addEventListener("keydown", event=>{
    if(event.key==="Enter"){
      event.preventDefault();
      checkText();
      keepAnswerInputFocused();
    }
  });
  answerInput.addEventListener("keydown", recordAnswerKey);
  answerInput.addEventListener("input", recordAnswerInput);
  answerInput.addEventListener("input", checkAutoSubmitText);
  answerInput.addEventListener("paste", recordPasteAttempt);
  document.addEventListener("pointerdown", recordPointerActivity, {passive:true});
  window.addEventListener("blur", recordFocusLoss);
  document.addEventListener("visibilitychange", recordVisibilityChange);
  reviseToggle.addEventListener("click", ()=>toggleRevise());
  lastBtn.addEventListener("click", ()=>lastQuestion());
  nextBtn.addEventListener("click", ()=>nextQuestion());
  giveupBtn.addEventListener("click", ()=>giveUp());
  resultRetry.addEventListener("click", ()=>{
    closeResultModal();
    resetSession();
  });
  resultClose.addEventListener("click", closeResultModal);
  if(postLeaderboardBtn) postLeaderboardBtn.addEventListener("click", postPendingSharedRun);

  syncModeButtons();
  populateContinents();
  populateSpeedTargets();
  resetSession();
  window.setInterval(()=>{
    if(state.playMode === "speedrun") refreshSharedLeaderboard();
  }, LEADERBOARD_REFRESH_MS);
}

function sanitizePlayerName(value){
  const cleaned = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^A-Za-z0-9 _.-]/g, "");
  return (cleaned || "Player").slice(0, 24);
}

function getOrCreatePlayerId(){
  const existing = String(state.playerId || "");
  if(/^[A-Za-z0-9_-]{16,80}$/.test(existing)) return existing;
  const id = makeNonce();
  storage.set(LS_KEYS.playerId, id);
  return id;
}

function getCleanPlayerNameHistory(){
  const names = Array.isArray(state.playerNameHistory) ? state.playerNameHistory : [];
  const clean = [];
  for(const name of names){
    const sanitized = sanitizePlayerName(name);
    if(sanitized && !clean.includes(sanitized)) clean.push(sanitized);
  }
  return clean.slice(0, 5);
}

function getDefaultPlayerName(){
  const saved = sanitizePlayerName(state.playerName);
  if(saved !== "Player") return saved;
  return state.playerNameHistory[0] || "Player";
}

function savePlayerName(){
  state.playerName = sanitizePlayerName(resultPlayerNameInput ? resultPlayerNameInput.value : state.playerName);
  if(resultPlayerNameInput) resultPlayerNameInput.value = state.playerName;
  storage.set(LS_KEYS.playerName, state.playerName);
}

function rememberPostedPlayerName(name){
  const sanitized = sanitizePlayerName(name);
  state.playerName = sanitized;
  state.playerNameHistory = [
    sanitized,
    ...getCleanPlayerNameHistory().filter(existing=>existing !== sanitized)
  ].slice(0, 5);
  storage.set(LS_KEYS.playerName, state.playerName);
  storage.set(LS_KEYS.playerNameHistory, state.playerNameHistory);
}

function isActiveSpeedRun(){
  return state.playMode === "speedrun"
    && state.session
    && state.session.speedRun.started
    && !state.session.gameOver
    && !state.session.speedRun.gaveUp;
}

function ensureSpeedRunStarted(){
  if(state.playMode === "speedrun" && state.session && !state.session.speedRun.started && !state.session.gameOver){
    startSpeedRun();
  }
}

function getCurrentRouteEntry(){
  const session = state.session;
  if(!session || session.currentRouteIndex < 0) return null;
  return session.route[session.currentRouteIndex] || null;
}

function recordSecurityEvent(type){
  const security = state.session && state.session.security;
  if(!security || !isActiveSpeedRun()) return;
  security.suspiciousEvents.push({
    type,
    ms: Math.round(getElapsedMs())
  });
}

function recordAnswerKey(event){
  ensureSpeedRunStarted();
  if(!isActiveSpeedRun()) return;
  const security = state.session.security;
  security.keyEvents += 1;
  const entry = getCurrentRouteEntry();
  if(entry){
    entry.keyEvents = (entry.keyEvents || 0) + 1;
    if(event.key && event.key.length === 1){
      entry.typedChars = (entry.typedChars || 0) + 1;
    }
  }
}

function recordAnswerInput(){
  ensureSpeedRunStarted();
  if(!isActiveSpeedRun()) return;
  const security = state.session.security;
  security.inputEvents += 1;
  if(isWorldMode()){
    if(answerInput.value.trim() && state.session.worldAnswerStartedMs === null){
      state.session.worldAnswerStartedMs = Math.round(getElapsedMs());
    }
    return;
  }
  const entry = getCurrentRouteEntry();
  if(entry){
    entry.inputEvents = (entry.inputEvents || 0) + 1;
    entry.maxInputLength = Math.max(entry.maxInputLength || 0, answerInput.value.length);
    if(entry.firstInputMs === null) entry.firstInputMs = Math.round(getElapsedMs());
  }
}

function recordPasteAttempt(){
  ensureSpeedRunStarted();
  if(!isActiveSpeedRun()) return;
  state.session.security.pasteEvents += 1;
  const entry = getCurrentRouteEntry();
  if(entry) entry.pasteEvents = (entry.pasteEvents || 0) + 1;
  recordSecurityEvent("paste");
}

function recordPointerActivity(){
  if(isActiveSpeedRun()) state.session.security.pointerEvents += 1;
}

function recordFocusLoss(){
  if(!isActiveSpeedRun()) return;
  state.session.security.focusLosses += 1;
  recordSecurityEvent("blur");
}

function recordVisibilityChange(){
  if(!isActiveSpeedRun() || document.visibilityState !== "hidden") return;
  state.session.security.hiddenEvents += 1;
  recordSecurityEvent("hidden");
}

function keepAnswerInputFocused(){
  if(!state.hard || !answerInput || !state.session || state.session.gameOver) return;
  window.setTimeout(()=>{
    if(state.hard && state.session && !state.session.gameOver && !answerInput.disabled){
      answerInput.focus({preventScroll:true});
    }
  }, 0);
}

function syncModeButtons(){
  if(state.playMode === "speedrun" || isWorldMode()) state.hard = true;
  document.body.dataset.playMode = state.playMode;
  document.body.dataset.quizMode = state.which;
  playModeButtons.forEach(button=>button.classList.toggle("active", button.dataset.playMode === state.playMode));
  quizButtons.forEach(button=>button.classList.toggle("active", button.dataset.mode === state.which));
  hardToggle.checked = state.hard;
  hardToggle.disabled = state.playMode === "speedrun" || isWorldMode();
  hardLabel.textContent = state.playMode === "speedrun" || isWorldMode() ? "Typing required" : "Hard mode";
  lifeSelect.value = state.lifeSetting;
  speedTargetSelect.value = state.speedTarget;
}

function populateContinents(){
  const continents = Array.from(new Set(Object.values(countryContinent))).sort();
  const options = state.playMode === "speedrun" || isWorldMode()
    ? ["All", ...continents]
    : state.which === "flags"
      ? ["All", ...continents, "Revise"]
      : ["All", ...continents, "Revise Capitals"];

  continentSelect.innerHTML = "";
  for(const value of options){
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    continentSelect.appendChild(option);
  }
  if(!options.includes(state.selectedContinent)) state.selectedContinent = "All";
  continentSelect.value = state.selectedContinent;
}

function populateSpeedTargets(){
  const max = getAvailableBasePool().length;
  const previous = state.speedTarget;
  const targets = isWorldMode()
    ? [{value:"all", label:`All available (${max})`}]
    : SPEEDRUN_SPLITS
      .filter(split=>split <= max)
      .map(split=>({value:String(split), label:`First ${split}`}));
  if(!targets.some(target=>target.value === "all")){
    targets.push({value:"all", label:`All available (${max})`});
  }

  speedTargetSelect.innerHTML = "";
  for(const target of targets){
    const option = document.createElement("option");
    option.value = target.value;
    option.textContent = target.label;
    speedTargetSelect.appendChild(option);
  }

  state.speedTarget = targets.some(target=>target.value === previous) ? previous : "all";
  speedTargetSelect.value = state.speedTarget;
}

function getAvailableBasePool(){
  if(state.selectedContinent === "All") return [...countries];
  return countries.filter(country=>countryIsInCurrentContinent(country, state.selectedContinent));
}

function resetSession(){
  stopSpeedRun();
  state.pendingSharedRun = null;
  state.lastCompletedRun = null;
  if(state.playMode === "speedrun"){
    state.hard = true;
    populateSpeedTargets();
  }
  syncModeButtons();
  state.session = makeSession();
  state.session.livesRemaining = getInitialLives();
  clearFeedback();
  toggleAnswerUi();
  updateAllStatus();
  loadQuestion();
  refreshSharedLeaderboard();
}

function getInitialLives(){
  if(state.playMode !== "practice" || state.lifeSetting === "unlimited") return null;
  return Number(state.lifeSetting);
}

function buildPool(){
  let pool;
  if(state.playMode === "practice" && state.selectedContinent === "Revise"){
    pool = [...state.reviseFlags];
  }else if(state.playMode === "practice" && state.selectedContinent === "Revise Capitals"){
    pool = [...state.reviseCapitals];
  }else if(state.selectedContinent === "All"){
    pool = [...countries];
  }else{
    pool = countries.filter(country=>countryIsInCurrentContinent(country, state.selectedContinent));
  }

  shuffle(pool);
  if(state.playMode === "speedrun" && state.speedTarget !== "all"){
    const target = Number(state.speedTarget);
    if(Number.isFinite(target) && target > 0){
      pool = pool.slice(0, Math.min(target, pool.length));
    }
  }
  return pool;
}

async function loadQuestion(){
  const session = state.session;
  if(session.gameOver) return;
  clearFeedback();
  toggleAnswerUi();

  if(session.pool.length === 0){
    session.pool = buildPool();
  }

  if(isWorldMode()){
    await loadWorldMapRound();
    return;
  }

  const candidates = getQuestionCandidates();
  if(candidates.length === 0){
    if(session.solved.size > 0 || session.totalFirstAttempts > 0){
      return finishSession("complete");
    }
    renderEmpty();
    updateAllStatus();
    return;
  }

  session.correctCountry = candidates[(Math.random()*candidates.length)|0];
  session.correctAnswer = state.which === "flags"
    ? session.correctCountry
    : countryCapitals[session.correctCountry] || "Unknown";
  session.questionAnswered = false;
  session.currentWrongAttempts = 0;
  session.history.push(session.correctCountry);
  recordRouteQuestion(session.correctCountry);
  answerInput.placeholder = "Type your answer...";

  await renderFlag(session.correctCountry);
  countryLabel.textContent = state.which === "capitals"
    ? `What is the capital of ${session.correctCountry}?`
    : "";

  updateReviseButton();
  updateAllStatus();

  if(state.hard){
    answerInput.value = "";
    answerInput.disabled = false;
    submitBtn.disabled = false;
    answerInput.focus();
  }else{
    setupMcq();
  }
  lastBtn.disabled = session.history.length <= 1 || state.playMode === "speedrun";
}

function getQuestionCandidates(){
  const session = state.session;
  let fresh = session.pool.filter(country=>!session.solved.has(country) && !session.skipped.has(country));
  if(fresh.length > 0) return fresh;

  if(session.skipped.size > 0){
    const retry = Array.from(session.skipped).filter(country=>!session.solved.has(country));
    session.skipped.clear();
    return retry;
  }
  return [];
}

async function renderFlag(country){
  questionVisual.innerHTML = "";
  const holder = document.createElement("div");
  holder.className = "flag-holder";
  questionVisual.appendChild(holder);
  const img = await createFlagImg(country, 430, `Flag of ${country}`);
  holder.replaceChildren(img);
}

async function loadWorldMapRound(){
  const session = state.session;
  if(!session.pool.length){
    renderEmpty();
    updateAllStatus();
    return;
  }

  session.correctCountry = null;
  session.correctAnswer = null;
  session.questionAnswered = false;
  session.currentWrongAttempts = 0;
  countryLabel.textContent = "";
  answerInput.placeholder = state.selectedContinent === "All"
    ? "Type any country..."
    : `Type any ${state.selectedContinent} country...`;
  mcqBtns.forEach(button=>{ button.textContent = ""; button.disabled = true; });

  await renderWorldMap();
  updateAllStatus();

  answerInput.value = "";
  answerInput.disabled = false;
  submitBtn.disabled = false;
  lastBtn.disabled = true;
  nextBtn.disabled = true;
  giveupBtn.disabled = false;
  answerInput.focus();
}

function renderEmpty(){
  questionVisual.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "flag-fallback";
  empty.textContent = "No items available.";
  questionVisual.appendChild(empty);
  countryLabel.textContent = "";
  mcqBtns.forEach(button=>{ button.textContent = ""; button.disabled = true; });
  answerInput.disabled = true;
  submitBtn.disabled = true;
}

function recordRouteQuestion(country){
  const session = state.session;
  if(state.playMode !== "speedrun" || isWorldMode() || !country) return;
  const entry = {
    index: session.route.length + 1,
    country,
    continent: countryContinent[country] || "Unknown",
    answer: getExpectedAnswerForMode(country),
    shownMs: Math.round(getElapsedMs()),
    firstInputMs: null,
    firstSubmitMs: null,
    solvedMs: null,
    attempts: 0,
    wrongAttempts: 0,
    inputEvents: 0,
    keyEvents: 0,
    typedChars: 0,
    maxInputLength: 0,
    pasteEvents: 0,
    skipped: false
  };
  session.route.push(entry);
  session.currentRouteIndex = session.route.length - 1;
}

function recordRouteAttempt(value, correct){
  const entry = getCurrentRouteEntry();
  if(state.playMode !== "speedrun" || !entry) return;
  const now = Math.round(getElapsedMs());
  entry.attempts += 1;
  if(entry.firstSubmitMs === null) entry.firstSubmitMs = now;
  if(entry.firstInputMs === null && value) entry.firstInputMs = now;
  entry.maxInputLength = Math.max(entry.maxInputLength || 0, value.length);
  if(!correct) entry.wrongAttempts += 1;
}

function markRouteSolved(){
  const entry = getCurrentRouteEntry();
  if(state.playMode !== "speedrun" || !entry || entry.solvedMs !== null) return;
  entry.solvedMs = Math.round(getElapsedMs());
}

function buildRouteSnapshot(route){
  return route.map(entry=>({
    index: entry.index,
    country: entry.country,
    continent: entry.continent,
    answer: entry.answer,
    shownMs: Math.round(entry.shownMs || 0),
    firstInputMs: entry.firstInputMs === null ? null : Math.round(entry.firstInputMs),
    firstSubmitMs: entry.firstSubmitMs === null ? null : Math.round(entry.firstSubmitMs),
    solvedMs: entry.solvedMs === null ? null : Math.round(entry.solvedMs),
    attempts: entry.attempts || 0,
    wrongAttempts: entry.wrongAttempts || 0,
    skipped: !!entry.skipped
  }));
}

function buildTelemetrySnapshot(session){
  const security = session.security || makeSecurityTelemetry();
  return {
    nonce: security.nonce,
    playerId: state.playerId,
    startedAt: security.startedAt,
    submittedAt: new Date().toISOString(),
    focusLosses: security.focusLosses || 0,
    hiddenEvents: security.hiddenEvents || 0,
    pasteEvents: security.pasteEvents || 0,
    keyEvents: security.keyEvents || 0,
    inputEvents: security.inputEvents || 0,
    pointerEvents: security.pointerEvents || 0,
    suspiciousEvents: (security.suspiciousEvents || []).slice(0, 20),
    webdriver: !!navigator.webdriver
  };
}

function evaluateRunIntegrity(elapsed, route, telemetry, total){
  const blockers = [];
  const warnings = [];
  const isWorldRun = isWorldMode();
  const solvedRoute = route.filter(entry=>entry.solvedMs !== null);
  const minExpectedMs = getMinimumExpectedRunMs(solvedRoute);
  const fastestQuestionMs = solvedRoute.reduce((fastest, entry)=>{
    const submitMs = entry.firstSubmitMs === null ? entry.solvedMs : entry.firstSubmitMs;
    const delta = Math.max(0, (submitMs || 0) - (entry.shownMs || 0));
    return fastest === null || delta < fastest ? delta : fastest;
  }, null);
  const noInputEntries = solvedRoute.filter(entry=>entry.attempts > 0 && entry.firstInputMs === null);
  const impossibleEntries = solvedRoute.filter(entry=>{
    const submitMs = entry.firstSubmitMs === null ? entry.solvedMs : entry.firstSubmitMs;
    return submitMs !== null && submitMs - entry.shownMs < MIN_SOLVED_QUESTION_MS;
  });

  if(route.length === 0) blockers.push("missing-route");
  if(solvedRoute.length !== total) blockers.push("route-total-mismatch");
  if(elapsed < minExpectedMs) blockers.push("run-too-fast-for-typed-answers");
  if(!isWorldRun && impossibleEntries.length) blockers.push("instant-answer-events");
  if(noInputEntries.length) blockers.push("answers-without-input-events");
  if(telemetry.pasteEvents > 0) blockers.push("paste-detected");
  if(telemetry.hiddenEvents > 0) blockers.push("tab-hidden-during-run");
  if(telemetry.webdriver) blockers.push("webdriver-browser-detected");
  if(telemetry.focusLosses > 0) warnings.push("window-focus-lost");
  if(telemetry.keyEvents < Math.max(1, Math.floor(total * 0.75))) warnings.push("low-key-event-count");

  const score = Math.max(0, 100 - blockers.length * 25 - warnings.length * 8);
  return {
    eligible: blockers.length === 0,
    score,
    blockers,
    warnings,
    minExpectedMs,
    fastestQuestionMs,
    routeHash: hashRunRoute(route),
    routeLength: route.length
  };
}

function getMinimumExpectedRunMs(route){
  return route.reduce((sum, entry)=>{
    const answerLength = normalise(entry.answer || "").replace(/\s+/g, "").length;
    return sum + 250 + answerLength * 25;
  }, 1000);
}

function hashRunRoute(route){
  let hash = 2166136261;
  const value = route.map(entry=>`${entry.index}:${entry.country}:${entry.solvedMs}`).join("|");
  for(let i=0;i<value.length;i++){
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function toggleAnswerUi(){
  const typedOnly = state.hard || isWorldMode();
  mcq.style.display = typedOnly ? "none" : "grid";
  textWrap.style.display = typedOnly ? "flex" : "none";
}

function setupMcq(){
  const session = state.session;
  if(!session.correctCountry || session.pool.length === 0) return;

  let options;
  let pool;
  if(state.which === "flags"){
    options = [session.correctCountry];
    pool = session.pool;
  }else{
    options = [session.correctAnswer];
    pool = session.pool.map(country=>countryCapitals[country]).filter(Boolean);
  }

  while(options.length < 4 && options.length < pool.length){
    const choice = pool[(Math.random()*pool.length)|0];
    if(!options.includes(choice)) options.push(choice);
  }
  shuffle(options);

  mcqBtns.forEach((button,index)=>{
    if(index < options.length){
      button.textContent = options[index];
      button.disabled = false;
      button.style.opacity = "1";
    }else{
      button.textContent = "";
      button.disabled = true;
      button.style.opacity = ".6";
    }
  });
}

function checkMcq(index){
  const session = state.session;
  if(session.gameOver || !session.correctCountry || mcqBtns[index].disabled) return;
  const selected = mcqBtns[index].textContent;
  const correct = getCorrectAnswer();
  const firstAttempt = registerAttempt();

  if(selected === correct){
    recordRouteAttempt(selected, true);
    mcqBtns.forEach(button=>button.disabled = true);
    handleCorrect(firstAttempt);
  }else{
    recordRouteAttempt(selected, false);
    handleIncorrect(firstAttempt);
  }
}

function checkAutoSubmitText(){
  const session = state.session;
  if(isWorldMode()){
    checkAutoSubmitWorldText();
    return;
  }
  if(session.gameOver || !session.correctCountry || !state.hard) return;
  if(session.solved.has(session.correctCountry)) return;
  const value = answerInput.value.trim();
  if(!value) return;
  const result = evaluateTextAnswer(value, false);
  if(result.exact || result.aliasOk) checkText({allowFuzzy:false});
}

function checkText(options={}){
  const session = state.session;
  if(isWorldMode()){
    checkWorldMapText(options);
    return;
  }
  if(session.gameOver || !session.correctCountry) return;
  if(session.solved.has(session.correctCountry)) return;
  const value = answerInput.value.trim();
  if(!value) return;

  const result = evaluateTextAnswer(value, options.allowFuzzy !== false);
  const accepted = result.exact || result.aliasOk || result.fuzzyOk;
  const firstAttempt = registerAttempt();
  recordRouteAttempt(value, accepted);

  if(accepted){
    submitBtn.disabled = true;
    answerInput.value = "";
    keepAnswerInputFocused();
    handleCorrect(firstAttempt, result.exact || result.aliasOk ? "Correct!" : "Correct! (Close enough)");
    return;
  }

  handleIncorrect(firstAttempt);
  answerInput.select();
}

function checkAutoSubmitWorldText(){
  const session = state.session;
  if(session.gameOver || !state.hard || !session.pool.length) return;
  const value = answerInput.value.trim();
  if(!value) return;
  const result = evaluateWorldCountryAnswer(value, false);
  if(result.country && result.inPool && !result.alreadySolved){
    checkWorldMapText({allowFuzzy:false});
  }
}

function checkWorldMapText(options={}){
  const session = state.session;
  if(session.gameOver || !session.pool.length) return;
  const value = answerInput.value.trim();
  if(!value) return;

  ensureSpeedRunStarted();
  const result = evaluateWorldCountryAnswer(value, options.allowFuzzy !== false);
  if(result.country && result.inPool && !result.alreadySolved){
    handleWorldCorrect(result.country, result.fuzzy ? "Correct! (Close enough)" : "Correct!");
    return;
  }

  if(result.country && result.alreadySolved){
    setFeedback(`${result.country} is already on the map.`, true);
    answerInput.value = "";
    state.session.worldAnswerStartedMs = null;
    keepAnswerInputFocused();
    return;
  }

  if(result.country && !result.inPool){
    setFeedback(`${result.country} is not in this round.`, false);
    answerInput.select();
    return;
  }

  handleWorldIncorrect();
  answerInput.select();
}

function evaluateWorldCountryAnswer(value, allowFuzzy=true){
  const normalised = normalise(value);
  const session = state.session;
  const exactCountry = getCountryAnswerIndex().get(normalised) || null;
  const country = exactCountry || (allowFuzzy ? getUniqueFuzzyWorldCountry(value) : null);
  const inPool = !!country && session.pool.includes(country);
  return {
    country,
    exact: !!exactCountry,
    fuzzy: !!country && !exactCountry,
    inPool,
    alreadySolved: !!country && session.solved.has(country)
  };
}

function getUniqueFuzzyWorldCountry(value){
  const candidates = state.session.pool
    .filter(country=>!state.session.solved.has(country))
    .filter(country=>fuzzyMatch(value, country));
  return candidates.length === 1 ? candidates[0] : null;
}

function getCountryAnswerIndex(){
  if(countryAnswerIndex) return countryAnswerIndex;
  countryAnswerIndex = new Map();
  for(const country of countries){
    addCountryAnswerIndexValue(countryAnswerIndex, country, country);
    for(const alias of countryAliases[country] || []){
      addCountryAnswerIndexValue(countryAnswerIndex, alias, country);
    }
    for(const alias of WORLD_COUNTRY_EXTRA_ALIASES[country] || []){
      addCountryAnswerIndexValue(countryAnswerIndex, alias, country);
    }
    const code = (alpha2Overrides[country] || "").toLowerCase();
    for(const alias of WORLD_COUNTRY_EXTRA_ALIAS_CODES[code] || []){
      addCountryAnswerIndexValue(countryAnswerIndex, alias, country);
    }
  }
  return countryAnswerIndex;
}

function addCountryAnswerIndexValue(index, value, country){
  const key = normalise(value);
  if(key && !index.has(key)) index.set(key, country);
}

function handleWorldCorrect(country, message="Correct!"){
  const session = state.session;
  registerWorldCorrect(country);
  setFeedback(`${message} ${country} filled in.`, true);
  showAnswerFlash(true);
  recordWorldRouteSolved(country);
  markWorldSolved(country);
  answerInput.value = "";
  session.worldAnswerStartedMs = null;
  keepAnswerInputFocused();
  updateHighScore();
  updateWorldAnswerStatus();
  scheduleWorldMapCountrySolved(country);

  window.setTimeout(()=>{
    if(isTargetComplete()){
      finishSession("complete");
    }
  }, ANSWER_FLASH_MS);
}

function registerWorldCorrect(country){
  const session = state.session;
  if(state.playMode === "speedrun") startSpeedRun();
  if(!session.answered.has(country)){
    session.totalFirstAttempts += 1;
    session.correctFirstTry += 1;
    session.answered.add(country);
  }
  session.streak += 1;
  session.questionAnswered = true;
}

function handleWorldIncorrect(){
  const session = state.session;
  if(state.playMode === "speedrun") startSpeedRun();
  session.currentWrongAttempts += 1;
  session.worldWrongSubmissions += 1;
  session.streak = 0;
  if(state.playMode === "practice"){
    session.totalFirstAttempts += 1;
  }
  setFeedback("No matching country in this round.", false);
  showAnswerFlash(false);

  if(state.playMode === "practice"){
    loseLife();
    if(session.gameOver){
      window.setTimeout(()=>finishSession("gameover"), ANSWER_FLASH_MS);
      return;
    }
  }
  updateWorldAnswerStatus();
}

function markWorldSolved(country){
  const session = state.session;
  if(!country || session.solved.has(country)) return;
  session.solved.add(country);
  session.skipped.delete(country);
  session.worldLastSolvedMs = Math.round(getElapsedMs());
  captureSpeedRunSplit();
}

function recordWorldRouteSolved(country){
  const session = state.session;
  if(state.playMode !== "speedrun" || !country) return;
  const now = Math.round(getElapsedMs());
  const shownMs = Math.max(0, Math.round(session.worldLastSolvedMs || 0));
  const firstInputMs = session.worldAnswerStartedMs === null
    ? now
    : Math.max(shownMs, Math.round(session.worldAnswerStartedMs));
  session.route.push({
    index: session.route.length + 1,
    country,
    continent: getCountryContinentForCurrentMode(country),
    answer: country,
    shownMs,
    firstInputMs,
    firstSubmitMs: now,
    solvedMs: now,
    attempts: 1,
    wrongAttempts: 0,
    inputEvents: 0,
    keyEvents: 0,
    typedChars: 0,
    maxInputLength: country.length,
    pasteEvents: 0,
    skipped: false
  });
  session.currentRouteIndex = session.route.length - 1;
}

function evaluateTextAnswer(value, allowFuzzy=true){
  const correct = getCorrectAnswer();
  const exact = normalise(value) === normalise(correct);
  const aliasOk = isAlias(value);
  return {
    exact,
    aliasOk,
    fuzzyOk: allowFuzzy && fuzzyMatch(value, correct)
  };
}

function getCorrectAnswer(){
  return state.which === "flags" ? state.session.correctCountry : state.session.correctAnswer;
}

function getCountryContinentForCurrentMode(country){
  if(isWorldMode()) return getWorldMapCountryContinent(country);
  return countryContinent[country] || "Unknown";
}

function getWorldMapCountryContinent(country){
  const continents = getWorldMapCountryContinents(country);
  if(state.selectedContinent !== "All" && continents.includes(state.selectedContinent)){
    return state.selectedContinent;
  }
  return continents[0] || "Unknown";
}

function getWorldMapCountryContinents(country){
  return WORLD_MAP_COUNTRY_CONTINENTS[country] || [countryContinent[country] || "Unknown"];
}

function countryIsInCurrentContinent(country, continent){
  if(continent === "All") return true;
  if(isWorldMode()){
    return getWorldMapCountryContinents(country).includes(continent);
  }
  return countryContinent[country] === continent;
}

function getExpectedAnswerForMode(country){
  if(state.which === "capitals") return countryCapitals[country] || "Unknown";
  return country;
}

function isAlias(value){
  const session = state.session;
  const normalised = normalise(value);
  if(state.which === "flags"){
    return !!(countryAliases[session.correctCountry] || []).some(alias=>normalise(alias)===normalised);
  }
  return !!(capitalAliases[session.correctAnswer] || []).some(alias=>normalise(alias)===normalised);
}

function registerAttempt(){
  const session = state.session;
  if(state.playMode === "speedrun") startSpeedRun();
  session.questionAnswered = true;
  const firstAttempt = !session.answered.has(session.correctCountry);
  if(firstAttempt){
    session.totalFirstAttempts += 1;
    session.answered.add(session.correctCountry);
  }
  updateAllStatus();
  return firstAttempt;
}

function handleCorrect(firstAttempt, message="Correct!"){
  const session = state.session;
  setFeedback(message, true);
  showAnswerFlash(true);

  if(firstAttempt){
    session.correctFirstTry += 1;
    session.streak += 1;
  }

  markSolved();
  updateHighScore();
  updateAllStatus();

  window.setTimeout(()=>{
    if(state.playMode === "speedrun" && isTargetComplete()){
      finishSession("complete");
    }else{
      loadQuestion();
    }
  }, ANSWER_FLASH_MS);
}

function handleIncorrect(firstAttempt){
  const session = state.session;
  session.currentWrongAttempts += 1;
  session.streak = 0;
  session.incorrect.add(session.correctCountry);
  setFeedback("Incorrect. Try again, or skip and come back later.", false);
  showAnswerFlash(false);

  if(state.playMode === "practice"){
    loseLife();
    if(session.gameOver){
      window.setTimeout(()=>finishSession("gameover"), ANSWER_FLASH_MS);
      return;
    }
  }

  updateAllStatus();
}

function markSolved(){
  const session = state.session;
  if(!session.correctCountry || session.solved.has(session.correctCountry)) return;
  session.solved.add(session.correctCountry);
  session.skipped.delete(session.correctCountry);
  markRouteSolved();
  captureSpeedRunSplit();
}

function loseLife(){
  const session = state.session;
  if(session.livesRemaining === null) return;
  session.livesRemaining = Math.max(0, session.livesRemaining - 1);
  session.gameOver = session.livesRemaining === 0;
}

function updateHighScore(){
  if(state.playMode !== "practice") return;
  const key = getPracticeKey();
  const high = state.highScores[key] || 0;
  if(state.session.streak > high){
    state.highScores[key] = state.session.streak;
    storage.set(LS_KEYS.highScores, state.highScores);
  }
}

function nextQuestion(){
  const session = state.session;
  if(isWorldMode()) return;
  if(session.gameOver || !session.correctCountry) return;
  if(!session.solved.has(session.correctCountry)){
    const entry = getCurrentRouteEntry();
    if(entry) entry.skipped = true;
    session.skipped.add(session.correctCountry);
    if(session.history.length && session.history[session.history.length-1] === session.correctCountry){
      session.history.pop();
    }
  }
  loadQuestion();
}

async function lastQuestion(){
  const session = state.session;
  if(isWorldMode()) return;
  if(state.playMode === "speedrun" || session.history.length < 2 || session.gameOver) return;

  session.history.pop();
  const previous = session.history.pop();
  session.correctCountry = previous;
  session.correctAnswer = state.which === "flags" ? previous : countryCapitals[previous] || "Unknown";
  session.questionAnswered = session.answered.has(previous);
  session.currentWrongAttempts = 0;
  session.history.push(previous);

  await renderFlag(previous);
  countryLabel.textContent = state.which === "capitals" ? `What is the capital of ${previous}?` : "";
  clearFeedback();
  updateReviseButton();
  updateAllStatus();

  if(state.hard){
    answerInput.value = "";
    answerInput.disabled = false;
    submitBtn.disabled = false;
    answerInput.focus();
  }else{
    setupMcq();
  }
}

function giveUp(){
  const session = state.session;
  if(!session.pool.length){
    renderEmpty();
    return;
  }
  if(state.playMode === "speedrun"){
    session.speedRun.gaveUp = true;
    stopSpeedRun();
  }
  for(const country of session.pool.filter(item=>!session.solved.has(item))){
    session.incorrect.add(country);
    if(!session.answered.has(country)){
      session.totalFirstAttempts += 1;
      session.answered.add(country);
    }
  }
  finishSession("giveup");
}

function toggleRevise(){
  const session = state.session;
  if(isWorldMode() || state.playMode !== "practice" || !session.correctCountry) return;
  const list = state.which === "flags" ? state.reviseFlags : state.reviseCapitals;
  const key = state.which === "flags" ? LS_KEYS.reviseFlags : LS_KEYS.reviseCapitals;
  const index = list.indexOf(session.correctCountry);
  if(index >= 0){
    list.splice(index, 1);
    setReviseFeedback(false);
  }else{
    list.push(session.correctCountry);
    setReviseFeedback(true);
  }
  storage.set(key, list);
  updateReviseButton();
  setTimeout(()=>{ reviseFeedback.textContent = ""; }, 3000);
}

function updateReviseButton(){
  const session = state.session;
  if(isWorldMode()){
    reviseToggle.textContent = "Add to Revise";
    return;
  }
  const list = state.which === "flags" ? state.reviseFlags : state.reviseCapitals;
  reviseToggle.textContent = session.correctCountry && list.includes(session.correctCountry)
    ? "Remove from Revise"
    : "Add to Revise";
}

function setReviseFeedback(added){
  const country = state.session.correctCountry || "";
  reviseFeedback.textContent = added
    ? `Added ${country} to Revise list.`
    : `Removed ${country} from Revise list.`;
}

function startSpeedRun(){
  const session = state.session;
  if(session.speedRun.started || !session.pool.length) return;
  session.speedRun.started = true;
  session.speedRun.startMs = Date.now();
  session.speedRun.elapsedMs = 0;
  session.security.startedAt = new Date().toISOString();
  if(session.speedRun.timerId) window.clearInterval(session.speedRun.timerId);
  session.speedRun.timerId = window.setInterval(updateTimerDisplay, TIMER_TICK_MS);
  updateTimerDisplay();
}

function stopSpeedRun(){
  const session = state.session;
  if(session.speedRun.started){
    session.speedRun.elapsedMs = getElapsedMs();
  }
  if(session.speedRun.timerId){
    window.clearInterval(session.speedRun.timerId);
    session.speedRun.timerId = null;
  }
}

function getElapsedMs(){
  const session = state.session;
  if(!session.speedRun.started) return session.speedRun.elapsedMs || 0;
  return Date.now() - session.speedRun.startMs;
}

function captureSpeedRunSplit(){
  if(state.playMode !== "speedrun" || !state.session.speedRun.started) return;
  const solved = state.session.solved.size;
  for(const split of getSpeedRunSplitTargets()){
    if(split !== "all" && solved === split && !state.session.speedRun.splits[String(split)]){
      state.session.speedRun.splits[String(split)] = getElapsedMs();
    }
  }
}

function isTargetComplete(){
  return state.session.pool.length > 0 && state.session.solved.size >= state.session.pool.length;
}

function recordSpeedRun(){
  const session = state.session;
  if(state.playMode !== "speedrun" || session.speedRun.recorded || session.speedRun.gaveUp || !isTargetComplete()) return null;
  stopSpeedRun();
  const elapsed = session.speedRun.elapsedMs || getElapsedMs();
  session.speedRun.splits.all = elapsed;
  session.speedRun.recorded = true;
  const route = buildRouteSnapshot(session.route);
  const telemetry = buildTelemetrySnapshot(session);
  const antiCheat = evaluateRunIntegrity(Math.round(elapsed), route, telemetry, session.pool.length);

  const key = getSpeedRunKey();
  const previousBest = getBestLocalRunTime(key);

  for(const [label, value] of Object.entries(session.speedRun.splits)){
    const record = state.speedRuns[key] || {bestSplits:{}, runs:[]};
    record.bestSplits = record.bestSplits || {};
    if(!record.bestSplits[label] || value < record.bestSplits[label]){
      record.bestSplits[label] = Math.round(value);
    }
    state.speedRuns[key] = record;
  }

  const run = {
    playerName: sanitizePlayerName(state.playerName),
    modeKey: key,
    which: state.which,
    continent: state.selectedContinent,
    difficulty: state.hard ? "hard" : "normal",
    targetValue: state.speedTarget,
    targetLabel: getSpeedTargetLabel(),
    timeMs: Math.round(elapsed),
    date: new Date().toISOString(),
    correct: session.correctFirstTry,
    total: session.pool.length,
    target: getSpeedTargetLabel(),
    splits: {...session.speedRun.splits},
    route,
    telemetry,
    antiCheat,
    isPersonalBest: previousBest === null || Math.round(elapsed) < previousBest,
    relatedPersonalBestRuns: []
  };
  run.relatedPersonalBestRuns = buildSplitPersonalBestRuns(run);

  saveLocalSpeedRun(run);
  run.relatedPersonalBestRuns.forEach(saveLocalSpeedRun);
  storage.set(LS_KEYS.speedRuns, state.speedRuns);
  return run;
}

function saveLocalSpeedRun(run){
  const record = state.speedRuns[run.modeKey] || {bestSplits:{}, runs:[]};
  record.bestSplits = record.bestSplits || {};
  record.runs = Array.isArray(record.runs) ? record.runs : [];
  record.bestSplits.all = !record.bestSplits.all || run.timeMs < record.bestSplits.all
    ? run.timeMs
    : record.bestSplits.all;
  record.runs.push(run);
  record.runs.sort((left,right)=>left.timeMs-right.timeMs);
  record.runs = record.runs.slice(0, MAX_LEADERBOARD_RUNS);
  state.speedRuns[run.modeKey] = record;
}

function getBestLocalRunTime(key){
  const record = state.speedRuns[key];
  const runs = record && Array.isArray(record.runs) ? record.runs : [];
  return runs.reduce((bestRun, run)=>{
    const time = Number(run.timeMs);
    if(!Number.isFinite(time)) return bestRun;
    return bestRun === null || time < bestRun ? time : bestRun;
  }, null);
}

function buildSplitPersonalBestRuns(sourceRun){
  if(!sourceRun || !sourceRun.splits) return [];
  return SPEEDRUN_SPLITS
    .filter(split=>String(split) !== sourceRun.targetValue)
    .filter(split=>sourceRun.splits[String(split)] && split < sourceRun.total)
    .map(split=>buildSplitRun(sourceRun, split))
    .filter(Boolean)
    .filter(run=>run.isPersonalBest);
}

function buildSplitRun(sourceRun, split){
  const timeMs = Math.round(Number(sourceRun.splits[String(split)]) || 0);
  if(!timeMs) return null;
  const route = getRouteForSolvedTarget(sourceRun.route, split);
  if(!route.length) return null;
  const key = `${sourceRun.which}_${sourceRun.continent}_${sourceRun.difficulty}_${split}`;
  const previousBest = getBestLocalRunTime(key);
  const telemetry = {
    ...sourceRun.telemetry,
    nonce: `${sourceRun.telemetry.nonce}-${split}`,
    submittedAt: new Date().toISOString(),
    derivedFrom: sourceRun.telemetry.nonce,
    splitTarget: split
  };
  const antiCheat = evaluateRunIntegrity(timeMs, route, telemetry, split);
  const correct = route
    .filter(entry=>entry.solvedMs !== null)
    .filter(entry=>(entry.wrongAttempts || 0) === 0)
    .length;
  return {
    playerName: sourceRun.playerName,
    modeKey: key,
    which: sourceRun.which,
    continent: sourceRun.continent,
    difficulty: sourceRun.difficulty,
    targetValue: String(split),
    targetLabel: `First ${split}`,
    timeMs,
    date: sourceRun.date,
    correct,
    total: split,
    target: `First ${split}`,
    splits: {
      [String(split)]: timeMs,
      all: timeMs
    },
    route,
    telemetry,
    antiCheat,
    isPersonalBest: previousBest === null || timeMs < previousBest,
    derivedFromTarget: sourceRun.targetValue
  };
}

function getRouteForSolvedTarget(route, target){
  const result = [];
  let solved = 0;
  for(const entry of route){
    const copy = {...entry, index: result.length + 1};
    result.push(copy);
    if(copy.solvedMs !== null){
      solved += 1;
      if(solved === target) break;
    }
  }
  return solved === target ? result : [];
}

function getPracticeKey(){
  return `${state.which}_${state.selectedContinent}_${state.hard ? "hard" : "normal"}_${state.lifeSetting}`;
}

function getSpeedRunKey(){
  return `${state.which}_${state.selectedContinent}_${state.hard ? "hard" : "normal"}_${state.speedTarget}`;
}

function getSpeedRunFilters(){
  return {
    modeKey: getSpeedRunKey(),
    which: state.which,
    continent: state.selectedContinent,
    difficulty: state.hard ? "hard" : "normal",
    target: state.speedTarget,
    targetLabel: getSpeedTargetLabel()
  };
}

function getSpeedTargetLabel(){
  return state.speedTarget === "all" ? "All" : `First ${state.speedTarget}`;
}

function getLeaderboardService(){
  return window.sharedLeaderboard || null;
}

function isSharedLeaderboardConfigured(){
  const service = getLeaderboardService();
  return !!(service && service.isConfigured && service.isConfigured());
}

function clearSharedLeaderboardMessageLater(message){
  window.setTimeout(()=>{
    if(state.sharedLeaderboardMessage === message){
      state.sharedLeaderboardMessage = "";
      renderLeaderboard();
    }
  }, 3500);
}

function getSharedLeaderboardErrorMessage(error){
  const message = error && error.message ? error.message : "";
  if(message.toLowerCase().includes("permission denied")){
    return "Shared leaderboard database grants are missing.";
  }
  return message || "Shared leaderboard unavailable.";
}

async function refreshSharedLeaderboard(){
  if(state.playMode !== "speedrun" || !isSharedLeaderboardConfigured()){
    state.sharedLeaderboardLoading = false;
    state.sharedLeaderboardLoadingKey = "";
    state.sharedLeaderboardError = "";
    state.sharedLeaderboardMessage = "";
    state.sharedLeaderboardLastLoadedKey = "";
    renderLeaderboard();
    return;
  }

  const key = getSpeedRunKey();
  if(state.sharedLeaderboardLoading && state.sharedLeaderboardLoadingKey === key) return;
  state.sharedLeaderboardLoading = true;
  state.sharedLeaderboardLoadingKey = key;
  state.sharedLeaderboardError = "";
  renderLeaderboard();

  try{
    const runs = await getLeaderboardService().fetchRuns(
      getSpeedRunFilters(),
      MAX_SHARED_LEADERBOARD_RUNS
    );
    if(getSpeedRunKey() === key){
      state.sharedLeaderboardRuns[key] = runs;
      state.sharedLeaderboardLastLoadedKey = key;
    }
  }catch(error){
    if(getSpeedRunKey() === key){
      state.sharedLeaderboardError = getSharedLeaderboardErrorMessage(error);
    }
  }finally{
    if(state.sharedLeaderboardLoadingKey === key){
      state.sharedLeaderboardLoading = false;
      state.sharedLeaderboardLoadingKey = "";
    }
    if(getSpeedRunKey() === key) renderLeaderboard();
  }
}

async function submitSharedSpeedRun(run){
  if(!run || !isSharedLeaderboardConfigured()) return false;
  state.sharedLeaderboardMessage = "Submitting shared run...";
  state.sharedLeaderboardError = "";
  renderLeaderboard();

  try{
    const result = await getLeaderboardService().submitRun({
      ...run,
      playerName: sanitizePlayerName(run.playerName),
      target: run.targetValue,
      targetLabel: run.targetLabel
    });
    const queued = result && result.status === "pending";
    state.sharedLeaderboardMessage = queued
      ? "Run submitted for admin review."
      : "Shared run posted.";
    clearSharedLeaderboardMessageLater(state.sharedLeaderboardMessage);
    await refreshSharedLeaderboard();
    return result || {ok:true, status:"approved"};
  }catch(error){
    state.sharedLeaderboardMessage = "";
    state.sharedLeaderboardError = getSharedLeaderboardErrorMessage(error);
    renderLeaderboard();
    return false;
  }
}

async function postPendingSharedRun(){
  if(!state.pendingSharedRun || !postLeaderboardBtn) return;
  savePlayerName();
  rememberPostedPlayerName(state.playerName);
  const pendingRuns = getPendingSharedRuns();
  if(!pendingRuns.length) return;
  postLeaderboardBtn.disabled = true;
  if(leaderboardPublishStatus){
    leaderboardPublishStatus.textContent = pendingRuns.length === 1
      ? "Posting run..."
      : `Posting ${pendingRuns.length} runs...`;
  }

  const results = [];
  for(const run of pendingRuns){
    const result = await submitSharedSpeedRun({
      ...run,
      playerName: state.playerName
    });
    if(!result){
      if(leaderboardPublishStatus){
        leaderboardPublishStatus.textContent = state.sharedLeaderboardError || "Could not post every run.";
      }
      postLeaderboardBtn.disabled = false;
      return;
    }
    results.push(result);
  }

  if(results.length){
    state.pendingSharedRun = null;
    const queued = results.some(result=>result.status === "pending");
    if(leaderboardPublishStatus){
      const postedText = results.length === 1 ? "run" : `${results.length} runs`;
      leaderboardPublishStatus.textContent = queued
        ? `Submitted ${postedText}; at least one needs admin review.`
        : `Posted ${postedText} to the shared leaderboard.`;
    }
    postLeaderboardBtn.textContent = queued ? "Submitted" : "Posted";
  }
}

function getPendingSharedRuns(){
  if(!state.pendingSharedRun) return [];
  return Array.isArray(state.pendingSharedRun) ? state.pendingSharedRun : [state.pendingSharedRun];
}

function getSpeedRunSplitTargets(){
  if(state.playMode !== "speedrun" || !state.session.pool.length) return [];
  const finish = state.session.pool.length;
  const targets = SPEEDRUN_SPLITS.filter(split=>split <= finish);
  if(!targets.includes(finish) && state.speedTarget !== "all") targets.push(finish);
  targets.push("all");
  return targets;
}

async function renderWorldMap(){
  if(!isWorldMode()) return;
  const token = ++worldMapState.renderToken;
  if(worldMapState.features){
    questionVisual.innerHTML = "";
    questionVisual.appendChild(createWorldMapShell(worldMapState.features));
    return;
  }
  questionVisual.innerHTML = "";
  questionVisual.appendChild(createWorldMapStatus("Loading country outlines..."));

  try{
    const features = await loadWorldMapFeatures();
    if(token !== worldMapState.renderToken || !isWorldMode()) return;
    questionVisual.innerHTML = "";
    questionVisual.appendChild(createWorldMapShell(features));
  }catch(error){
    if(token !== worldMapState.renderToken || !isWorldMode()) return;
    worldMapState.error = error && error.message ? error.message : "Country outline map could not load.";
    questionVisual.innerHTML = "";
    questionVisual.appendChild(createWorldMapStatus(worldMapState.error));
  }
}

function createWorldMapStatus(text){
  const status = document.createElement("div");
  status.className = "world-map-status";
  status.textContent = text;
  return status;
}

async function loadWorldMapFeatures(){
  if(worldMapState.features) return worldMapState.features;
  if(worldMapState.loadPromise) return worldMapState.loadPromise;

  worldMapState.loadPromise = (async ()=>{
    if(!window.topojson || !window.topojson.feature){
      throw new Error("Map libraries did not load. Check your connection and refresh.");
    }
    const response = await fetch(WORLD_MAP_TOPOJSON_URL);
    if(!response.ok) throw new Error(`Country outline map failed to load (${response.status}).`);
    const topology = await response.json();
    const collection = window.topojson.feature(topology, topology.objects.countries);
    worldMapState.features = collection.features
      .map(feature=>{
        const contextFeature = getWorldMapContextFeature(feature);
        return {
          ...feature,
          properties: {
            ...(feature.properties || {}),
            quizCountry: matchWorldMapCountry(feature),
            contextName: contextFeature ? contextFeature.name : null,
            contextContinent: contextFeature ? contextFeature.continent : null,
            contextOwnerCountry: contextFeature ? contextFeature.ownerCountry : null
          }
        };
      })
      .filter(feature=>!!feature.properties.quizCountry || !!feature.properties.contextName);
    addSyntheticWorldMapFeatures(worldMapState.features);
    return worldMapState.features;
  })();

  return worldMapState.loadPromise;
}

function matchWorldMapCountry(feature){
  const id = String(feature.id || "").padStart(3, "0");
  if(Object.prototype.hasOwnProperty.call(WORLD_MAP_ID_OVERRIDES, id)){
    const country = resolveWorldMapCountry(WORLD_MAP_ID_OVERRIDES[id]);
    if(country) return country;
  }
  const rawName = cleanWorldMapName(feature.properties && feature.properties.name);
  if(Object.prototype.hasOwnProperty.call(WORLD_MAP_NAME_OVERRIDES, rawName)){
    const country = resolveWorldMapCountry(WORLD_MAP_NAME_OVERRIDES[rawName]);
    if(country) return country;
  }
  return getCountryAnswerIndex().get(normalise(rawName)) || null;
}

function getWorldMapContextFeature(feature){
  const id = String(feature.id || "").padStart(3, "0");
  if(Object.prototype.hasOwnProperty.call(WORLD_MAP_CONTEXT_FEATURES, id)){
    return WORLD_MAP_CONTEXT_FEATURES[id];
  }
  const rawName = cleanWorldMapName(feature.properties && feature.properties.name);
  return WORLD_MAP_CONTEXT_NAME_OVERRIDES[rawName] || null;
}

function addSyntheticWorldMapFeatures(features){
  const present = new Set(features.map(feature=>feature.properties.quizCountry));
  if(!present.has("Tuvalu")){
    features.push(makeSyntheticWorldMapCountry("Tuvalu", 179.2, -8.52, 0.42, 0.28));
  }
}

function makeSyntheticWorldMapCountry(country, lon, lat, width, height){
  const left = lon - width / 2;
  const right = lon + width / 2;
  const bottom = lat - height / 2;
  const top = lat + height / 2;
  return {
    type:"Feature",
    id:`synthetic-${country}`,
    properties:{
      name:country,
      quizCountry:country,
      synthetic:true
    },
    geometry:{
      type:"Polygon",
      coordinates:[[
        [left, bottom],
        [right, bottom],
        [right, top],
        [left, top],
        [left, bottom]
      ]]
    }
  };
}

function cleanWorldMapName(value){
  return String(value || "").replace(/\s+/g, " ").trim();
}

function resolveWorldMapCountry(candidate){
  if(!candidate) return null;
  if(countries.includes(candidate)) return candidate;
  return getCountryAnswerIndex().get(normalise(candidate)) || null;
}

function createWorldMapShell(features){
  const shell = document.createElement("div");
  shell.className = "world-map-shell";
  worldMapState.defs = null;
  worldMapState.progress = null;
  worldMapState.pathElementsByCountry = new Map();
  worldMapState.markerElementsByCountry = new Map();
  worldMapState.pendingSolvedCountries = new Set();
  worldMapState.pendingFlagFillCountries = new Set();
  if(worldMapState.updateFrameId){
    cancelAnimationFrame(worldMapState.updateFrameId);
    worldMapState.updateFrameId = 0;
  }
  if(worldMapState.flagFillTimerId){
    cancelWorldMapFlagFillDrain();
    worldMapState.flagFillTimerId = 0;
  }

  const svg = svgNode("svg", {
    viewBox: `0 0 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT}`,
    role: "img",
    "aria-label": "World map of countries"
  });
  const defs = svgNode("defs");
  worldMapState.defs = defs;
  addSolvedFlagPatterns(defs);
  svg.appendChild(defs);

  const background = svgNode("rect", {
    class:"world-map-ocean",
    x:0,
    y:0,
    width:WORLD_MAP_WIDTH,
    height:WORLD_MAP_HEIGHT,
    rx:18
  });
  svg.appendChild(background);

  const panels = getWorldMapPanels();
  const renderFeatures = getWorldMapRenderFeatures(features);
  for(const panel of panels){
    drawWorldMapPanel(svg, renderFeatures, panel);
  }

  shell.appendChild(svg);
  const progress = createWorldMapProgress();
  worldMapState.progress = progress;
  shell.appendChild(progress);
  return shell;
}

function getWorldMapPanels(){
  if(state.selectedContinent === "All") return WORLD_MAP_PANELS;
  const bounds = WORLD_MAP_CONTINENT_BOUNDS[state.selectedContinent] || WORLD_MAP_MAIN_BOUNDS;
  return [{
    id:`continent-${normalise(state.selectedContinent).replace(/\s+/g, "-") || "selected"}`,
    label:state.selectedContinent,
    x:0,
    y:0,
    width:WORLD_MAP_WIDTH,
    height:WORLD_MAP_HEIGHT,
    bounds,
    full:true
  }];
}

function getWorldMapRenderFeatures(features){
  if(state.selectedContinent === "All") return features;
  const pool = new Set(state.session.pool || []);
  return features.filter(feature=>
    pool.has(feature.properties.quizCountry)
    || feature.properties.contextContinent === state.selectedContinent
  );
}

function addSolvedFlagPatterns(defs){
  for(const country of Array.from(state.session.solved)){
    ensureWorldMapFlagPattern(country, defs);
  }
}

function drawWorldMapPanel(svg, features, panel){
  const panelGroup = svgNode("g", {
    class:`world-map-panel world-map-panel-${panel.id}`,
    transform:`translate(${panel.x} ${panel.y})`
  });
  const clipId = `world-map-clip-${panel.id}`;

  const panelDefs = svgNode("defs");
  const clip = svgNode("clipPath", {
    id:clipId
  });
  clip.appendChild(svgNode("rect", {
    x:0,
    y:0,
    width:panel.width,
    height:panel.height,
    rx:panel.id === "main" || panel.full ? 18 : 12
  }));
  panelDefs.appendChild(clip);
  panelGroup.appendChild(panelDefs);

  panelGroup.appendChild(svgNode("rect", {
    class:"world-map-panel-bg",
    x:0,
    y:0,
    width:panel.width,
    height:panel.height,
    rx:panel.id === "main" || panel.full ? 18 : 12
  }));

  const mapLayer = svgNode("g", {
    class:"world-map-layer",
    "clip-path":`url(#${clipId})`
  });
  panelGroup.appendChild(mapLayer);

  const panelFeatures = getWorldMapPanelFeatures(features, panel);

  for(const feature of panelFeatures){
    const country = feature.properties.quizCountry;
    const contextOwner = resolveWorldMapCountry(feature.properties.contextOwnerCountry);
    const pathDataList = makeWorldMapPathList(feature, panel);
    if(!pathDataList.length) continue;

    for(const pathData of pathDataList){
      const ownerIsSolved = !!contextOwner && state.session.solved.has(contextOwner);
      const classCountry = country || (ownerIsSolved ? contextOwner : null);
      const countryPath = svgNode("path", {
        class:getWorldMapCountryClass(classCountry),
        d:pathData
      });
      if(country){
        countryPath.dataset.country = country;
        countryPath.dataset.panel = panel.id;
        if(state.session.solved.has(country) && alpha2Overrides[country]){
          countryPath.style.fill = `url(#${getWorldMapPatternId(country)})`;
        }
        rememberWorldMapCountryPath(country, countryPath);
      }else if(contextOwner){
        countryPath.dataset.contextCountry = feature.properties.contextName || "";
        countryPath.dataset.ownerCountry = contextOwner;
        countryPath.dataset.panel = panel.id;
        if(ownerIsSolved && alpha2Overrides[contextOwner]){
          countryPath.style.fill = `url(#${getWorldMapPatternId(contextOwner)})`;
        }
        rememberWorldMapCountryPath(contextOwner, countryPath);
      }
      mapLayer.appendChild(countryPath);
    }
  }

  drawWorldMapSmallCountryMarkers(panelGroup, panelFeatures, panel);

  const label = svgNode("text", {
    class:"world-map-panel-label",
    x:panel.id === "main" ? 18 : 10,
    y:panel.id === "main" ? 28 : 19
  });
  label.textContent = panel.label;
  panelGroup.appendChild(label);

  svg.appendChild(panelGroup);
}

function getWorldMapPanelFeatures(features, panel){
  if(panel.id === "main") return features;
  return features.filter(feature=>featureHasPointsInWorldBounds(feature, getWorldMapPanelView(panel).bounds));
}

function featureHasPointsInWorldBounds(feature, bounds){
  if(!bounds) return true;
  const [left, bottom, right, top] = bounds;
  return iterateWorldMapPoints(feature, point=>{
    const lon = normaliseWorldMapLonForBounds(Number(point[0]), bounds);
    const lat = Number(point[1]);
    return Number.isFinite(lon)
      && Number.isFinite(lat)
      && lon >= left
      && lon <= right
      && lat >= bottom
      && lat <= top;
  });
}

function makeWorldMapPathList(feature, panel){
  const geometry = feature.geometry || {};
  const polygons = geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [];
  const country = feature.properties.quizCountry;
  return polygons
    .map(polygon=>makeWorldMapPolygonPath(polygon, panel, country))
    .filter(Boolean);
}

function makeWorldMapPolygonPath(polygon, panel, country){
  if(!Array.isArray(polygon)) return "";
  const parts = [];
  for(const ring of polygon){
    const segment = makeWorldMapRingPath(ring, panel, country);
    if(segment) parts.push(segment);
  }
  return parts.join("");
}

function makeWorldMapRingPath(ring, panel, country){
  if(!Array.isArray(ring) || ring.length < 3) return "";
  const segments = [];
  let segment = [];
  let previousLon = null;
  let ringWasSplit = false;
  const view = getWorldMapPanelView(panel);

  for(const point of ring){
    const rawLon = Number(point[0]);
    const lat = Number(point[1]);
    const lon = unwrapWorldMapRingLon(rawLon, previousLon, view.bounds, country);
    const projected = projectWorldMapLonLat(lon, lat, panel, view);
    const longProjectedJump = segment.length
      ? isWorldMapLongProjectedJump(segment[segment.length - 1], projected, panel)
      : false;
    if(!projected){
      if(segment.length >= 3) segments.push(segment);
      segment = [];
      ringWasSplit = true;
    }else if(longProjectedJump){
      if(segment.length >= 3) segments.push(segment);
      segment = [projected];
      ringWasSplit = true;
    }else{
      segment.push(projected);
    }
    if(Number.isFinite(lon)) previousLon = lon;
  }

  if(segment.length >= 3) segments.push(segment);
  return segments.map(points=>{
    const [first, ...rest] = points;
    const closePath = ringWasSplit ? "" : "Z";
    return `M${formatWorldMapNumber(first[0])},${formatWorldMapNumber(first[1])}${rest.map(point=>`L${formatWorldMapNumber(point[0])},${formatWorldMapNumber(point[1])}`).join("")}${closePath}`;
  }).join("");
}

function projectWorldMapPoint(point, panel){
  if(!Array.isArray(point) || point.length < 2) return null;
  const view = getWorldMapPanelView(panel);
  const lon = normaliseWorldMapLonForBounds(Number(point[0]), view.bounds);
  const lat = Number(point[1]);
  return projectWorldMapLonLat(lon, lat, panel, view);
}

function projectWorldMapLonLat(lon, lat, panel, view=getWorldMapPanelView(panel)){
  const [left, bottom, right, top] = view.bounds;
  if(!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const x = view.margin + ((lon - left) * view.lonScale / view.effectiveLonSpan) * view.innerWidth;
  const y = view.margin + ((top - lat) / view.latSpan) * view.innerHeight;
  return [x, y];
}

function unwrapWorldMapRingLon(rawLon, previousLon, bounds, country){
  let lon = normaliseWorldMapLonForBounds(rawLon, bounds);
  if(country === "Russia" && bounds && bounds[0] <= -180 && bounds[2] >= 180 && lon < -150){
    lon += 360;
  }
  if(previousLon === null || !Number.isFinite(previousLon) || !Number.isFinite(lon)) return lon;
  while(lon - previousLon > 180) lon -= 360;
  while(previousLon - lon > 180) lon += 360;
  return lon;
}

function normaliseWorldMapLonForBounds(lon, bounds){
  if(!Number.isFinite(lon) || !bounds) return lon;
  const [left,, right] = bounds;
  if(right > 180 && lon < left){
    return lon + 360;
  }
  if(left < -180 && lon > right){
    return lon - 360;
  }
  return lon;
}

function isWorldMapLongProjectedJump(previous, current, panel){
  if(!previous || !current) return false;
  const dx = Math.abs(current[0] - previous[0]);
  const dy = Math.abs(current[1] - previous[1]);
  return dx > panel.width * 1.05 || dy > panel.height * 1.05;
}

function getWorldMapPanelView(panel){
  const margin = panel.id === "main" ? 18 : 7;
  const innerWidth = panel.width - margin * 2;
  const innerHeight = panel.height - margin * 2;
  if(panel.id === "main"){
    const [left, bottom, right, top] = WORLD_MAP_MAIN_BOUNDS;
    return {
      bounds: WORLD_MAP_MAIN_BOUNDS,
      margin,
      innerWidth,
      innerHeight,
      lonScale: 1,
      effectiveLonSpan: right - left,
      latSpan: top - bottom
    };
  }

  let [left, bottom, right, top] = panel.bounds;
  const centreLon = (left + right) / 2;
  const centreLat = (bottom + top) / 2;
  const lonScale = Math.max(.35, Math.cos(Math.abs(centreLat) * Math.PI / 180));
  let lonSpan = right - left;
  let latSpan = top - bottom;
  const targetAspect = innerWidth / innerHeight;
  const geoAspect = (lonSpan * lonScale) / latSpan;

  if(geoAspect > targetAspect){
    latSpan = (lonSpan * lonScale) / targetAspect;
    bottom = centreLat - latSpan / 2;
    top = centreLat + latSpan / 2;
  }else{
    lonSpan = (latSpan * targetAspect) / lonScale;
    left = centreLon - lonSpan / 2;
    right = centreLon + lonSpan / 2;
  }

  return {
    bounds: [left, bottom, right, top],
    margin,
    innerWidth,
    innerHeight,
    lonScale,
    effectiveLonSpan: lonSpan * lonScale,
    latSpan
  };
}

function drawWorldMapSmallCountryMarkers(panelGroup, panelFeatures, panel){
  const markerLayer = svgNode("g", {
    class:"world-map-marker-layer",
    "clip-path":`url(#world-map-clip-${panel.id})`
  });
  let markerCount = 0;
  for(const feature of panelFeatures){
    const country = feature.properties.quizCountry;
    if(!country) continue;
    const bounds = getWorldMapProjectedBounds(feature, panel);
    if(!bounds || !shouldDrawWorldMapSmallCountryMarker(country, panel, bounds)) continue;
    const marker = createWorldMapSmallCountryMarker(country, panel, bounds);
    rememberWorldMapCountryMarker(country, marker);
    markerLayer.appendChild(marker);
    markerCount += 1;
  }
  if(markerCount > 0){
    panelGroup.appendChild(markerLayer);
  }
}

function getWorldMapProjectedBounds(feature, panel){
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let count = 0;
  iterateWorldMapPoints(feature, point=>{
    const projected = projectWorldMapPoint(point, panel);
    if(!projected) return false;
    const [x, y] = projected;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    count += 1;
    return false;
  });
  if(count === 0) return null;
  return {
    x:(minX + maxX) / 2,
    y:(minY + maxY) / 2,
    width:maxX - minX,
    height:maxY - minY
  };
}

function shouldDrawWorldMapSmallCountryMarker(country, panel, bounds){
  if(!state.session.pool.includes(country)) return false;
  if(WORLD_MAP_SMALL_MARKER_COUNTRIES.has(country)) return true;
  if(panel.id === "main") return bounds.width < 3.8 || bounds.height < 3.8;
  return bounds.width < 8 || bounds.height < 8;
}

function createWorldMapSmallCountryMarker(country, panel, bounds){
  const marker = svgNode("g", {
    class:getWorldMapMarkerClass(country)
  });
  marker.dataset.country = country;
  marker.dataset.panel = panel.id;
  const radius = panel.id === "main" ? 4.6 : 5.4;
  marker.appendChild(svgNode("circle", {
    class:"world-map-marker-halo",
    cx:formatWorldMapNumber(bounds.x),
    cy:formatWorldMapNumber(bounds.y),
    r:formatWorldMapNumber(radius + 2.3)
  }));
  marker.appendChild(svgNode("circle", {
    class:"world-map-marker-ring",
    cx:formatWorldMapNumber(bounds.x),
    cy:formatWorldMapNumber(bounds.y),
    r:formatWorldMapNumber(radius)
  }));
  return marker;
}

function iterateWorldMapPoints(feature, callback){
  const geometry = feature.geometry || {};
  const polygons = geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [];
  for(const polygon of polygons){
    for(const ring of polygon){
      for(const point of ring){
        if(callback(point)) return true;
      }
    }
  }
  return false;
}

function formatWorldMapNumber(value){
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function rememberWorldMapCountryPath(country, path){
  const paths = worldMapState.pathElementsByCountry.get(country) || [];
  paths.push(path);
  worldMapState.pathElementsByCountry.set(country, paths);
}

function rememberWorldMapCountryMarker(country, marker){
  const markers = worldMapState.markerElementsByCountry.get(country) || [];
  markers.push(marker);
  worldMapState.markerElementsByCountry.set(country, markers);
}

function updateWorldMapCountrySolved(country){
  if(!isWorldMode() || !country) return;
  const paths = worldMapState.pathElementsByCountry.get(country) || [];
  for(const path of paths){
    path.className.baseVal = getWorldMapCountryClass(country);
    path.style.fill = getWorldMapSolvedBaseFill(country);
    pulseWorldMapCountryPath(path);
  }
  const markers = worldMapState.markerElementsByCountry.get(country) || [];
  for(const marker of markers){
    marker.className.baseVal = getWorldMapMarkerClass(country);
  }
  scheduleWorldMapFlagFill(country);
}

function scheduleWorldMapCountrySolved(country){
  if(!isWorldMode() || !country) return;
  worldMapState.pendingSolvedCountries.add(country);
  if(worldMapState.updateFrameId) return;
  worldMapState.updateFrameId = requestAnimationFrame(()=>{
    worldMapState.updateFrameId = 0;
    const pending = Array.from(worldMapState.pendingSolvedCountries);
    worldMapState.pendingSolvedCountries.clear();
    for(const item of pending){
      updateWorldMapCountrySolved(item);
    }
  });
}

function ensureWorldMapFlagPattern(country, defs=worldMapState.defs){
  const code = (alpha2Overrides[country] || "").toLowerCase();
  if(!code || !defs) return false;
  const id = getWorldMapPatternId(country);
  if(document.getElementById(id)) return true;
  const pattern = svgNode("pattern", {
    id,
    x:0,
    y:0,
    width:1,
    height:1,
    patternUnits:"objectBoundingBox",
    patternContentUnits:"objectBoundingBox"
  });
  const image = svgNode("image", {
    x:0,
    y:0,
    width:1,
    height:1,
    preserveAspectRatio:"none",
    href:flagCdnUrl(code, 160)
  });
  image.setAttributeNS("http://www.w3.org/1999/xlink", "href", flagCdnUrl(code, 160));
  pattern.appendChild(image);
  defs.appendChild(pattern);
  return true;
}

function scheduleWorldMapFlagFill(country){
  if(!alpha2Overrides[country]) return;
  worldMapState.pendingFlagFillCountries.add(country);
  if(worldMapState.flagFillTimerId) return;
  scheduleWorldMapFlagFillDrain();
}

function scheduleWorldMapFlagFillDrain(){
  if(worldMapState.flagFillTimerId) return;
  if(window.requestIdleCallback){
    worldMapState.flagFillTimerId = window.requestIdleCallback(deadline=>{
      worldMapState.flagFillTimerId = 0;
      applyPendingWorldMapFlagFills(deadline);
    }, {timeout:WORLD_MAP_FLAG_FILL_IDLE_TIMEOUT_MS});
  }else{
    worldMapState.flagFillTimerId = window.setTimeout(()=>{
      worldMapState.flagFillTimerId = 0;
      applyPendingWorldMapFlagFills(null);
    }, WORLD_MAP_FLAG_FILL_FALLBACK_MS);
  }
}

function cancelWorldMapFlagFillDrain(){
  if(!worldMapState.flagFillTimerId) return;
  if(window.cancelIdleCallback){
    window.cancelIdleCallback(worldMapState.flagFillTimerId);
  }
  window.clearTimeout(worldMapState.flagFillTimerId);
}

function applyPendingWorldMapFlagFills(deadline){
  if(!isWorldMode()) return;
  let processed = 0;
  const maxPerDrain = state.playMode === "speedrun" ? 1 : 3;
  while(worldMapState.pendingFlagFillCountries.size){
    if(processed >= maxPerDrain) break;
    if(processed > 0 && deadline && deadline.timeRemaining && deadline.timeRemaining() < 3) break;
    if(processed > 0 && !deadline) break;
    const country = worldMapState.pendingFlagFillCountries.values().next().value;
    worldMapState.pendingFlagFillCountries.delete(country);
    ensureWorldMapFlagPattern(country);
    const fill = `url(#${getWorldMapPatternId(country)})`;
    const paths = worldMapState.pathElementsByCountry.get(country) || [];
    for(const path of paths){
      path.style.fill = fill;
    }
    processed += 1;
  }
  if(worldMapState.pendingFlagFillCountries.size){
    scheduleWorldMapFlagFillDrain();
  }
}

function getWorldMapSolvedBaseFill(country){
  const continent = getWorldMapCountryContinent(country);
  if(continent === "Africa") return "#f0bd62";
  if(continent === "Asia") return "#d95f3f";
  if(continent === "Europe") return "#6fa8dc";
  if(continent === "North America") return "#7fbf7b";
  if(continent === "South America") return "#8e7cc3";
  if(continent === "Oceania") return "#5db7aa";
  return "#f0bd62";
}

function pulseWorldMapCountryPath(path){
  if(!path || !path.classList) return;
  path.classList.remove("is-just-solved");
  requestAnimationFrame(()=>{
    path.classList.add("is-just-solved");
    window.setTimeout(()=>path.classList.remove("is-just-solved"), 520);
  });
}

function updateWorldMapProgress(){
  if(!worldMapState.progress) return;
  const summary = getWorldMapRemainingSummary();
  const total = document.createElement("div");
  total.className = "world-map-progress-total";
  total.textContent = `${summary.remaining}/${summary.total} left`;

  const grid = document.createElement("div");
  grid.className = "world-map-progress-grid";
  for(const row of summary.continents){
    const item = document.createElement("div");
    item.className = `world-map-progress-item ${row.remaining === 0 ? "is-empty" : ""}`;
    const label = document.createElement("span");
    label.textContent = row.label;
    const count = document.createElement("strong");
    count.textContent = String(row.remaining);
    item.append(label, count);
    grid.appendChild(item);
  }

  worldMapState.progress.replaceChildren(total, grid);
}

function getWorldMapRemainingSummary(){
  const pool = state.session.pool || [];
  const totals = new Map();
  const remaining = new Map();
  for(const continent of WORLD_MAP_CONTINENT_ORDER){
    totals.set(continent, 0);
    remaining.set(continent, 0);
  }
  for(const country of pool){
    const continent = getCountryContinentForCurrentMode(country);
    totals.set(continent, (totals.get(continent) || 0) + 1);
    if(!state.session.solved.has(country)){
      remaining.set(continent, (remaining.get(continent) || 0) + 1);
    }
  }
  const continentNames = Array.from(totals.keys())
    .filter(continent=>totals.get(continent) > 0)
    .sort((a, b)=>{
      const left = WORLD_MAP_CONTINENT_ORDER.indexOf(a);
      const right = WORLD_MAP_CONTINENT_ORDER.indexOf(b);
      if(left === -1 && right === -1) return a.localeCompare(b);
      if(left === -1) return 1;
      if(right === -1) return -1;
      return left - right;
    });
  return {
    total: pool.length,
    remaining: Math.max(0, pool.length - state.session.solved.size),
    continents: continentNames.map(continent=>({
      name: continent,
      label: WORLD_MAP_CONTINENT_SHORT_LABELS[continent] || continent,
      total: totals.get(continent) || 0,
      remaining: remaining.get(continent) || 0
    }))
  };
}

function getWorldMapCountryClass(country){
  const classes = ["world-map-country"];
  if(!country){
    classes.push("is-context");
  }else if(!state.session.pool.includes(country)){
    classes.push("is-muted");
  }else if(state.session.solved.has(country)){
    classes.push("is-solved");
  }else{
    classes.push("is-active");
  }
  return classes.join(" ");
}

function getWorldMapMarkerClass(country){
  const classes = ["world-map-small-marker"];
  if(!country || !state.session.pool.includes(country)){
    classes.push("is-muted");
  }else if(state.session.solved.has(country)){
    classes.push("is-solved");
  }else{
    classes.push("is-active");
  }
  return classes.join(" ");
}

function getWorldMapPatternId(country){
  const index = countries.indexOf(country);
  return `world-flag-fill-${index >= 0 ? index : normalise(country).replace(/\s+/g, "-")}`;
}

function createWorldMapProgress(){
  const progress = document.createElement("div");
  progress.className = "world-map-progress";
  progress.setAttribute("aria-live", "polite");
  progress.textContent = "";
  return progress;
}

function svgNode(name, attributes={}){
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for(const [key, value] of Object.entries(attributes)){
    node.setAttribute(key, String(value));
  }
  return node;
}

function updateAllStatus(){
  updateScoreTexts();
  updateSessionText();
  updateLivesDisplay();
  updateTimerDisplay();
  updateWorldMapProgress();
  renderSplits();
  renderLeaderboard();
}

function updateWorldAnswerStatus(){
  updateScoreTexts();
  updateSessionText();
  updateLivesDisplay();
  updateTimerDisplay();
  updateWorldMapProgress();
  if(state.playMode === "speedrun" && isWorldSplitBoundary()){
    renderSplits();
  }
}

function isWorldSplitBoundary(){
  const solved = state.session.solved.size;
  return SPEEDRUN_SPLITS.includes(solved) || isTargetComplete();
}

function updateScoreTexts(){
  const session = state.session;
  if(state.playMode === "speedrun"){
    score.textContent = `Solved: ${session.solved.size}/${session.pool.length || "-"}`;
    best.textContent = `Target: ${getSpeedTargetLabel()}`;
  }else{
    const high = state.highScores[getPracticeKey()] || 0;
    score.textContent = `Streak: ${session.streak} | High: ${high}`;
    const bestPct = state.sessionPercentages[getPracticeKey()] || 0;
    best.textContent = `Best Session: ${bestPct}%`;
  }
}

function updateSessionText(){
  const session = state.session;
  if(!session.pool.length){
    sessionText.textContent = "";
    return;
  }
  const skipped = session.skipped.size ? ` | Skipped: ${session.skipped.size}` : "";
  sessionText.textContent = `Remaining: ${session.pool.length - session.solved.size}${skipped}`;
}

function updateLivesDisplay(){
  const session = state.session;
  if(state.playMode !== "practice"){
    livesValue.textContent = "Speedrun";
    livesStatus.textContent = "Lives are disabled in speedrun mode.";
    return;
  }
  if(session.livesRemaining === null){
    livesValue.textContent = "Unlimited";
    livesStatus.textContent = "Wrong answers do not end the run.";
    return;
  }
  livesValue.textContent = String(session.livesRemaining);
  livesStatus.textContent = session.livesRemaining === 1 ? "Last life." : "Wrong answers cost one life.";
}

function updateTimerDisplay(){
  if(state.playMode !== "speedrun"){
    timerValue.textContent = "0:00.0";
    timerStatus.textContent = "Switch to Speedrun to start the clock.";
    return;
  }
  const session = state.session;
  timerValue.textContent = formatTime(getElapsedMs());
  if(!session.pool.length){
    timerStatus.textContent = "Choose a target with available questions.";
  }else if(session.speedRun.gaveUp){
    timerStatus.textContent = "Run stopped.";
  }else if(isTargetComplete()){
    timerStatus.textContent = "Run complete.";
  }else if(session.speedRun.started){
    timerStatus.textContent = `Running - ${session.solved.size}/${session.pool.length} solved.`;
  }else{
    timerStatus.textContent = "Starts when you begin typing.";
  }
}

function renderSplits(){
  splitList.innerHTML = "";
  if(state.playMode !== "speedrun"){
    splitList.appendChild(emptyMini("Switch to Speedrun for timed splits."));
    return;
  }

  const targets = getSpeedRunSplitTargets();
  if(!targets.length){
    splitList.appendChild(emptyMini("No splits available for this target."));
    return;
  }

  const record = state.speedRuns[getSpeedRunKey()] || {bestSplits:{}};
  for(const target of targets){
    const label = String(target);
    const row = document.createElement("div");
    row.className = "split-row";

    const name = document.createElement("span");
    name.textContent = target === "all" ? "Finish" : `First ${target}`;

    const current = document.createElement("span");
    const liveAll = target === "all" && state.session.speedRun.started ? getElapsedMs() : null;
    const currentValue = state.session.speedRun.splits[label] || liveAll;
    current.textContent = currentValue ? formatTime(currentValue) : "-";

    const bestValue = record.bestSplits && record.bestSplits[label];
    const best = document.createElement("span");
    best.textContent = bestValue ? `PB ${formatTime(bestValue)}` : "PB -";

    row.append(name, current, best);
    splitList.appendChild(row);
  }
}

function renderLeaderboard(){
  leaderboardList.innerHTML = "";
  const modeLabel = getModeLabel();
  const difficulty = state.hard ? "Hard" : "Normal";
  leaderboardTitle.textContent = `${modeLabel} - ${state.selectedContinent} - ${difficulty} - ${getSpeedTargetLabel()}`;
  const shared = isSharedLeaderboardConfigured();
  if(leaderboardScopeLabel){
    leaderboardScopeLabel.textContent = shared ? "Shared Leaderboard" : "Local Leaderboard";
  }

  if(state.playMode !== "speedrun"){
    leaderboardList.appendChild(emptyMini("Speedrun leaderboards are shown in Speedrun mode."));
    return;
  }

  const key = getSpeedRunKey();
  const localRecord = state.speedRuns[key];
  const localRuns = localRecord && Array.isArray(localRecord.runs) ? localRecord.runs : [];

  if(shared && state.sharedLeaderboardLoading && state.sharedLeaderboardLoadingKey === key){
    leaderboardList.appendChild(emptyMini("Loading shared leaderboard..."));
  }

  if(state.sharedLeaderboardMessage){
    leaderboardList.appendChild(emptyMini(state.sharedLeaderboardMessage));
  }

  if(shared && state.sharedLeaderboardError){
    leaderboardList.appendChild(emptyMini(`${state.sharedLeaderboardError} Showing local records.`));
  }

  const sharedRuns = state.sharedLeaderboardRuns[key] || [];
  const runs = shared && !state.sharedLeaderboardError ? sharedRuns : localRuns;
  const initialSharedLoad = shared
    && state.sharedLeaderboardLoading
    && state.sharedLeaderboardLoadingKey === key
    && state.sharedLeaderboardLastLoadedKey !== key;

  if(initialSharedLoad && !runs.length){
    return;
  }

  if(!runs.length){
    const emptyText = shared && !state.sharedLeaderboardError
      ? "No shared runs yet for this exact setup."
      : "No completed runs yet for this exact setup.";
    leaderboardList.appendChild(emptyMini(emptyText));
    return;
  }

  runs.forEach((run,index)=>{
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    const rank = document.createElement("strong");
    rank.textContent = `#${index+1}`;
    const time = document.createElement("span");
    time.textContent = formatTime(run.timeMs);
    const meta = document.createElement("span");
    const date = run.date ? new Date(run.date).toLocaleDateString() : "";
    const player = run.playerName ? `${run.playerName} - ` : "";
    meta.textContent = `${player}${run.correct}/${run.total} first-try${date ? ` - ${date}` : ""}`;
    row.append(rank, time, meta);
    leaderboardList.appendChild(row);
  });
}

function emptyMini(text){
  const empty = document.createElement("p");
  empty.className = "empty-mini";
  empty.textContent = text;
  return empty;
}

function finishSession(reason){
  const session = state.session;
  if(state.playMode === "speedrun" && reason === "complete"){
    const run = recordSpeedRun();
    state.lastCompletedRun = run;
    state.pendingSharedRun = buildPendingSharedRuns(run);
  }else{
    stopSpeedRun();
    state.pendingSharedRun = null;
    state.lastCompletedRun = null;
  }

  if(state.playMode === "practice" && reason === "complete"){
    recordPracticePercentage();
  }

  session.gameOver = true;
  disableInputs();
  updateAllStatus();
  showResultModal(reason);
}

function buildPendingSharedRuns(run){
  if(!run) return null;
  const candidates = [
    run,
    ...(Array.isArray(run.relatedPersonalBestRuns) ? run.relatedPersonalBestRuns : [])
  ];
  const pending = candidates.filter(item=>item.isPersonalBest && item.antiCheat && item.antiCheat.eligible);
  return pending.length ? pending : null;
}

function recordPracticePercentage(){
  const session = state.session;
  if(!session.totalFirstAttempts) return;
  const pct = Math.round((session.correctFirstTry / session.totalFirstAttempts) * 1000) / 10;
  const key = getPracticeKey();
  if(pct > (state.sessionPercentages[key] || 0)){
    state.sessionPercentages[key] = pct;
    storage.set(LS_KEYS.sessionPercentages, state.sessionPercentages);
  }
}

function disableInputs(){
  mcqBtns.forEach(button=>button.disabled = true);
  answerInput.disabled = true;
  submitBtn.disabled = true;
  nextBtn.disabled = true;
  lastBtn.disabled = true;
  giveupBtn.disabled = true;
}

function enableNav(){
  nextBtn.disabled = false;
  giveupBtn.disabled = false;
}

function showResultModal(reason){
  const session = state.session;
  const isSpeed = state.playMode === "speedrun";
  const pct = session.totalFirstAttempts
    ? Math.round((session.correctFirstTry / session.totalFirstAttempts) * 1000) / 10
    : 0;

  resultKicker.textContent = isSpeed ? "Speedrun" : "Practice";
  resultTitle.textContent = getResultTitle(reason);

  const finalTime = isSpeed && session.speedRun.started
    ? formatTime(session.speedRun.elapsedMs || getElapsedMs())
    : null;
  renderResultHero({
    time: finalTime,
    solved: `${session.solved.size}/${session.pool.length}`,
    accuracy: `${pct}%`,
    lives: !isSpeed && session.livesRemaining !== null ? String(session.livesRemaining) : null
  });
  resultSummary.textContent = isWorldMode()
    ? `Countries found: ${session.solved.size}/${session.pool.length}. Wrong guesses: ${session.worldWrongSubmissions}.`
    : `First-try accuracy: ${session.correctFirstTry}/${session.totalFirstAttempts || 0}.`;

  resultDetails.innerHTML = "";
  const details = [
    `Mode: ${getModeLabel()} / ${state.hard ? "Typed" : "Normal"}`,
    `Continent: ${state.selectedContinent}`,
    isSpeed ? `Target: ${getSpeedTargetLabel()}` : `Lives: ${state.lifeSetting === "unlimited" ? "Unlimited" : state.lifeSetting}`,
    `Skipped unresolved: ${session.skipped.size}`,
    `Wrong at least once: ${session.incorrect.size}`
  ];

  for(const detail of details){
    const item = document.createElement("p");
    item.textContent = detail;
    resultDetails.appendChild(item);
  }

  if(session.incorrect.size){
    const wrong = document.createElement("p");
    wrong.textContent = `Review: ${Array.from(session.incorrect).sort().join(", ")}`;
    resultDetails.appendChild(wrong);
  }

  renderLeaderboardPublishPrompt(reason);
  resultModal.classList.add("is-visible");
  resultModal.setAttribute("aria-hidden", "false");
  if(leaderboardPublish && !leaderboardPublish.hidden && resultPlayerNameInput && !resultPlayerNameInput.hidden){
    resultPlayerNameInput.focus();
  }else{
    resultRetry.focus();
  }
}

function renderLeaderboardPublishPrompt(reason){
  if(!leaderboardPublish) return;
  leaderboardPublish.hidden = true;
  if(postLeaderboardBtn){
    postLeaderboardBtn.disabled = false;
    postLeaderboardBtn.textContent = "Post to leaderboard";
  }
  if(leaderboardPublishStatus) leaderboardPublishStatus.textContent = "";
  if(leaderboardPublishRow) leaderboardPublishRow.hidden = false;

  if(reason !== "complete" || state.playMode !== "speedrun") return;

  if(state.lastCompletedRun && state.lastCompletedRun.isPersonalBest && !state.pendingSharedRun){
    leaderboardPublish.hidden = false;
    if(leaderboardPublishTitle){
      const blockers = state.lastCompletedRun.antiCheat && state.lastCompletedRun.antiCheat.blockers
        ? state.lastCompletedRun.antiCheat.blockers.join(", ")
        : "run validation failed";
      leaderboardPublishTitle.textContent = `New personal best saved locally. Shared posting blocked: ${blockers}.`;
    }
    if(leaderboardPublishRow) leaderboardPublishRow.hidden = true;
    return;
  }

  const pendingRuns = getPendingSharedRuns();
  if(!pendingRuns.length) return;

  if(!isSharedLeaderboardConfigured()){
    leaderboardPublish.hidden = false;
    if(leaderboardPublishTitle){
      leaderboardPublishTitle.textContent = "New personal best saved locally. Shared leaderboard is not configured.";
    }
    if(leaderboardPublishRow) leaderboardPublishRow.hidden = true;
    return;
  }

  leaderboardPublish.hidden = false;
  if(leaderboardPublishTitle){
    const count = pendingRuns.length;
    leaderboardPublishTitle.textContent = count === 1
      ? "New personal best. Post this run to the shared leaderboard?"
      : `${count} new personal bests from this route. Post them to the shared leaderboard?`;
  }
  if(resultPlayerNameInput){
    resultPlayerNameInput.value = state.playerName;
  }
}

function renderResultHero(items){
  resultHero.innerHTML = "";
  const entries = [];
  if(items.time) entries.push(["Time", items.time]);
  entries.push(["Solved", items.solved]);
  entries.push(["Accuracy", items.accuracy]);
  if(items.lives !== null) entries.push(["Lives left", items.lives]);

  for(const [label, value] of entries){
    const card = document.createElement("div");
    card.className = "result-hero-card";
    const valueEl = document.createElement("strong");
    valueEl.textContent = value;
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    card.append(valueEl, labelEl);
    resultHero.appendChild(card);
  }
}

function getResultTitle(reason){
  if(reason === "gameover") return "Game over";
  if(reason === "giveup") return "Run ended";
  if(state.playMode === "speedrun") return "Speedrun complete";
  return "Practice complete";
}

function closeResultModal(){
  resultModal.classList.remove("is-visible");
  resultModal.setAttribute("aria-hidden", "true");
  if(leaderboardPublish) leaderboardPublish.hidden = true;
}

function setFeedback(text, ok){
  feedback.textContent = text;
  feedback.classList.remove("ok","err");
  feedback.classList.add(ok ? "ok" : "err");
}

function clearFeedback(){
  feedback.textContent = "";
  feedback.classList.remove("ok","err");
  reviseFeedback.textContent = "";
  enableNav();
}

function showAnswerFlash(ok){
  if(isWorldMode()){
    showWorldAnswerFlash(ok);
    return;
  }
  answerFlash.textContent = ok ? "CORRECT" : "INCORRECT";
  answerFlash.className = `answer-flash ${ok ? "is-correct" : "is-incorrect"} is-visible`;
  answerFlash.setAttribute("aria-hidden", "false");
  setTimeout(()=>{
    answerFlash.classList.remove("is-visible");
    answerFlash.setAttribute("aria-hidden", "true");
  }, ANSWER_FLASH_MS);
}

function showWorldAnswerFlash(ok){
  if(ok){
    answerFlash.classList.remove("is-visible");
    answerFlash.setAttribute("aria-hidden", "true");
    return;
  }
  answerFlash.textContent = ok ? "Correct" : "Miss";
  answerFlash.className = `answer-flash is-world-flash ${ok ? "is-correct" : "is-incorrect"} is-visible`;
  answerFlash.setAttribute("aria-hidden", "false");
  window.setTimeout(()=>{
    answerFlash.classList.remove("is-visible");
    answerFlash.setAttribute("aria-hidden", "true");
  }, 70);
}

function formatTime(ms){
  const value = Math.max(0, Math.round(ms || 0));
  const minutes = Math.floor(value / 60000);
  const seconds = Math.floor((value % 60000) / 1000);
  const tenths = Math.floor((value % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2,"0")}.${tenths}`;
}

function isRevisionMode(){
  return state.selectedContinent === "Revise" || state.selectedContinent === "Revise Capitals";
}

function isWorldMode(){
  return state.which === "world";
}

function getModeLabel(which=state.which){
  if(which === "capitals") return "Capitals";
  if(which === "world") return "Countries";
  return "Flags";
}

document.addEventListener("DOMContentLoaded", init);
