const ANSWER_FLASH_MS = 100;
const TIMER_TICK_MS = 100;
const SPEEDRUN_OATH_SESSION_KEY = "flag_game_speedrun_oath_acknowledged";
const SPEEDRUN_SPLITS = [10, 25, 50, 100, 150];
const MAX_LEADERBOARD_RUNS = 5;
const MAX_SHARED_LEADERBOARD_RUNS = 5;
const LEADERBOARD_REFRESH_MS = 30000;
const MAX_ANALYTICS_QUEUE_RUNS = 50;
const MAX_ANALYTICS_QUEUE_BYTES = 3500000;
const ANALYTICS_SCHEMA_VERSION = 2;
const NEAR_INSTANT_RECOGNITION_MS = 100;
const IMPOSSIBLE_ACTIVE_WPM = 260;
const FLAG_RENDER_SIZE = 430;
const SPEEDRUN_FLAG_PRELOAD_AHEAD = 12;
const SPEEDRUN_FLAG_PRELOAD_CONCURRENCY = 6;
const MOBILE_GAME_MEDIA_QUERY = "(max-width:640px)";
const MOBILE_KEYBOARD_MIN_SHRINK_PX = 100;

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
const regionAnswerIndexByGroup = new Map();

const state = {
  playMode: "practice",
  gameScope: "countries",
  which: "flags",
  hard: false,
  selectedContinent: "All",
  selectedRegionGroup: DEFAULT_REGION_GAME_GROUP,
  lifeSetting: "unlimited",
  speedTarget: "all",
  playerName: storage.get(LS_KEYS.playerName, "Player"),
  playerId: storage.get(LS_KEYS.playerId, ""),
  playerNameHistory: storage.get(LS_KEYS.playerNameHistory, []),
  deviceProfile: storage.get(LS_KEYS.speedRunDeviceProfile, {}),
  deviceAnalyticsHistory: storage.get(LS_KEYS.speedRunDeviceAnalyticsHistory, []),
  keyboardLayout: {available:false, reason:"not-checked"},

  reviseFlags: storage.get(LS_KEYS.reviseFlags, []),
  reviseCapitals: storage.get(LS_KEYS.reviseCapitals, []),
  reviseRegionFlags: storage.get(LS_KEYS.reviseRegionFlags, {}),
  reviseRegionCapitals: storage.get(LS_KEYS.reviseRegionCapitals, {}),
  highScores: storage.get(LS_KEYS.highScores, {}),
  sessionPercentages: storage.get(LS_KEYS.sessionPercentages, {}),
  speedRuns: storage.get(LS_KEYS.speedRuns, {}),
  speedRunAnalyticsQueue: storage.get(LS_KEYS.speedRunAnalyticsQueue, []),
  analyticsSyncing: false,
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
    pendingAdvance: false,
    history: [],
    route: [],
    currentRouteIndex: -1,
    flagPreloadQueue: [],
    flagPreloadActiveKeys: new Set(),
    flagPreloadDoneKeys: new Set(),
    security: makeSecurityTelemetry(),
    analytics: makeRunAnalyticsState(),
    worldAnswerStartedMs: null,
    worldAnswerStartedPerf: null,
    worldMapVisiblePerf: null,
    worldLastSolvedMs: 0,
    worldLastSolvedPerf: null,
    worldPendingAttempts: [],
    worldWrongSubmissions: 0,
    speedRun: {
      started: false,
      startMs: 0,
      startPerf: 0,
      elapsedMs: 0,
      timerId: null,
      typedChars: 0,
      splits: {},
      gaveUp: false,
      recorded: false,
      startingPromise: null,
      secureStartPromise: null,
      secureChallenge: "",
      secureError: ""
    }
  };
}

function makeSecurityTelemetry(){
  return {
    nonce: makeNonce(),
    startedAt: new Date().toISOString(),
    completedAt: "",
    focusLosses: 0,
    focusLostMs: 0,
    focusLostStartedPerf: null,
    hiddenEvents: 0,
    hiddenMs: 0,
    hiddenStartedPerf: null,
    pasteEvents: 0,
    keyEvents: 0,
    inputEvents: 0,
    pointerEvents: 0,
    suspiciousEvents: []
  };
}

function makeRunAnalyticsState(){
  return {
    version: ANALYTICS_SCHEMA_VERSION,
    runId: makeNonce(),
    createdAt: new Date().toISOString(),
    startedAt: "",
    completedAt: "",
    startedPerf: null,
    completedPerf: null,
    countrySetVersion: getCountrySetVersion(),
    questionOrder: [],
    questionOrderId: "",
    dataQualityFlags: []
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
const scopeButtons = Array.from(document.querySelectorAll(".scope-segment"));
const quizButtons = Array.from(document.querySelectorAll(".quiz-segment"));
const continentSelect = document.getElementById("continent-select");
const continentLabel = document.getElementById("continent-label");
const regionSetInput = document.getElementById("region-set-input");
const regionSetOptions = document.getElementById("region-set-options");
const hardToggle = document.getElementById("hard-toggle");
const hardLabel = document.getElementById("hard-label");
const lifeSelect = document.getElementById("life-select");
const speedTargetSelect = document.getElementById("speed-target-select");
const reviseToggle = document.getElementById("revise-toggle");

const livesValue = document.getElementById("lives-value");
const livesStatus = document.getElementById("lives-status");
const timerValue = document.getElementById("timer-value");
const timerStatus = document.getElementById("timer-status");
const wpmValue = document.getElementById("wpm-value");
const wpmStatus = document.getElementById("wpm-status");
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
const speedrunOathModal = document.getElementById("speedrun-oath-modal");
const speedrunOathAck = document.getElementById("speedrun-oath-ack");
const speedrunOathAgree = document.getElementById("speedrun-oath-agree");
const speedrunOathCancel = document.getElementById("speedrun-oath-cancel");
const resultDialogController = QuizUI.createModal(resultModal, closeResultModal);
const oathDialogController = QuizUI.createModal(speedrunOathModal, closeSpeedrunOath);
let speedrunOathAcknowledgedInMemory = false;

function init(){
  setupMobileGameViewport();

  playModeButtons.forEach(button=>{
    button.addEventListener("click", ()=>{
      if(state.playMode === button.dataset.playMode){
        retryVisibleQuestionLoad();
        return;
      }
      requestPlayMode(button.dataset.playMode);
    });
  });

  scopeButtons.forEach(button=>{
    button.addEventListener("click", ()=>{
      if(state.gameScope === button.dataset.gameScope){
        retryVisibleQuestionLoad();
        return;
      }
      state.gameScope = button.dataset.gameScope;
      state.selectedContinent = "All";
      if(isWorldMode()){
        state.hard = true;
        state.speedTarget = "all";
      }
      syncModeButtons();
      populateRegionSets();
      populateContinents();
      populateSpeedTargets();
      resetSession();
    });
  });

  quizButtons.forEach(button=>{
    button.addEventListener("click", ()=>{
      const requestedMode = button.dataset.mode;
      if(!isRegionModeAvailable(requestedMode)){
        syncModeButtons();
        setFeedback(getUnavailableRegionFlagsMessage(), false);
        return;
      }
      if(state.which === requestedMode){
        retryVisibleQuestionLoad();
        return;
      }
      state.which = requestedMode;
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
  regionSetInput.addEventListener("change", ()=>{
    applyRegionSetInput();
  });
  regionSetInput.addEventListener("keydown", event=>{
    if(event.key === "Enter"){
      event.preventDefault();
      applyRegionSetInput();
    }
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
  state.deviceProfile = getOrCreateDeviceProfile();
  rememberDeviceName(state.playerName, "local");
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
  window.addEventListener("focus", recordFocusReturn);
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
  speedrunOathAck.addEventListener("change", ()=>{
    speedrunOathAgree.disabled = !speedrunOathAck.checked;
  });
  speedrunOathAgree.addEventListener("click", acknowledgeSpeedrunOath);
  speedrunOathCancel.addEventListener("click", closeSpeedrunOath);

  populateRegionSets();
  syncModeButtons();
  populateContinents();
  populateSpeedTargets();
  resetSession();
  captureKeyboardLayout().then(layout=>{ state.keyboardLayout = layout; });
  window.setTimeout(drainSpeedRunAnalyticsQueue, 0);
  window.setInterval(()=>{
    if(state.playMode === "speedrun") refreshSharedLeaderboard();
  }, LEADERBOARD_REFRESH_MS);
}

function requestPlayMode(playMode){
  if(playMode === "speedrun" && !hasAcknowledgedSpeedrunOath()){
    openSpeedrunOath();
    return;
  }
  applyPlayMode(playMode);
}

function applyPlayMode(playMode){
  state.playMode = playMode;
  if(state.playMode === "speedrun" && isRevisionMode()) state.selectedContinent = "All";
  if(state.playMode === "speedrun"){
    state.hard = true;
    state.speedTarget = "all";
  }
  syncModeButtons();
  populateContinents();
  populateSpeedTargets();
  resetSession();
}

function hasAcknowledgedSpeedrunOath(){
  if(speedrunOathAcknowledgedInMemory) return true;
  try{
    return sessionStorage.getItem(SPEEDRUN_OATH_SESSION_KEY) === "yes";
  }catch{
    return false;
  }
}

function openSpeedrunOath(){
  if(!speedrunOathModal) return;
  speedrunOathAck.checked = false;
  speedrunOathAgree.disabled = true;
  oathDialogController.open(speedrunOathAck);
}

function closeSpeedrunOath(){
  oathDialogController.close();
}

function acknowledgeSpeedrunOath(){
  if(!speedrunOathAck.checked) return;
  speedrunOathAcknowledgedInMemory = true;
  try{
    sessionStorage.setItem(SPEEDRUN_OATH_SESSION_KEY, "yes");
  }catch{
    // The in-memory acknowledgement still applies for this page if storage is unavailable.
  }
  closeSpeedrunOath();
  applyPlayMode("speedrun");
}

function setupMobileGameViewport(){
  const viewport = window.visualViewport;
  let expandedViewportHeight = viewport ? viewport.height : window.innerHeight;

  const updateMobileLayout = ()=>{
    const height = viewport ? viewport.height : window.innerHeight;
    const width = viewport ? viewport.width : window.innerWidth;
    const pageTop = viewport ? viewport.pageTop : window.scrollY;
    const pageLeft = viewport ? viewport.pageLeft : window.scrollX;
    if(!Number.isFinite(height) || height <= 0) return;

    document.documentElement.style.setProperty("--game-viewport-height", `${Math.round(height)}px`);
    document.documentElement.style.setProperty("--game-viewport-width", `${Math.round(width)}px`);
    document.documentElement.style.setProperty("--game-viewport-page-top", `${Math.round(pageTop)}px`);
    document.documentElement.style.setProperty("--game-viewport-page-left", `${Math.round(pageLeft)}px`);

    const isMobile = window.matchMedia(MOBILE_GAME_MEDIA_QUERY).matches;
    const inputFocused = document.activeElement === answerInput;
    const layoutActive = document.body.classList.contains("mobile-answer-active");
    if(!isMobile){
      document.body.classList.remove("mobile-answer-active");
      expandedViewportHeight = height;
      return;
    }

    const minimumShrink = Math.max(MOBILE_KEYBOARD_MIN_SHRINK_PX, expandedViewportHeight * .16);
    const keyboardOpen = (inputFocused || layoutActive) && expandedViewportHeight - height >= minimumShrink;
    document.body.classList.toggle("mobile-answer-active", keyboardOpen);
    if(!keyboardOpen && !inputFocused) expandedViewportHeight = height;
  };

  answerInput.addEventListener("focus", updateMobileLayout);
  answerInput.addEventListener("blur", ()=>window.setTimeout(updateMobileLayout, 100));

  updateMobileLayout();
  window.addEventListener("resize", updateMobileLayout, {passive:true});
  window.addEventListener("orientationchange", updateMobileLayout, {passive:true});
  if(viewport){
    viewport.addEventListener("resize", updateMobileLayout, {passive:true});
    viewport.addEventListener("scroll", updateMobileLayout, {passive:true});
  }
}

function retryVisibleQuestionLoad(){
  const retryButton = questionVisual && questionVisual.querySelector("[data-load-retry]");
  if(!retryButton) return false;
  retryButton.click();
  return true;
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

function getOrCreateDeviceProfile(){
  const existing = state.deviceProfile && typeof state.deviceProfile === "object" ? state.deviceProfile : {};
  const profile = {
    playerId: state.playerId,
    deviceNumber: getDeviceNumber(state.playerId),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    knownNames: Array.isArray(existing.knownNames) ? existing.knownNames : [],
    leaderboardNames: Array.isArray(existing.leaderboardNames) ? existing.leaderboardNames : [],
    submittedLeaderboardNames: Array.isArray(existing.submittedLeaderboardNames) ? existing.submittedLeaderboardNames : []
  };
  state.deviceProfile = profile;
  saveDeviceProfile();
  return profile;
}

function getDeviceNumber(playerId=state.playerId){
  if(window.SpeedrunAnalytics && window.SpeedrunAnalytics.stableDeviceNumber){
    return window.SpeedrunAnalytics.stableDeviceNumber(playerId);
  }
  return `D-${hashStringValue(playerId).toUpperCase()}`;
}

function saveDeviceProfile(){
  if(!state.deviceProfile || typeof state.deviceProfile !== "object") return;
  state.deviceProfile.updatedAt = new Date().toISOString();
  storage.set(LS_KEYS.speedRunDeviceProfile, state.deviceProfile);
}

function rememberDeviceName(name, source="local"){
  const sanitized = sanitizePlayerName(name);
  if(!sanitized) return;
  const profile = state.deviceProfile && typeof state.deviceProfile === "object"
    ? state.deviceProfile
    : getOrCreateDeviceProfile();
  profile.playerId = state.playerId;
  profile.deviceNumber = getDeviceNumber();
  profile.knownNames = addUniqueLimited(profile.knownNames, sanitized, 12);
  if(source === "leaderboard"){
    profile.leaderboardNames = addUniqueLimited(profile.leaderboardNames, sanitized, 12);
    profile.submittedLeaderboardNames = addUniqueLimited(profile.submittedLeaderboardNames, sanitized, 20);
  }
  saveDeviceProfile();
}

function addUniqueLimited(list, value, limit){
  const output = [value, ...(Array.isArray(list) ? list : []).filter(item=>item !== value)];
  return output.slice(0, limit);
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
  rememberDeviceName(state.playerName, "local");
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
  rememberDeviceName(sanitized, "leaderboard");
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
  if(isTypedCharacterKey(event) || event.key === "Backspace" || event.key === "Delete"){
    ensureSpeedRunStarted();
  }
  if(!isActiveSpeedRun()) return;
  const security = state.session.security;
  security.keyEvents += 1;
  const entry = isWorldMode() ? null : getCurrentRouteEntry();
  markQuestionFirstKey(entry);
  if(isTypedCharacterKey(event)){
    state.session.speedRun.typedChars += 1;
    updateWpmDisplay();
  }
  if(entry){
    entry.keyEvents = (entry.keyEvents || 0) + 1;
    if(isTypedCharacterKey(event)){
      entry.typedChars = (entry.typedChars || 0) + 1;
    }else if(event.key === "Backspace" || event.key === "Delete"){
      entry.backspaces = (entry.backspaces || 0) + 1;
      entry.deletedChars = (entry.deletedChars || 0) + (answerInput.selectionStart === answerInput.selectionEnd ? 1 : Math.abs((answerInput.selectionEnd || 0) - (answerInput.selectionStart || 0)));
    }
  }
}

function isTypedCharacterKey(event){
  return !!event
    && !!event.key
    && event.key.length === 1
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey;
}

function recordAnswerInput(){
  ensureSpeedRunStarted();
  if(!isActiveSpeedRun()) return;
  const security = state.session.security;
  security.inputEvents += 1;
  if(isWorldMode()){
    if(answerInput.value.trim() && state.session.worldAnswerStartedMs === null){
      state.session.worldAnswerStartedMs = Math.round(getElapsedMs());
      state.session.worldAnswerStartedPerf = performance.now();
    }
    return;
  }
  const entry = isWorldMode() ? null : getCurrentRouteEntry();
  if(entry){
    entry.inputEvents = (entry.inputEvents || 0) + 1;
    entry.maxInputLength = Math.max(entry.maxInputLength || 0, answerInput.value.length);
    markQuestionFirstInput(entry);
  }
}

function recordPasteAttempt(){
  ensureSpeedRunStarted();
  if(!isActiveSpeedRun()) return;
  state.session.security.pasteEvents += 1;
  const entry = isWorldMode() ? null : getCurrentRouteEntry();
  if(entry){
    entry.pasteEvents = (entry.pasteEvents || 0) + 1;
    entry.pasteDetected = true;
    addQuestionQualityFlag(entry, "paste-detected");
  }
  recordSecurityEvent("paste");
}

function recordPointerActivity(){
  if(isActiveSpeedRun()) state.session.security.pointerEvents += 1;
}

function recordFocusLoss(){
  if(!isActiveSpeedRun()) return;
  const security = state.session.security;
  security.focusLosses += 1;
  security.focusLostStartedPerf = performance.now();
  const entry = isWorldMode() ? null : getCurrentRouteEntry();
  if(entry) entry.focusLostStartedPerf = security.focusLostStartedPerf;
  recordSecurityEvent("blur");
}

function recordVisibilityChange(){
  if(!isActiveSpeedRun()) return;
  const security = state.session.security;
  if(document.visibilityState === "hidden"){
    security.hiddenEvents += 1;
    security.hiddenStartedPerf = performance.now();
    const entry = isWorldMode() ? null : getCurrentRouteEntry();
    if(entry) entry.hiddenStartedPerf = security.hiddenStartedPerf;
    recordSecurityEvent("hidden");
  }else{
    finishHiddenPeriod();
  }
}

function recordFocusReturn(){
  if(!state.session || !state.session.security) return;
  finishFocusLossPeriod();
}

function markQuestionFirstKey(entry){
  if(!entry || entry.firstKeyAt !== null) return;
  const perfNow = performance.now();
  entry.firstKeyAt = Math.round(perfNow);
  entry.firstKeyMs = Math.round(getElapsedMs());
  if(entry.visiblePerf !== null && perfNow - entry.visiblePerf < NEAR_INSTANT_RECOGNITION_MS){
    addQuestionQualityFlag(entry, entry.index === 1 ? "start-artefact" : "near-instant-answer");
  }
}

function markQuestionFirstInput(entry){
  if(!entry) return;
  const perfNow = performance.now();
  if(entry.firstInputMs === null) entry.firstInputMs = Math.round(getElapsedMs());
  if(entry.firstInputAt === null) entry.firstInputAt = Math.round(perfNow);
  if(entry.firstKeyAt === null) markQuestionFirstKey(entry);
}

function addQuestionQualityFlag(entry, flag){
  if(!entry || !flag) return;
  entry.dataQualityFlags = Array.isArray(entry.dataQualityFlags) ? entry.dataQualityFlags : [];
  if(!entry.dataQualityFlags.includes(flag)) entry.dataQualityFlags.push(flag);
}

function getFiniteTiming(value){
  if(value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampQuestionTiming(entry){
  if(!entry) return;
  const visibleAt = getFiniteTiming(entry.visibleAt);
  if(visibleAt !== null){
    for(const key of ["firstKeyAt", "firstInputAt", "firstSubmitAt", "firstWrongAt", "acceptedAt"]){
      const value = getFiniteTiming(entry[key]);
      if(value !== null && value < visibleAt) entry[key] = Math.round(visibleAt);
    }
  }

  const shownMs = getFiniteTiming(entry.shownMs);
  if(shownMs !== null){
    for(const key of ["firstKeyMs", "firstInputMs", "firstSubmitMs", "solvedMs"]){
      const value = getFiniteTiming(entry[key]);
      if(value !== null && value < shownMs) entry[key] = Math.round(shownMs);
    }
  }
}

function finishFocusLossPeriod(){
  const security = state.session && state.session.security;
  if(!security || security.focusLostStartedPerf === null) return;
  const now = performance.now();
  const delta = Math.max(0, now - security.focusLostStartedPerf);
  security.focusLostMs += delta;
  const entry = isWorldMode() ? null : getCurrentRouteEntry();
  if(entry && Number.isFinite(entry.focusLostStartedPerf)){
    entry.focusLostDuringQuestionMs = (entry.focusLostDuringQuestionMs || 0) + Math.max(0, now - entry.focusLostStartedPerf);
    entry.focusLostStartedPerf = null;
    addQuestionQualityFlag(entry, "focus-lost");
  }
  security.focusLostStartedPerf = null;
}

function finishHiddenPeriod(){
  const security = state.session && state.session.security;
  if(!security || security.hiddenStartedPerf === null) return;
  const now = performance.now();
  const delta = Math.max(0, now - security.hiddenStartedPerf);
  security.hiddenMs += delta;
  const entry = getCurrentRouteEntry();
  if(entry && Number.isFinite(entry.hiddenStartedPerf)){
    entry.hiddenDuringQuestionMs = (entry.hiddenDuringQuestionMs || 0) + Math.max(0, now - entry.hiddenStartedPerf);
    entry.hiddenStartedPerf = null;
    addQuestionQualityFlag(entry, "hidden-tab");
  }
  security.hiddenStartedPerf = null;
}

function finaliseActiveInterruptionPeriods(){
  finishFocusLossPeriod();
  finishHiddenPeriod();
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
  ensureAvailableRegionMode();
  if(state.playMode === "speedrun" || isWorldMode()) state.hard = true;
  document.body.dataset.playMode = state.playMode;
  document.body.dataset.quizMode = state.which;
  document.body.dataset.gameScope = state.gameScope;
  playModeButtons.forEach(button=>{
    const active = button.dataset.playMode === state.playMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  scopeButtons.forEach(button=>{
    const active = button.dataset.gameScope === state.gameScope;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  quizButtons.forEach(button=>{
    const active = button.dataset.mode === state.which;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateQuizButtonLabels();
  hardToggle.checked = state.hard;
  hardToggle.disabled = state.playMode === "speedrun" || isWorldMode();
  hardLabel.textContent = state.playMode === "speedrun" || isWorldMode() ? "Typing required" : "Hard mode";
  giveupBtn.textContent = state.playMode === "speedrun" ? "Restart" : "Give up";
  giveupBtn.setAttribute("aria-label", state.playMode === "speedrun" ? "Restart run" : "Give up");
  lifeSelect.value = state.lifeSetting;
  speedTargetSelect.value = state.speedTarget;
  if(regionSetInput) regionSetInput.value = getRegionGroupConfig().label;
}

function updateQuizButtonLabels(){
  const group = getRegionGroupConfig();
  const regionFlagsAvailable = !isRegionGame() || getRegionFlagItemCount() > 0;
  const labels = isRegionGame()
    ? {
      flags: "Flags",
      capitals: getShortRegionCapitalButtonLabel(group),
      world: "Map"
    }
    : {
      flags: "Flag Quiz",
      capitals: "Capital Quiz",
      world: "World Map"
    };
  quizButtons.forEach(button=>{
    const label = labels[button.dataset.mode] || button.textContent;
    button.textContent = label;
    const disabled = isRegionGame() && button.dataset.mode === "flags" && !regionFlagsAvailable;
    button.disabled = disabled;
    button.setAttribute("aria-disabled", disabled ? "true" : "false");
    button.title = disabled ? getUnavailableRegionFlagsMessage() : "";
  });
}

function getShortRegionCapitalButtonLabel(group){
  const label = normalise(group.capitalPluralLabel || group.capitalLabel || "");
  if(label.includes("town")) return "Towns";
  if(label.includes("centre") || label.includes("center")) return "Centres";
  return "Capitals";
}

function populateRegionSets(){
  if(!regionSetOptions || !regionSetInput) return;
  regionSetOptions.innerHTML = "";
  for(const key of REGION_GAME_GROUP_ORDER){
    const group = REGION_GAME_GROUPS[key];
    const option = document.createElement("option");
    option.value = group.label;
    regionSetOptions.appendChild(option);
  }
  if(!REGION_GAME_GROUPS[state.selectedRegionGroup]){
    state.selectedRegionGroup = DEFAULT_REGION_GAME_GROUP;
  }
  regionSetInput.value = getRegionGroupConfig().label;
}

function applyRegionSetInput(){
  const nextGroup = resolveRegionGroupName(regionSetInput.value);
  if(!nextGroup){
    regionSetInput.value = getRegionGroupConfig().label;
    if(isRegionGame()) setFeedback("Choose a listed regional quiz set.", false);
    return;
  }
  if(state.selectedRegionGroup === nextGroup){
    regionSetInput.value = getRegionGroupConfig().label;
    return;
  }
  state.selectedRegionGroup = nextGroup;
  state.selectedContinent = "All";
  const switchedMode = ensureAvailableRegionMode();
  populateContinents();
  populateSpeedTargets();
  resetSession();
  if(switchedMode) setFeedback(getUnavailableRegionFlagsMessage(), false);
}

function resolveRegionGroupName(value){
  const key = normalise(value);
  if(!key) return "";
  for(const groupKey of REGION_GAME_GROUP_ORDER){
    const group = REGION_GAME_GROUPS[groupKey];
    const values = [group.key, group.label, ...(group.aliases || [])];
    if(values.some(candidate=>normalise(candidate) === key)) return group.key;
  }
  return "";
}

function populateContinents(){
  if(continentLabel){
    continentLabel.textContent = isRegionGame() ? "Question set" : "Continent";
  }
  if(isRegionGame()){
    const group = getRegionGroupConfig();
    const options = state.playMode === "speedrun" || isWorldMode()
      ? [{value:"All", label:`All ${group.itemPluralLabel}`}]
      : [
        {value:"All", label:`All ${group.itemPluralLabel}`},
        {value:"Revise", label:`Revise ${group.itemPluralLabel}`},
        {value:"Revise Capitals", label:`Revise ${group.capitalPluralLabel}`}
      ];
    continentSelect.innerHTML = "";
    for(const item of options){
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      continentSelect.appendChild(option);
    }
    if(!options.some(option=>option.value === state.selectedContinent)) state.selectedContinent = "All";
    continentSelect.value = state.selectedContinent;
    return;
  }

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
  if(isRegionGame()){
    const items = getRegionQuestionItemNames();
    if(state.selectedContinent === "Revise") return getCurrentReviseList("flags").filter(item=>items.includes(item));
    if(state.selectedContinent === "Revise Capitals") return getCurrentReviseList("capitals").filter(item=>items.includes(item));
    return items;
  }
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
  if(state.playMode === "speedrun") disableInputs();
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
  if(isRegionGame()){
    const items = getRegionQuestionItemNames();
    if(state.playMode === "practice" && state.selectedContinent === "Revise"){
      pool = getCurrentReviseList("flags").filter(item=>items.includes(item));
    }else if(state.playMode === "practice" && state.selectedContinent === "Revise Capitals"){
      pool = getCurrentReviseList("capitals").filter(item=>items.includes(item));
    }else{
      pool = items;
    }
  }else if(state.playMode === "practice" && state.selectedContinent === "Revise"){
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

function shouldPreloadSpeedRunFlags(){
  return (state.playMode === "speedrun" || state.playMode === "practice") && state.which === "flags";
}

function getSpeedRunFlagPreloadUrl(country){
  if(!country) return "";
  if(isRegionGame()){
    if(!window.RegionMap || typeof window.RegionMap.getRegionFlagUrl !== "function") return "";
    return window.RegionMap.getRegionFlagUrl(state.selectedRegionGroup, country);
  }
  return typeof getCountryFlagUrl === "function" ? getCountryFlagUrl(country, FLAG_RENDER_SIZE) : "";
}

function makeSpeedRunFlagPreloadEntry(country){
  const url = getSpeedRunFlagPreloadUrl(country);
  if(!url) return null;
  const scope = isRegionGame() ? `regions:${state.selectedRegionGroup}` : "countries";
  return {
    key: `${scope}:${country}:${url}`,
    country,
    url
  };
}

function queueSpeedRunFlagPreloads(countries, priority=false){
  if(!shouldPreloadSpeedRunFlags() || typeof preloadImageUrl !== "function") return;
  const session = state.session;
  if(!session || session.gameOver) return;
  const list = Array.isArray(countries) ? countries : [countries];
  const entries = [];

  for(const country of list){
    const entry = makeSpeedRunFlagPreloadEntry(country);
    if(!entry || session.flagPreloadDoneKeys.has(entry.key) || session.flagPreloadActiveKeys.has(entry.key)) continue;
    const existingIndex = session.flagPreloadQueue.findIndex(item=>item.key === entry.key);
    if(existingIndex >= 0){
      if(priority) entries.push(session.flagPreloadQueue.splice(existingIndex, 1)[0]);
      continue;
    }
    entries.push(entry);
  }

  if(!entries.length) return;
  if(priority){
    session.flagPreloadQueue.unshift(...entries);
  }else{
    session.flagPreloadQueue.push(...entries);
  }
  drainSpeedRunFlagPreloads(session);
}

function drainSpeedRunFlagPreloads(session=state.session){
  if(!session || !shouldPreloadSpeedRunFlags() || typeof preloadImageUrl !== "function") return;
  while(session.flagPreloadActiveKeys.size < SPEEDRUN_FLAG_PRELOAD_CONCURRENCY && session.flagPreloadQueue.length){
    const entry = session.flagPreloadQueue.shift();
    if(!entry || session.flagPreloadDoneKeys.has(entry.key) || session.flagPreloadActiveKeys.has(entry.key)) continue;
    session.flagPreloadActiveKeys.add(entry.key);
    preloadImageUrl(entry.url)
      .catch(()=>false)
      .then(()=>{})
      .finally(()=>{
        if(session !== state.session) return;
        session.flagPreloadActiveKeys.delete(entry.key);
        session.flagPreloadDoneKeys.add(entry.key);
        drainSpeedRunFlagPreloads(session);
      });
  }
}

function getSpeedRunFlagPreloadPriority(currentCountry=""){
  if(!shouldPreloadSpeedRunFlags()) return [];
  const session = state.session;
  if(!session || !session.pool.length) return currentCountry ? [currentCountry] : [];
  const upcoming = session.pool
    .filter(country=>country !== currentCountry && !session.solved.has(country) && !session.skipped.has(country))
    .slice(0, SPEEDRUN_FLAG_PRELOAD_AHEAD);
  if(upcoming.length < SPEEDRUN_FLAG_PRELOAD_AHEAD && session.skipped.size){
    upcoming.push(...Array.from(session.skipped)
      .filter(country=>country !== currentCountry && !session.solved.has(country))
      .slice(0, SPEEDRUN_FLAG_PRELOAD_AHEAD - upcoming.length));
  }
  return [currentCountry, ...upcoming].filter(Boolean);
}

function chooseQuestionCandidate(candidates){
  if(state.playMode === "speedrun" && state.which === "flags"){
    return candidates[0];
  }
  return candidates[(Math.random()*candidates.length)|0];
}

async function loadQuestion(){
  const session = state.session;
  if(session.gameOver || session.pendingAdvance) return;
  clearFeedback();
  toggleAnswerUi();

  if(session.pool.length === 0){
    session.pool = buildPool();
    rememberQuestionOrder(session.pool);
    queueSpeedRunFlagPreloads(session.pool);
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

  session.correctCountry = chooseQuestionCandidate(candidates);
  session.correctAnswer = getExpectedAnswerForMode(session.correctCountry);
  session.questionAnswered = false;
  session.currentWrongAttempts = 0;
  session.history.push(session.correctCountry);
  recordRouteQuestion(session.correctCountry);
  answerInput.placeholder = "Type your answer...";
  queueSpeedRunFlagPreloads(getSpeedRunFlagPreloadPriority(session.correctCountry), true);

  await renderQuestionVisual(session.correctCountry);
  countryLabel.textContent = state.which === "capitals"
    ? getCapitalQuestionText(session.correctCountry)
    : "";

  updateReviseButton();
  updateAllStatus();
  await markCurrentQuestionVisible(session.correctCountry);

  if(state.hard){
    answerInput.value = "";
    answerInput.disabled = false;
    submitBtn.disabled = false;
    answerInput.focus();
  }else{
    setupMcq();
  }
  lastBtn.disabled = session.history.length <= 1;
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
  cancelQuestionFocusMapRender();
  const preloadUrl = getSpeedRunFlagPreloadUrl(country);
  if(shouldPreloadSpeedRunFlags() && preloadUrl && typeof preloadImageUrl === "function"){
    await preloadImageUrl(preloadUrl);
  }
  if(state.session.gameOver || state.session.correctCountry !== country) return;
  questionVisual.innerHTML = "";
  const holder = document.createElement("div");
  holder.className = "flag-holder";
  questionVisual.appendChild(holder);
  const img = isRegionGame() && window.RegionMap
    ? window.RegionMap.createFlagElement(state.selectedRegionGroup, country, FLAG_RENDER_SIZE)
    : await createFlagImg(country, FLAG_RENDER_SIZE, `Flag of ${country}`);
  markSpeedRunFlagImagePriority(img);
  holder.replaceChildren(img);
}

function markSpeedRunFlagImagePriority(element){
  if(!shouldPreloadSpeedRunFlags() || !element || element.tagName !== "IMG") return;
  element.loading = "eager";
  if("fetchPriority" in element) element.fetchPriority = "high";
}

async function renderQuestionVisual(country){
  if(state.which === "capitals"){
    await renderCapitalQuestionMap(country);
    return;
  }
  await renderFlag(country);
}

async function renderCapitalQuestionMap(country){
  if(isRegionGame() && window.RegionMap && typeof window.RegionMap.renderFocus === "function"){
    try{
      await window.RegionMap.renderFocus(questionVisual, state.selectedRegionGroup, country, {
        solved: state.session.solved,
        showCaption:false,
        showCapitalMarker:true,
        showCapitalLabel:false
      });
    }catch(error){
      const group = getRegionGroupConfig();
      const message = error && error.message ? error.message : `${group.mapLabel || group.label} map could not load.`;
      questionVisual.innerHTML = "";
      questionVisual.appendChild(createWorldMapStatus(message, {
        retryLabel:"Try again",
        onRetry:()=>renderCapitalQuestionMap(country)
      }));
    }
    return;
  }
  if(window.CountryFocusMap && typeof window.CountryFocusMap.render === "function"){
    await window.CountryFocusMap.render(questionVisual, country, {
      continent: countryContinent[country] || undefined,
      showCountryName:true,
      showCapital:true,
      showCapitalLabel:false
    });
    return;
  }
  await renderFlag(country);
}

function cancelQuestionFocusMapRender(){
  if(window.CountryFocusMap && typeof window.CountryFocusMap.cancel === "function"){
    window.CountryFocusMap.cancel(questionVisual);
  }
}

function afterVisibleFrame(){
  return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}

async function markCurrentQuestionVisible(country){
  if(state.playMode !== "speedrun" || isWorldMode()) return;
  const entry = getCurrentRouteEntry();
  if(!entry || entry.country !== country || entry.visiblePerf !== null) return;
  await afterVisibleFrame();
  if(state.session.gameOver || getCurrentRouteEntry() !== entry) return;
  await startSpeedRun();
  const perfNow = performance.now();
  entry.visiblePerf = perfNow;
  entry.visibleAt = Math.round(perfNow);
  entry.shownMs = Math.max(0, Math.round(getElapsedMs()));
}

async function markWorldMapVisible(){
  if(state.playMode !== "speedrun" || !isWorldMode()) return;
  await afterVisibleFrame();
  if(state.session.gameOver) return;
  await startSpeedRun();
  const perfNow = performance.now();
  state.session.worldMapVisiblePerf = perfNow;
  state.session.worldLastSolvedPerf = perfNow;
  state.session.worldLastSolvedMs = Math.max(0, Math.round(getElapsedMs()));
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
  answerInput.placeholder = isRegionGame()
    ? `Type any ${getRegionGroupConfig().itemLabel}...`
    : state.selectedContinent === "All"
      ? "Type any country..."
      : `Type any ${state.selectedContinent} country...`;
  mcqBtns.forEach(button=>{ button.textContent = ""; button.disabled = true; });

  const mapRendered = await renderWorldMap();
  if(session !== state.session || !isWorldMode()) return;
  updateAllStatus();
  if(!mapRendered){
    answerInput.value = "";
    answerInput.disabled = true;
    submitBtn.disabled = true;
    lastBtn.disabled = true;
    nextBtn.disabled = true;
    giveupBtn.disabled = true;
    return;
  }
  await markWorldMapVisible();

  answerInput.value = "";
  answerInput.disabled = false;
  submitBtn.disabled = false;
  lastBtn.disabled = true;
  nextBtn.disabled = true;
  giveupBtn.disabled = false;
  answerInput.focus();
}

function renderEmpty(){
  cancelQuestionFocusMapRender();
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
  const canonicalAnswer = getExpectedAnswerForMode(country);
  const entry = {
    runId: session.analytics.runId,
    index: session.route.length + 1,
    questionIndex: session.route.length + 1,
    countryId: getCountryId(country),
    country,
    continent: getCountryContinentForCurrentMode(country),
    answer: canonicalAnswer,
    canonicalAnswer,
    acceptedAnswer: "",
    rawFinalInput: "",
    allRawAttempts: [],
    acceptedAlias: "",
    aliasType: "unanswered",
    answerCompletionType: "unanswered",
    shortcutUsed: false,
    autocompleteUsed: false,
    hintUsed: false,
    skipUsed: false,
    shownMs: Math.round(getElapsedMs()),
    visibleAt: null,
    visiblePerf: null,
    firstInputMs: null,
    firstSubmitMs: null,
    firstKeyAt: null,
    firstKeyMs: null,
    firstInputAt: null,
    firstSubmitAt: null,
    firstWrongAt: null,
    acceptedAt: null,
    solvedMs: null,
    attempts: 0,
    wrongAttempts: 0,
    inputEvents: 0,
    keyEvents: 0,
    typedChars: 0,
    canonicalChars: countAnalyticsChars(canonicalAnswer),
    wordCount: getAnalyticsWordCount(canonicalAnswer),
    hasHyphen: canonicalAnswer.includes("-"),
    hasDiacritics: hasAnalyticsDiacritics(canonicalAnswer),
    hasAnd: /\band\b/i.test(canonicalAnswer),
    nameComplexity: getAnalyticsNameComplexity(canonicalAnswer),
    flagSimilarityGroup: null,
    maxInputLength: 0,
    pasteEvents: 0,
    pasteDetected: false,
    backspaces: 0,
    deletedChars: 0,
    focusLostDuringQuestionMs: 0,
    hiddenDuringQuestionMs: 0,
    dataQualityFlags: [],
    skipped: false
  };
  session.route.push(entry);
  session.currentRouteIndex = session.route.length - 1;
}

function recordRouteAttempt(value, correct, result={}, options={}){
  const entry = getCurrentRouteEntry();
  if(state.playMode !== "speedrun" || !entry) return;
  const now = Math.round(getElapsedMs());
  const perfNow = performance.now();
  const canonical = entry.canonicalAnswer || entry.answer || "";
  const match = getAcceptedAnswerMatch(value, canonical, result);
  const rawAttempt = {
    rawInput: String(value || ""),
    submittedAt: Math.round(perfNow),
    submittedMs: now,
    correct: !!correct,
    editDistanceToCanonical: getAnalyticsEditDistance(value, canonical),
    matchedAlias: match.acceptedAlias || "",
    errorType: correct ? "correct" : getAnalyticsErrorType(value, canonical, match.acceptedAlias)
  };
  entry.attempts += 1;
  entry.allRawAttempts.push(rawAttempt);
  if(entry.firstSubmitMs === null) entry.firstSubmitMs = now;
  if(entry.firstSubmitAt === null) entry.firstSubmitAt = Math.round(perfNow);
  if(entry.firstInputMs === null && value) markQuestionFirstInput(entry);
  entry.maxInputLength = Math.max(entry.maxInputLength || 0, value.length);
  if(!correct){
    entry.wrongAttempts += 1;
    if(entry.firstWrongAt === null) entry.firstWrongAt = Math.round(perfNow);
    return;
  }

  entry.acceptedAnswer = canonical;
  entry.rawFinalInput = String(value || "");
  entry.acceptedAlias = match.acceptedAlias || "";
  entry.aliasType = match.aliasType;
  entry.shortcutUsed = match.shortcutUsed;
  entry.autocompleteUsed = options.autoSubmit === true;
  entry.answerCompletionType = getAnswerCompletionType(entry, match);
  entry.acceptedAt = Math.round(perfNow);
  if(entry.autocompleteUsed) addQuestionQualityFlag(entry, "autocomplete-submit");
}

function markRouteSolved(){
  const entry = getCurrentRouteEntry();
  if(state.playMode !== "speedrun" || !entry || entry.solvedMs !== null) return;
  entry.solvedMs = Math.round(getElapsedMs());
  if(entry.acceptedAt === null) entry.acceptedAt = Math.round(performance.now());
  updateQuestionDerivedTiming(entry);
}

function buildRouteSnapshot(route){
  const previousAttemptsByCountry = new Map();
  return route.map(entry=>{
    clampQuestionTiming(entry);
    const country = entry.country || "";
    const previous = previousAttemptsByCountry.get(country) || {attempts:0, wrongAttempts:0};
    const solved = entry.solvedMs !== null && entry.solvedMs !== undefined;
    const ownAttempts = entry.attempts || 0;
    const ownWrongAttempts = entry.wrongAttempts || 0;
    const attempts = solved ? ownAttempts + previous.attempts : ownAttempts;
    const wrongAttempts = solved ? ownWrongAttempts + previous.wrongAttempts : ownWrongAttempts;

    if(solved){
      previousAttemptsByCountry.delete(country);
    }else{
      previousAttemptsByCountry.set(country, {
        attempts: previous.attempts + ownAttempts,
        wrongAttempts: previous.wrongAttempts + ownWrongAttempts
      });
    }

    return {
      index: entry.index,
      country: entry.country,
      continent: entry.continent,
      answer: entry.answer,
      shownMs: Math.round(entry.shownMs || 0),
      firstInputMs: entry.firstInputMs === null ? null : Math.round(entry.firstInputMs),
      firstSubmitMs: entry.firstSubmitMs === null ? null : Math.round(entry.firstSubmitMs),
      solvedMs: entry.solvedMs === null ? null : Math.round(entry.solvedMs),
      attempts,
      wrongAttempts,
      inputEvents: entry.inputEvents || 0,
      keyEvents: entry.keyEvents || 0,
      typedChars: entry.typedChars || 0,
      maxInputLength: entry.maxInputLength || 0,
      pasteEvents: entry.pasteEvents || 0,
      skipped: !!entry.skipped
    };
  });
}

function routeEntryIsSolved(entry){
  return !!entry && entry.solvedMs !== null && entry.solvedMs !== undefined;
}

function countFirstTrySolved(route){
  return (Array.isArray(route) ? route : [])
    .filter(routeEntryIsSolved)
    .filter(entry=>(Number(entry.wrongAttempts) || 0) === 0)
    .length;
}

function buildTelemetrySnapshot(session){
  finaliseActiveInterruptionPeriods();
  const security = session.security || makeSecurityTelemetry();
  return {
    nonce: security.nonce,
    playerId: state.playerId,
    deviceNumber: getDeviceNumber(),
    startedAt: security.startedAt,
    completedAt: security.completedAt || new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    focusLosses: security.focusLosses || 0,
    focusLostMs: Math.round(security.focusLostMs || 0),
    hiddenEvents: security.hiddenEvents || 0,
    hiddenMs: Math.round(security.hiddenMs || 0),
    pasteEvents: security.pasteEvents || 0,
    keyEvents: security.keyEvents || 0,
    inputEvents: security.inputEvents || 0,
    typedChars: getSpeedRunTypedChars(session),
    wpm: roundMetric(getSpeedRunWpm(session, getSpeedRunDisplayMs(session)), 1),
    pointerEvents: security.pointerEvents || 0,
    suspiciousEvents: (security.suspiciousEvents || []).slice(0, 20),
    webdriver: !!navigator.webdriver,
    browser: getBrowserInfo(),
    environment: getClientEnvironment(),
    keyboardLayout: state.keyboardLayout || {available:false},
    knownPlayerNames: getDeviceKnownNames(),
    leaderboardNames: getDeviceLeaderboardNames()
  };
}

function buildClientRunEvidence(route, telemetry){
  const solvedRoute = route.filter(routeEntryIsSolved);
  const fastestQuestionMs = solvedRoute.reduce((fastest, entry)=>{
    const submitMs = entry.firstSubmitMs === null ? entry.solvedMs : entry.firstSubmitMs;
    const delta = Math.max(0, (submitMs || 0) - (entry.shownMs || 0));
    return fastest === null || delta < fastest ? delta : fastest;
  }, null);
  return {
    validationSource: "client-telemetry",
    fastestQuestionMs,
    routeHash: hashRunRoute(route),
    routeLength: route.length,
    solvedCount: solvedRoute.length,
    firstTrySolvedCount: countFirstTrySolved(route),
    telemetryCounts: {
      keyEvents: telemetry.keyEvents || 0,
      inputEvents: telemetry.inputEvents || 0,
      pasteEvents: telemetry.pasteEvents || 0,
      hiddenEvents: telemetry.hiddenEvents || 0,
      focusLosses: telemetry.focusLosses || 0
    }
  };
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

function hashStringValue(value){
  let hash = 2166136261;
  const text = String(value || "");
  for(let i=0;i<text.length;i++){
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function getCountrySetVersion(){
  const aliasPairs = Object.entries(countryAliases || {})
    .map(([country, aliases])=>`${country}:${(aliases || []).join(",")}`)
    .join("|");
  const regionPairs = REGION_GAME_GROUP_ORDER
    .map(groupKey=>{
      const group = REGION_GAME_GROUPS[groupKey];
      const items = (group.items || []).map(item=>`${item.name}:${item.capital}:${(item.aliases || []).join(",")}:${(item.capitalAliases || []).join(",")}`);
      return `${groupKey}[${items.join("|")}]`;
    })
    .join("::");
  return `v${countries.length}-${REGION_GAME_GROUP_ORDER.length}-${hashStringValue(`${countries.join("|")}::${aliasPairs}::${regionPairs}`)}`;
}

function rememberQuestionOrder(pool){
  const analytics = state.session && state.session.analytics;
  if(!analytics || analytics.questionOrder.length) return;
  analytics.questionOrder = Array.isArray(pool) ? [...pool] : [];
  analytics.questionOrderId = hashStringValue(analytics.questionOrder.join("|"));
}

function buildRunContext(session, elapsed, route, questionAnalytics){
  const analytics = session.analytics || makeRunAnalyticsState();
  const actualQuestionOrder = questionAnalytics.map(item=>item.country).filter(Boolean);
  const gameScope = getGameScopeKey();
  const setLabel = getCurrentSetLabel();
  const itemLabel = getCurrentItemLabel();
  return {
    version: ANALYTICS_SCHEMA_VERSION,
    runId: session.security.nonce,
    playerName: sanitizePlayerName(state.playerName),
    playerId: state.playerId,
    deviceNumber: getDeviceNumber(),
    knownPlayerNames: getDeviceKnownNames(),
    leaderboardNames: getDeviceLeaderboardNames(),
    gameScope,
    mode: state.which,
    region: setLabel,
    setKey: getLeaderboardSetKey(gameScope, setLabel),
    setLabel,
    itemLabel,
    itemPluralLabel: getCurrentItemPluralLabel(),
    difficulty: state.hard ? "hard" : "normal",
    target: state.speedTarget,
    targetLabel: getSpeedTargetLabel(),
    countrySetVersion: analytics.countrySetVersion,
    questionOrder: actualQuestionOrder.length ? actualQuestionOrder : analytics.questionOrder,
    questionOrderId: hashStringValue((actualQuestionOrder.length ? actualQuestionOrder : analytics.questionOrder || []).join("|")),
    startedAt: analytics.startedAt || session.security.startedAt,
    completedAt: analytics.completedAt || new Date().toISOString(),
    totalDurationMs: Math.round(elapsed || 0),
    browser: getBrowserInfo(),
    environment: getClientEnvironment(),
    keyboardLayout: state.keyboardLayout || {available:false},
    autocompleteEnabled: true,
    aliasesEnabled: true,
    strictSpellingMode: false,
    leaderboardValid: true,
    analyticsOnly: false,
    totalFocusLostMs: Math.round(session.security.focusLostMs || 0),
    totalHiddenTabMs: Math.round(session.security.hiddenMs || 0),
    pasteEventsCount: session.security.pasteEvents || 0,
    suspiciousTimingFlags: Array.from(new Set(questionAnalytics.flatMap(item=>item.dataQualityFlags || []))),
    routeHash: hashRunRoute(route)
  };
}

function getDeviceKnownNames(){
  const profile = state.deviceProfile && typeof state.deviceProfile === "object" ? state.deviceProfile : {};
  return Array.from(new Set([
    ...getCleanPlayerNameHistory(),
    ...(Array.isArray(profile.knownNames) ? profile.knownNames : []),
    sanitizePlayerName(state.playerName)
  ].filter(Boolean))).slice(0, 12);
}

function getDeviceLeaderboardNames(){
  const profile = state.deviceProfile && typeof state.deviceProfile === "object" ? state.deviceProfile : {};
  return Array.from(new Set([
    ...(Array.isArray(profile.leaderboardNames) ? profile.leaderboardNames : []),
    ...(Array.isArray(profile.submittedLeaderboardNames) ? profile.submittedLeaderboardNames : [])
  ].filter(Boolean))).slice(0, 12);
}

function buildQuestionAnalyticsSnapshot(session){
  finaliseActiveInterruptionPeriods();
  const previousAttemptsByCountry = new Map();
  return (session.route || [])
    .reduce((items, entry)=>{
      if(!entry) return items;
      clampQuestionTiming(entry);
      const country = entry.country || "";
      const previous = previousAttemptsByCountry.get(country) || {attempts:0, wrongAttempts:0, rawAttempts:[]};
      const ownAttempts = entry.attempts || 0;
      const ownWrongAttempts = entry.wrongAttempts || 0;
      const ownRawAttempts = Array.isArray(entry.allRawAttempts) ? entry.allRawAttempts : [];
      if(entry.solvedMs === null || entry.solvedMs === undefined){
        previousAttemptsByCountry.set(country, {
          attempts: previous.attempts + ownAttempts,
          wrongAttempts: previous.wrongAttempts + ownWrongAttempts,
          rawAttempts: [...previous.rawAttempts, ...ownRawAttempts]
        });
        return items;
      }

      updateQuestionDerivedTiming(entry);
      const combinedRawAttempts = [...previous.rawAttempts, ...ownRawAttempts];
      const attempts = combinedRawAttempts.map(attempt=>({
        rawInput: attempt.rawInput || "",
        submittedAt: attempt.submittedAt,
        submittedMs: attempt.submittedMs,
        correct: attempt.correct === true,
        editDistanceToCanonical: attempt.editDistanceToCanonical,
        matchedAlias: attempt.matchedAlias || "",
        errorType: attempt.errorType || getAnalyticsErrorType(attempt.rawInput, entry.canonicalAnswer, attempt.matchedAlias)
      }));
      const attemptsCount = previous.attempts + ownAttempts;
      const wrongSubmits = previous.wrongAttempts + ownWrongAttempts;
      previousAttemptsByCountry.delete(country);

      items.push({
        runId: session.security.nonce,
        questionIndex: entry.questionIndex || entry.index,
        countryId: entry.countryId || getCountryId(entry.country),
        country: entry.country,
        continent: entry.continent,
        canonicalAnswer: entry.canonicalAnswer || entry.answer,
        acceptedAnswer: entry.acceptedAnswer || entry.answer,
        rawFinalInput: entry.rawFinalInput || "",
        allRawAttempts: attempts.map(attempt=>attempt.rawInput),
        acceptedAlias: entry.acceptedAlias || "",
        aliasType: entry.aliasType || "unknown",
        answerCompletionType: wrongSubmits > 0 ? "corrected-after-mistakes" : entry.answerCompletionType || "unknown",
        shortcutUsed: !!entry.shortcutUsed,
        autocompleteUsed: !!entry.autocompleteUsed,
        hintUsed: !!entry.hintUsed,
        skipUsed: !!entry.skipUsed,
        attempts,
        attemptsCount,
        wrongSubmits,
        typedChars: entry.typedChars || 0,
        canonicalChars: entry.canonicalChars || countAnalyticsChars(entry.canonicalAnswer || entry.answer),
        wordCount: entry.wordCount || getAnalyticsWordCount(entry.canonicalAnswer || entry.answer),
        hasHyphen: !!entry.hasHyphen,
        hasDiacritics: !!entry.hasDiacritics,
        hasAnd: !!entry.hasAnd,
        nameComplexity: entry.nameComplexity || getAnalyticsNameComplexity(entry.canonicalAnswer || entry.answer),
        flagSimilarityGroup: entry.flagSimilarityGroup || null,
        visibleAt: entry.visibleAt,
        firstKeyAt: entry.firstKeyAt,
        firstInputAt: entry.firstInputAt,
        firstSubmitAt: entry.firstSubmitAt,
        firstWrongAt: entry.firstWrongAt,
        acceptedAt: entry.acceptedAt,
        recognitionMs: entry.recognitionMs,
        firstAttemptMs: entry.firstAttemptMs,
        finalSolveMs: entry.finalSolveMs,
        activeTypingMs: entry.activeTypingMs,
        correctionMs: entry.correctionMs,
        backspaces: entry.backspaces || 0,
        deletedChars: entry.deletedChars || 0,
        pasteDetected: !!entry.pasteDetected,
        focusLostDuringQuestionMs: Math.round(entry.focusLostDuringQuestionMs || 0),
        hiddenDuringQuestionMs: Math.round(entry.hiddenDuringQuestionMs || 0),
        dataQualityFlags: Array.from(new Set(entry.dataQualityFlags || []))
      });
      return items;
    }, []);
}

function updateQuestionDerivedTiming(entry){
  if(!entry) return;
  clampQuestionTiming(entry);
  const visibleAt = getFiniteTiming(entry.visibleAt);
  const firstKeyAt = getFiniteTiming(entry.firstKeyAt);
  const firstSubmitAt = getFiniteTiming(entry.firstSubmitAt);
  const acceptedAt = getFiniteTiming(entry.acceptedAt);
  if(visibleAt !== null && firstKeyAt !== null){
    entry.recognitionMs = Math.max(0, Math.round(firstKeyAt - visibleAt));
    if(entry.recognitionMs < NEAR_INSTANT_RECOGNITION_MS){
      addQuestionQualityFlag(entry, entry.index === 1 ? "start-artefact" : "near-instant-answer");
    }
  }else{
    entry.recognitionMs = null;
    addQuestionQualityFlag(entry, "missing-recognition-time");
  }
  if(visibleAt !== null && firstSubmitAt !== null){
    entry.firstAttemptMs = Math.max(0, Math.round(firstSubmitAt - visibleAt));
  }else{
    entry.firstAttemptMs = null;
  }
  if(visibleAt !== null && acceptedAt !== null){
    entry.finalSolveMs = Math.max(0, Math.round(acceptedAt - visibleAt));
  }else{
    entry.finalSolveMs = null;
  }
  if(firstKeyAt !== null && acceptedAt !== null){
    const interruptions = Math.round((entry.focusLostDuringQuestionMs || 0) + (entry.hiddenDuringQuestionMs || 0));
    entry.activeTypingMs = Math.max(0, Math.round(acceptedAt - firstKeyAt - interruptions));
  }else{
    entry.activeTypingMs = null;
  }
  if((entry.wrongAttempts || 0) > 0 && firstSubmitAt !== null && acceptedAt !== null){
    entry.correctionMs = Math.max(0, Math.round(acceptedAt - firstSubmitAt));
  }else{
    entry.correctionMs = 0;
  }
  if(entry.activeTypingMs && entry.typedChars && getWpmFromChars(entry.typedChars, entry.activeTypingMs) > IMPOSSIBLE_ACTIVE_WPM){
    addQuestionQualityFlag(entry, "impossible-active-typing-speed");
  }
}

function buildRunDerivedMetrics(summary){
  const engine = window.SpeedrunAnalytics;
  if(engine && engine.deriveRunMetrics){
    try{
      const metrics = engine.deriveRunMetrics({
        totalDurationMs: summary.timeMs,
        totalQuestions: summary.total,
        solvedCount: summary.total,
        finalCorrectCount: summary.total,
        firstTryCorrectCount: summary.correct,
        questionAnalytics: summary.questionAnalytics,
        telemetry: state.session && state.session.security ? {
          pasteEvents: state.session.security.pasteEvents,
          focusLostMs: state.session.security.focusLostMs,
          hiddenMs: state.session.security.hiddenMs
        } : {}
      });
      if(metrics) return metrics;
    }catch(error){
      console.error("Could not derive speedrun metrics.", error);
    }
  }
  return buildFallbackDerivedMetrics(summary);
}

function buildFallbackDerivedMetrics(summary){
  const questions = Array.isArray(summary.questionAnalytics) ? summary.questionAnalytics : [];
  const totalDurationMs = Number(summary.timeMs) || 0;
  const totalTypedChars = questions.reduce((sum, question)=>sum + (Number(question.typedChars) || 0), 0);
  const totalCanonicalChars = questions.reduce((sum, question)=>sum + (Number(question.canonicalChars) || 0), 0);
  const activeTypingMs = questions.reduce((sum, question)=>sum + (Number(question.activeTypingMs) || 0), 0);
  return {
    version: ANALYTICS_SCHEMA_VERSION,
    totalQuestions: summary.total,
    solvedCount: summary.total,
    totalDurationMs,
    totalTypedChars,
    totalCanonicalChars,
    totalActiveTypingMs: activeTypingMs,
    effectiveCanonicalWpm: roundMetric(getWpmFromChars(totalCanonicalChars, totalDurationMs), 2),
    actualInputWpm: roundMetric(getWpmFromChars(totalTypedChars, activeTypingMs), 2),
    activeInputWpm: roundMetric(getWpmFromChars(totalTypedChars, activeTypingMs), 2),
    speedrunInputWpm: roundMetric(getWpmFromChars(totalTypedChars, totalDurationMs), 2),
    noShortcutAdjustedWpm: roundMetric(getWpmFromChars(totalCanonicalChars, totalDurationMs), 2),
    countriesPerMinute: totalDurationMs ? roundMetric((summary.total / (totalDurationMs / 60000)), 2) : 0,
    shortcutUsageRate: questions.length ? roundMetric(questions.filter(item=>item.shortcutUsed).length / questions.length, 4) : 0,
    autocompleteUsageRate: questions.length ? roundMetric(questions.filter(item=>item.autocompleteUsed).length / questions.length, 4) : 0,
    dataQualityFlags: Array.from(new Set(questions.flatMap(item=>item.dataQualityFlags || [])))
  };
}

function getAcceptedAnswerMatch(value, canonicalAnswer, result={}){
  const raw = String(value || "").trim();
  const normalised = normaliseCurrentAnswer(raw);
  const canonicalNormalised = normaliseCurrentAnswer(canonicalAnswer || "");
  if(normalised && normalised === canonicalNormalised){
    return {
      acceptedAlias: "",
      aliasType: "full-canonical",
      shortcutUsed: false
    };
  }
  const aliases = getAliasesForCanonicalAnswer(canonicalAnswer);
  const matchedAlias = aliases.find(alias=>normaliseCurrentAnswer(alias) === normalised) || result.matchedAlias || "";
  if(matchedAlias){
    return {
      acceptedAlias: matchedAlias,
      aliasType: countAnalyticsChars(matchedAlias) < countAnalyticsChars(canonicalAnswer) ? "shortcut" : "exact-alias",
      shortcutUsed: countAnalyticsChars(matchedAlias) < countAnalyticsChars(canonicalAnswer)
    };
  }
  if(result.fuzzyOk || result.fuzzy){
    return {
      acceptedAlias: "",
      aliasType: "fuzzy",
      shortcutUsed: false
    };
  }
  return {
    acceptedAlias: "",
    aliasType: "unknown",
    shortcutUsed: false
  };
}

function getAliasesForCanonicalAnswer(canonicalAnswer){
  const aliases = [];
  const canonical = String(canonicalAnswer || "");
  if(isRegionGame()){
    const item = getRegionItemByName(canonical);
    if(item) aliases.push(...(item.aliases || []));
    for(const candidate of getRegionItems()){
      if(regionAnswersEqual(candidate.capital, canonical)){
        aliases.push(...(candidate.capitalAliases || []));
      }
    }
    return Array.from(new Set(aliases));
  }
  if(countryAliases[canonical]) aliases.push(...countryAliases[canonical]);
  if(WORLD_COUNTRY_EXTRA_ALIASES[canonical]) aliases.push(...WORLD_COUNTRY_EXTRA_ALIASES[canonical]);
  const code = (alpha2Overrides[canonical] || "").toLowerCase();
  if(WORLD_COUNTRY_EXTRA_ALIAS_CODES[code]) aliases.push(...WORLD_COUNTRY_EXTRA_ALIAS_CODES[code]);
  if(capitalAliases[canonical]) aliases.push(...capitalAliases[canonical]);
  return Array.from(new Set(aliases));
}

function getAnswerCompletionType(entry, match){
  if((entry.wrongAttempts || 0) > 0) return "corrected-after-mistakes";
  if(entry.autocompleteUsed) return "autocomplete";
  return match.aliasType || "full-canonical";
}

function makeRawAttemptRecord(value, correct, result, perfNow, elapsedMs, canonicalAnswer){
  const match = getAcceptedAnswerMatch(value, canonicalAnswer, result || {});
  return {
    rawInput: String(value || ""),
    submittedAt: Math.round(perfNow),
    submittedMs: Math.round(elapsedMs || 0),
    correct: !!correct,
    editDistanceToCanonical: getAnalyticsEditDistance(value, canonicalAnswer),
    matchedAlias: match.acceptedAlias || "",
    errorType: correct ? "correct" : getAnalyticsErrorType(value, canonicalAnswer, match.acceptedAlias)
  };
}

function getCountryId(country){
  if(isRegionGame()){
    return `${normalise(state.selectedRegionGroup).replace(/\s+/g, "-")}-${normalise(country).replace(/\s+/g, "-")}`;
  }
  return (alpha2Overrides[country] || normalise(country).replace(/\s+/g, "-")).toLowerCase();
}

function countAnalyticsChars(value){
  const engine = window.SpeedrunAnalytics;
  return engine && engine.countAnswerChars
    ? engine.countAnswerChars(value)
    : Array.from(String(value || "").replace(/\s+/g, "")).length;
}

function getAnalyticsWordCount(value){
  const engine = window.SpeedrunAnalytics;
  return engine && engine.wordCount
    ? engine.wordCount(value)
    : String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function hasAnalyticsDiacritics(value){
  const engine = window.SpeedrunAnalytics;
  return engine && engine.hasDiacritics
    ? engine.hasDiacritics(value)
    : /[\u00c0-\u024f]/.test(String(value || ""));
}

function getAnalyticsNameComplexity(value){
  const engine = window.SpeedrunAnalytics;
  return engine && engine.nameComplexity ? engine.nameComplexity(value) : countAnalyticsChars(value);
}

function getAnalyticsEditDistance(value, canonicalAnswer){
  const engine = window.SpeedrunAnalytics;
  if(engine && engine.editDistance) return engine.editDistance(value, canonicalAnswer);
  return levenshtein(value, canonicalAnswer);
}

function getAnalyticsErrorType(value, canonicalAnswer, matchedAlias){
  const engine = window.SpeedrunAnalytics;
  return engine && engine.classifyError
    ? engine.classifyError(value, canonicalAnswer, matchedAlias)
    : "unknown";
}

function getWpmFromChars(chars, ms){
  const minutes = Math.max(0, Number(ms) || 0) / 60000;
  return minutes ? ((Number(chars) || 0) / 5) / minutes : 0;
}

function getBrowserInfo(){
  const nav = window.navigator || {};
  return {
    userAgent: nav.userAgent || "",
    language: nav.language || "",
    languages: Array.isArray(nav.languages) ? nav.languages.slice(0, 6) : [],
    platform: nav.platform || "",
    hardwareConcurrency: nav.hardwareConcurrency || null,
    deviceMemory: nav.deviceMemory || null,
    maxTouchPoints: nav.maxTouchPoints || 0,
    cookieEnabled: nav.cookieEnabled === true,
    online: nav.onLine !== false,
    screen: window.screen ? {
      width: window.screen.width,
      height: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1
    } : null
  };
}

function getClientEnvironment(){
  const nav = window.navigator || {};
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  const timezone = Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || ""
    : "";
  return {
    timezone,
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    viewport: {
      width: window.innerWidth || 0,
      height: window.innerHeight || 0
    },
    documentVisibility: document.visibilityState || "",
    reducedMotion: window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
    connection: connection ? {
      effectiveType: connection.effectiveType || "",
      downlink: Number(connection.downlink) || 0,
      rtt: Number(connection.rtt) || 0,
      saveData: connection.saveData === true
    } : null
  };
}

async function captureKeyboardLayout(){
  if(!navigator.keyboard || !navigator.keyboard.getLayoutMap){
    return {available:false, reason:"keyboard-layout-api-unavailable"};
  }
  try{
    const layout = await navigator.keyboard.getLayoutMap();
    const keys = ["KeyA","KeyQ","KeyW","KeyZ","Semicolon","Quote","Comma","Period","Slash","Minus","Equal"];
    const sample = {};
    for(const key of keys) sample[key] = layout.get(key) || "";
    return {available:true, sample};
  }catch(error){
    return {available:false, reason:error && error.name ? error.name : "layout-read-failed"};
  }
}

function toggleAnswerUi(){
  const typedOnly = state.hard || isWorldMode();
  mcq.style.display = typedOnly ? "none" : "grid";
  textWrap.style.display = typedOnly ? "flex" : "none";
  submitBtn.style.display = typedOnly ? "" : "none";
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
    pool = session.pool.map(country=>getExpectedAnswerForMode(country)).filter(Boolean);
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
  if(result.exact || result.aliasOk) checkText({allowFuzzy:false, autoSubmit:true});
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
  recordRouteAttempt(value, accepted, result, options);

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
    checkWorldMapText({allowFuzzy:false, autoSubmit:true});
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
    handleWorldCorrect(result.country, result.fuzzy ? "Correct! (Close enough)" : "Correct!", value, result, options);
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

  handleWorldIncorrect(value, result);
  answerInput.select();
}

function evaluateWorldCountryAnswer(value, allowFuzzy=true){
  const normalised = normaliseCurrentAnswer(value);
  const session = state.session;
  const exactCountry = getCurrentListMapAnswerIndex().get(normalised) || null;
  const country = exactCountry || (allowFuzzy ? getUniqueFuzzyWorldCountry(value) : null);
  const match = country ? getAcceptedAnswerMatch(value, country, {
    exact: normalised === normaliseCurrentAnswer(country),
    aliasOk: !!exactCountry && normalised !== normaliseCurrentAnswer(country),
    fuzzyOk: !!country && !exactCountry
  }) : {};
  const inPool = !!country && session.pool.includes(country);
  return {
    country,
    exact: !!exactCountry,
    fuzzy: !!country && !exactCountry,
    matchedAlias: match.acceptedAlias || "",
    aliasType: match.aliasType || "",
    shortcutUsed: !!match.shortcutUsed,
    inPool,
    alreadySolved: !!country && session.solved.has(country)
  };
}

function getUniqueFuzzyWorldCountry(value){
  if(isCurrentRegionStrictDiacriticMode()) return null;
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

function getCurrentListMapAnswerIndex(){
  return isRegionGame() ? getRegionAnswerIndex(state.selectedRegionGroup) : getCountryAnswerIndex();
}

function getRegionAnswerIndex(groupKey){
  if(regionAnswerIndexByGroup.has(groupKey)) return regionAnswerIndexByGroup.get(groupKey);
  const index = new Map();
  for(const item of getRegionItems(groupKey)){
    addCountryAnswerIndexValue(index, item.name, item.name, groupKey);
    for(const alias of item.aliases || []){
      addCountryAnswerIndexValue(index, alias, item.name, groupKey);
    }
  }
  regionAnswerIndexByGroup.set(groupKey, index);
  return index;
}

function addCountryAnswerIndexValue(index, value, country, groupKey=""){
  const key = groupKey ? normaliseRegionAnswer(value, groupKey) : normalise(value);
  if(key && !index.has(key)) index.set(key, country);
}

function handleWorldCorrect(country, message="Correct!", rawInput="", result={}, options={}){
  const session = state.session;
  registerWorldCorrect(country);
  setFeedback(`${message} ${country} filled in.`, true);
  showAnswerFlash(true);
  recordWorldRouteSolved(country, rawInput, result, options);
  markWorldSolved(country);
  answerInput.value = "";
  session.worldAnswerStartedMs = null;
  session.worldAnswerStartedPerf = null;
  session.worldPendingAttempts = [];
  keepAnswerInputFocused();
  updateHighScore();
  updateWorldAnswerStatus();
  if(isRegionGame() && window.RegionMap && typeof window.RegionMap.scheduleSolved === "function"){
    window.RegionMap.scheduleSolved(state.selectedRegionGroup, country);
  }else{
    scheduleWorldMapCountrySolved(country);
  }

  if(isTargetComplete()){
    finishSession("complete");
  }
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

function handleWorldIncorrect(rawInput="", result={}){
  const session = state.session;
  if(state.playMode === "speedrun") startSpeedRun();
  session.currentWrongAttempts += 1;
  session.worldWrongSubmissions += 1;
  if(state.playMode === "speedrun"){
    session.worldPendingAttempts.push(makeRawAttemptRecord(rawInput, false, result, performance.now(), getElapsedMs(), rawInput));
  }
  session.streak = 0;
  if(state.playMode === "practice"){
    session.totalFirstAttempts += 1;
  }
  setFeedback(`No matching ${getCurrentItemLabel()} in this round.`, false);
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
  session.worldLastSolvedPerf = performance.now();
  captureSpeedRunSplit();
}

function recordWorldRouteSolved(country, rawInput="", result={}, options={}){
  const session = state.session;
  if(state.playMode !== "speedrun" || !country) return;
  const now = Math.round(getElapsedMs());
  const perfNow = performance.now();
  const visiblePerf = session.worldLastSolvedPerf || session.worldMapVisiblePerf || perfNow;
  const shownMs = Math.max(0, Math.round(session.worldLastSolvedMs || 0));
  const firstInputMs = session.worldAnswerStartedMs === null
    ? now
    : Math.max(shownMs, Math.round(session.worldAnswerStartedMs));
  const match = getAcceptedAnswerMatch(rawInput || country, country, result);
  const attempts = [
    ...session.worldPendingAttempts,
    makeRawAttemptRecord(rawInput || country, true, result, perfNow, now, country)
  ];
  const wrongAttempts = attempts.filter(attempt=>attempt.correct === false).length;
  const typedChars = Math.max(0, Array.from(String(rawInput || "").replace(/\s+/g, "")).length);
  const entry = {
    runId: session.analytics.runId,
    index: session.route.length + 1,
    questionIndex: session.route.length + 1,
    countryId: getCountryId(country),
    country,
    continent: getCountryContinentForCurrentMode(country),
    answer: country,
    canonicalAnswer: country,
    acceptedAnswer: country,
    rawFinalInput: rawInput || country,
    allRawAttempts: attempts,
    acceptedAlias: match.acceptedAlias || "",
    aliasType: match.aliasType || "full-canonical",
    answerCompletionType: match.aliasType || "full-canonical",
    shortcutUsed: match.shortcutUsed || false,
    autocompleteUsed: options.autoSubmit === true,
    hintUsed: false,
    skipUsed: false,
    shownMs,
    visibleAt: Math.round(visiblePerf),
    visiblePerf,
    firstInputMs,
    firstSubmitMs: now,
    firstKeyAt: session.worldAnswerStartedPerf ? Math.round(session.worldAnswerStartedPerf) : Math.round(perfNow),
    firstKeyMs: firstInputMs,
    firstInputAt: session.worldAnswerStartedPerf ? Math.round(session.worldAnswerStartedPerf) : Math.round(perfNow),
    firstSubmitAt: Math.round(perfNow),
    firstWrongAt: attempts.find(attempt=>attempt.correct === false)?.submittedAt || null,
    acceptedAt: Math.round(perfNow),
    solvedMs: now,
    attempts: attempts.length,
    wrongAttempts,
    inputEvents: 0,
    keyEvents: 0,
    typedChars,
    canonicalChars: countAnalyticsChars(country),
    wordCount: getAnalyticsWordCount(country),
    hasHyphen: country.includes("-"),
    hasDiacritics: hasAnalyticsDiacritics(country),
    hasAnd: /\band\b/i.test(country),
    nameComplexity: getAnalyticsNameComplexity(country),
    flagSimilarityGroup: null,
    maxInputLength: String(rawInput || "").length,
    pasteEvents: 0,
    pasteDetected: false,
    backspaces: 0,
    deletedChars: 0,
    focusLostDuringQuestionMs: 0,
    hiddenDuringQuestionMs: 0,
    dataQualityFlags: [],
    skipped: false
  };
  updateQuestionDerivedTiming(entry);
  session.route.push(entry);
  session.currentRouteIndex = session.route.length - 1;
}

function evaluateTextAnswer(value, allowFuzzy=true){
  const correct = getCorrectAnswer();
  const exact = normaliseCurrentAnswer(value) === normaliseCurrentAnswer(correct);
  const match = getAcceptedAnswerMatch(value, correct, {exact});
  const aliasOk = !!match.acceptedAlias;
  return {
    exact,
    aliasOk,
    fuzzyOk: !isCurrentRegionStrictDiacriticMode() && allowFuzzy && fuzzyMatch(value, correct),
    matchedAlias: match.acceptedAlias || "",
    aliasType: match.aliasType || (exact ? "full-canonical" : ""),
    shortcutUsed: !!match.shortcutUsed
  };
}

function getCorrectAnswer(){
  return state.which === "flags" ? state.session.correctCountry : state.session.correctAnswer;
}

function getCountryContinentForCurrentMode(country){
  if(isRegionGame()) return getRegionGroupConfig().label;
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
  if(isRegionGame()) return state.selectedRegionGroup === continent;
  if(isWorldMode()){
    return getWorldMapCountryContinents(country).includes(continent);
  }
  return countryContinent[country] === continent;
}

function getExpectedAnswerForMode(country){
  if(state.which === "capitals"){
    return isRegionGame()
      ? getRegionCapital(country) || "Unknown"
      : countryCapitals[country] || "Unknown";
  }
  return country;
}

function isAlias(value){
  const session = state.session;
  if(isRegionGame()){
    if(state.which === "flags"){
      return getRegionAliases(session.correctCountry).some(alias=>regionAnswersEqual(alias, value));
    }
    return getRegionCapitalAliases(session.correctCountry).some(alias=>regionAnswersEqual(alias, value));
  }
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
  const preserveAnswerInput = shouldPreserveMobileSpeedrunInput();
  setFeedback(message, true);
  showAnswerFlash(true);

  if(firstAttempt){
    session.correctFirstTry += 1;
    session.streak += 1;
  }

  markSolved();
  queueSpeedRunFlagPreloads(getSpeedRunFlagPreloadPriority(), true);
  updateHighScore();
  updateAllStatus();
  disableInputs({preserveAnswerInput});
  if(preserveAnswerInput) keepAnswerInputFocused();

  if(state.playMode === "speedrun" && isTargetComplete()){
    finishSession("complete");
    return;
  }

  session.pendingAdvance = true;

  window.setTimeout(()=>{
    if(session !== state.session || session.gameOver) return;
    session.pendingAdvance = false;
    loadQuestion();
  }, ANSWER_FLASH_MS);
}

function shouldPreserveMobileSpeedrunInput(){
  return state.playMode === "speedrun"
    && state.hard
    && !isWorldMode()
    && document.activeElement === answerInput
    && window.matchMedia(MOBILE_GAME_MEDIA_QUERY).matches;
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
  if(session.gameOver || session.pendingAdvance || !session.correctCountry) return;
  if(!session.solved.has(session.correctCountry)){
    const entry = getCurrentRouteEntry();
    if(entry){
      entry.skipped = true;
      entry.skipUsed = true;
      addQuestionQualityFlag(entry, "skipped");
    }
    session.skipped.add(session.correctCountry);
  }
  loadQuestion();
}

async function lastQuestion(){
  const session = state.session;
  if(isWorldMode()) return;
  if(session.history.length < 2 || session.gameOver || session.pendingAdvance) return;

  session.history.pop();
  const previous = session.history.pop();
  session.correctCountry = previous;
  session.correctAnswer = getExpectedAnswerForMode(previous);
  session.questionAnswered = session.answered.has(previous);
  session.currentWrongAttempts = 0;
  session.history.push(previous);
  recordRouteQuestion(previous);

  await renderQuestionVisual(previous);
  countryLabel.textContent = state.which === "capitals" ? getCapitalQuestionText(previous) : "";
  clearFeedback();
  updateReviseButton();
  updateAllStatus();
  lastBtn.disabled = session.history.length <= 1;

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
    if(state.playMode === "speedrun"){
      resetSession();
    }else{
      renderEmpty();
    }
    return;
  }
  if(state.playMode === "speedrun"){
    resetSession();
    return;
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
  const reviseKind = state.which === "flags" ? "flags" : "capitals";
  const list = getCurrentReviseList(reviseKind);
  const key = getCurrentReviseStorageKey(reviseKind);
  const index = list.indexOf(session.correctCountry);
  if(index >= 0){
    list.splice(index, 1);
    setReviseFeedback(false);
  }else{
    list.push(session.correctCountry);
    setReviseFeedback(true);
  }
  if(isRegionGame()){
    const store = reviseKind === "flags" ? state.reviseRegionFlags : state.reviseRegionCapitals;
    store[state.selectedRegionGroup] = list;
    storage.set(key, store);
  }else{
    storage.set(key, list);
  }
  updateReviseButton();
  setTimeout(()=>{ reviseFeedback.textContent = ""; }, 3000);
}

function updateReviseButton(){
  const session = state.session;
  if(isWorldMode()){
    reviseToggle.textContent = "Add to Revise";
    return;
  }
  const list = getCurrentReviseList(state.which === "flags" ? "flags" : "capitals");
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
  if(session.speedRun.started || !session.pool.length) return Promise.resolve();
  if(session.speedRun.startingPromise) return session.speedRun.startingPromise;

  session.speedRun.startingPromise = (async()=>{
    await beginSecureSpeedRun(session);
    if(session !== state.session || session.gameOver) return;
    session.speedRun.started = true;
    session.speedRun.startMs = Date.now();
    session.speedRun.startPerf = performance.now();
    session.speedRun.elapsedMs = 0;
    session.security.startedAt = new Date().toISOString();
    session.analytics.startedAt = session.security.startedAt;
    session.analytics.startedPerf = session.speedRun.startPerf;
    if(session.speedRun.timerId) window.clearInterval(session.speedRun.timerId);
    session.speedRun.timerId = window.setInterval(updateTimerDisplay, TIMER_TICK_MS);
    updateTimerDisplay();
  })();
  return session.speedRun.startingPromise;
}

function beginSecureSpeedRun(session){
  const service = getLeaderboardService();
  if(!isSharedLeaderboardConfigured() || !service || typeof service.startRunSession !== "function"){
    return Promise.resolve("");
  }
  if(session.speedRun.secureStartPromise) return session.speedRun.secureStartPromise;

  const setLabel = getCurrentSetLabel();
  const gameScope = getGameScopeKey();
  session.speedRun.secureStartPromise = service.startRunSession({
    modeKey: getSpeedRunKey(),
    gameScope,
    setKey: getLeaderboardSetKey(gameScope, setLabel),
    which: state.which,
    continent: setLabel,
    difficulty: "hard",
    targetValue: state.speedTarget,
    total: session.pool.length,
    telemetry: {
      playerId: state.playerId,
      nonce: session.security.nonce
    }
  }).then(result=>{
    if(session !== state.session) return "";
    const challenge = result && typeof result.challenge === "string" ? result.challenge : "";
    if(!challenge) throw new Error("Secure run verification did not start.");
    session.speedRun.secureChallenge = challenge;
    return challenge;
  }).catch(error=>{
    session.speedRun.secureError = getSharedLeaderboardErrorMessage(error);
    return "";
  });
  return session.speedRun.secureStartPromise;
}

function prepareSecureRunCompletion(session, run){
  const service = getLeaderboardService();
  if(!run || !isSharedLeaderboardConfigured() || !service || typeof service.finishRunSession !== "function") return;

  const completionPromise = (async()=>{
    const challenge = session.speedRun.secureChallenge
      || (session.speedRun.secureStartPromise ? await session.speedRun.secureStartPromise : "");
    if(!challenge){
      throw new Error(session.speedRun.secureError || "Secure run verification did not start. Start a new run.");
    }
    const result = await service.finishRunSession(challenge, run);
    if(!result || typeof result.completionReceipt !== "string" || !result.completionReceipt){
      throw new Error("Supabase did not return secure run verification.");
    }
    run.completionReceipt = result.completionReceipt;
    run.serverTimeMs = Number(result.time_ms) || run.timeMs;
    return result;
  })().catch(error=>{
    run.secureCompletionError = getSharedLeaderboardErrorMessage(error);
    return null;
  });

  Object.defineProperty(run, "secureCompletionPromise", {
    configurable: true,
    enumerable: false,
    value: completionPromise
  });
}

async function ensureSecureRunCompletion(run){
  if(run && run.completionReceipt) return true;
  if(run && run.secureCompletionPromise) await run.secureCompletionPromise;
  return !!(run && run.completionReceipt);
}

function stopSpeedRun(){
  const session = state.session;
  if(session.speedRun.started){
    session.speedRun.elapsedMs = getElapsedMs();
    finaliseActiveInterruptionPeriods();
    session.analytics.completedAt = new Date().toISOString();
    session.analytics.completedPerf = performance.now();
    session.security.completedAt = session.analytics.completedAt;
  }
  if(session.speedRun.timerId){
    window.clearInterval(session.speedRun.timerId);
    session.speedRun.timerId = null;
  }
}

function getElapsedMs(){
  const session = state.session;
  if(!session.speedRun.started) return session.speedRun.elapsedMs || 0;
  return performance.now() - session.speedRun.startPerf;
}

function getSpeedRunDisplayMs(session=state.session){
  if(!session || !session.speedRun) return 0;
  if(!session.speedRun.started) return session.speedRun.elapsedMs || 0;
  if(!session.speedRun.timerId && session.speedRun.elapsedMs) return session.speedRun.elapsedMs;
  return getElapsedMs();
}

function getSpeedRunTypedChars(session=state.session){
  return Math.max(0, Math.round(Number(session && session.speedRun && session.speedRun.typedChars) || 0));
}

function getSpeedRunWpm(session=state.session, elapsedMs=getSpeedRunDisplayMs(session)){
  const minutes = Math.max(0, elapsedMs || 0) / 60000;
  if(!minutes) return 0;
  return (getSpeedRunTypedChars(session) / 5) / minutes;
}

function getRouteTypedChars(route){
  return (Array.isArray(route) ? route : [])
    .reduce((sum, entry)=>sum + Math.max(0, Number(entry && entry.typedChars) || 0), 0);
}

function getRouteCanonicalChars(route){
  return (Array.isArray(route) ? route : [])
    .reduce((sum, entry)=>sum + countAnalyticsChars(entry && entry.answer), 0);
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
  const correct = countFirstTrySolved(route);
  const questionAnalytics = buildQuestionAnalyticsSnapshot(session);
  const derivedMetrics = buildRunDerivedMetrics({
    timeMs: elapsed,
    total: session.pool.length,
    correct,
    questionAnalytics
  });
  const telemetry = buildTelemetrySnapshot(session);
  const antiCheat = buildClientRunEvidence(route, telemetry);

  const key = getSpeedRunKey();
  const previousBest = getBestLocalRunTime(key);
  const typedChars = getSpeedRunTypedChars(session);
  const wpm = roundMetric(getSpeedRunWpm(session, elapsed), 1);

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
    gameScope: getGameScopeKey(),
    setKey: getLeaderboardSetKey(getGameScopeKey(), getCurrentSetLabel()),
    setLabel: getCurrentSetLabel(),
    itemLabel: getCurrentItemLabel(),
    continent: getCurrentSetLabel(),
    difficulty: state.hard ? "hard" : "normal",
    targetValue: state.speedTarget,
    targetLabel: getSpeedTargetLabel(),
    timeMs: Math.round(elapsed),
    typedChars,
    wpm,
    canonicalChars: derivedMetrics.totalCanonicalChars || 0,
    wpmVariants: {
      effectiveCanonicalWpm: derivedMetrics.effectiveCanonicalWpm || 0,
      actualInputWpm: derivedMetrics.actualInputWpm || 0,
      speedrunInputWpm: derivedMetrics.speedrunInputWpm || wpm,
      noShortcutAdjustedWpm: derivedMetrics.noShortcutAdjustedWpm || 0,
      noShortcutAdjustedWpmEstimated: true,
      recognitionOnlyPace: derivedMetrics.recognitionOnlyPace || 0
    },
    date: new Date().toISOString(),
    correct,
    total: session.pool.length,
    target: getSpeedTargetLabel(),
    splits: {...session.speedRun.splits},
    route,
    questionAnalytics,
    derivedMetrics,
    runContext: buildRunContext(session, elapsed, route, questionAnalytics),
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
  const sourceScope = sourceRun.gameScope || "countries";
  const key = buildLeaderboardModeKey(sourceScope, sourceRun.which, sourceRun.continent, sourceRun.difficulty, split);
  const previousBest = getBestLocalRunTime(key);
  const typedChars = getRouteTypedChars(route);
  const canonicalChars = getRouteCanonicalChars(route);
  const wpm = roundMetric(getWpmFromChars(typedChars, timeMs), 1);
  const questionAnalytics = getSplitQuestionAnalytics(sourceRun, route);
  const correct = countFirstTrySolved(route);
  const derivedMetrics = buildRunDerivedMetrics({
    timeMs,
    total: split,
    correct,
    questionAnalytics
  });
  const telemetry = {
    ...sourceRun.telemetry,
    nonce: `${sourceRun.telemetry.nonce}-${split}`,
    submittedAt: new Date().toISOString(),
    derivedFrom: sourceRun.telemetry.nonce,
    splitTarget: split,
    typedChars,
    wpm
  };
  const antiCheat = buildClientRunEvidence(route, telemetry);
  return {
    playerName: sourceRun.playerName,
    modeKey: key,
    which: sourceRun.which,
    gameScope: sourceScope,
    setKey: getLeaderboardSetKey(sourceScope, sourceRun.continent),
    setLabel: sourceRun.continent,
    itemLabel: sourceRun.itemLabel || sourceRun.runContext && sourceRun.runContext.itemLabel || (sourceScope === "regions" ? "region" : "country"),
    continent: sourceRun.continent,
    difficulty: sourceRun.difficulty,
    targetValue: String(split),
    targetLabel: `First ${split}`,
    timeMs,
    typedChars,
    wpm,
    canonicalChars,
    wpmVariants: {
      effectiveCanonicalWpm: derivedMetrics.effectiveCanonicalWpm || roundMetric(getWpmFromChars(canonicalChars, timeMs), 2),
      actualInputWpm: derivedMetrics.actualInputWpm || 0,
      speedrunInputWpm: derivedMetrics.speedrunInputWpm || wpm,
      noShortcutAdjustedWpm: derivedMetrics.noShortcutAdjustedWpm || 0,
      noShortcutAdjustedWpmEstimated: true,
      recognitionOnlyPace: derivedMetrics.recognitionOnlyPace || 0
    },
    date: sourceRun.date,
    correct,
    total: split,
    target: `First ${split}`,
    splits: {
      [String(split)]: timeMs,
      all: timeMs
    },
    route,
    questionAnalytics,
    derivedMetrics,
    runContext: buildSplitRunContext(sourceRun, split, timeMs, route, questionAnalytics),
    telemetry,
    antiCheat,
    isPersonalBest: previousBest === null || timeMs < previousBest,
    derivedFromTarget: sourceRun.targetValue
  };
}

function getSplitQuestionAnalytics(sourceRun, route){
  const routeLength = Array.isArray(route) ? route.length : 0;
  const sourceQuestions = Array.isArray(sourceRun.questionAnalytics) ? sourceRun.questionAnalytics : [];
  return sourceQuestions
    .filter(entry=>Number(entry.questionIndex || 0) <= routeLength)
    .slice(0, route.filter(entry=>entry && entry.solvedMs !== null).length);
}

function buildSplitRunContext(sourceRun, split, timeMs, route, questionAnalytics){
  const base = sourceRun.runContext && typeof sourceRun.runContext === "object" ? sourceRun.runContext : {};
  const questionOrder = route.map(entry=>entry.country).filter(Boolean);
  return {
    ...base,
    target: String(split),
    targetLabel: `First ${split}`,
    totalDurationMs: timeMs,
    questionOrder,
    questionOrderId: hashStringValue(questionOrder.join("|")),
    completedAt: sourceRun.date || new Date().toISOString(),
    analyticsOnly: false,
    derivedFromTarget: sourceRun.targetValue,
    parentRunId: sourceRun.runContext && sourceRun.runContext.runId || sourceRun.telemetry && sourceRun.telemetry.nonce || "",
    routeHash: hashRunRoute(route),
    suspiciousTimingFlags: Array.from(new Set((questionAnalytics || []).flatMap(item=>item.dataQualityFlags || [])))
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
  return `${getGameScopeKey()}_${state.which}_${getCurrentSetKey()}_${state.hard ? "hard" : "normal"}_${state.lifeSetting}`;
}

function getSpeedRunKey(){
  return buildLeaderboardModeKey(
    getGameScopeKey(),
    state.which,
    getCurrentSetLabel(),
    state.hard ? "hard" : "normal",
    state.speedTarget
  );
}

function buildLeaderboardModeKey(gameScope, which, setLabel, difficulty, target){
  if(gameScope === "regions"){
    return `regions_${which}_${getLeaderboardSetKey(gameScope, setLabel)}_${difficulty}_${target}`;
  }
  return `${which}_${setLabel}_${difficulty}_${target}`;
}

function getLeaderboardSetKey(gameScope, setLabel){
  if(gameScope !== "regions") return getCurrentSetKeyFromLabel(setLabel);
  return getCurrentSetKeyFromLabel(setLabel);
}

function getCurrentSetKeyFromLabel(label){
  return normalise(label).replace(/\s+/g, "-") || "all";
}

function getSpeedRunFilters(){
  return {
    modeKey: getSpeedRunKey(),
    which: state.which,
    continent: getCurrentSetLabel(),
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
    leaderboardPublishStatus.textContent = "Verifying completed run...";
  }

  for(const run of pendingRuns){
    if(!await ensureSecureRunCompletion(run)){
      if(leaderboardPublishStatus){
        leaderboardPublishStatus.textContent = run.secureCompletionError
          || "This run could not be verified securely. Start a new run and try again.";
      }
      postLeaderboardBtn.disabled = false;
      return;
    }
  }

  if(leaderboardPublishStatus){
    leaderboardPublishStatus.textContent = pendingRuns.length === 1
      ? "Posting run..."
      : `Posting ${pendingRuns.length} runs...`;
  }

  const results = [];
  for(const run of pendingRuns){
    const result = await submitSharedSpeedRun({
      ...run,
      playerName: state.playerName,
      telemetry: {
        ...(run.telemetry || {}),
        playerId: state.playerId,
        deviceNumber: getDeviceNumber(),
        knownPlayerNames: getDeviceKnownNames(),
        leaderboardNames: getDeviceLeaderboardNames()
      }
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

function queueCompletedRunAnalytics(run){
  if(!run || !run.telemetry || !run.telemetry.nonce) return;
  const analyticsRun = buildCompletedRunAnalytics(run);
  if(!analyticsRun) return;
  saveDeviceAnalyticsHistory(analyticsRun);
  const queue = getSpeedRunAnalyticsQueue()
    .filter(item=>item && item.clientRunId !== analyticsRun.clientRunId);
  queue.push(analyticsRun);
  state.speedRunAnalyticsQueue = trimAnalyticsQueue(queue);
  saveSpeedRunAnalyticsQueue();
  drainSpeedRunAnalyticsQueue();
}

function buildCompletedRunAnalytics(run){
  const route = Array.isArray(run.route) ? run.route : [];
  const questionAnalytics = Array.isArray(run.questionAnalytics) ? run.questionAnalytics : [];
  const telemetry = run.telemetry || {};
  const clientRunId = String(telemetry.nonce || "");
  if(!clientRunId || !route.length) return null;
  const derivedMetrics = run.derivedMetrics || buildRunDerivedMetrics({
    timeMs: run.timeMs,
    total: run.total,
    correct: run.correct,
    questionAnalytics
  });
  return {
    analyticsVersion: ANALYTICS_SCHEMA_VERSION,
    clientRunId,
    runId: clientRunId,
    playerName: sanitizePlayerName(run.playerName || state.playerName),
    playerId: state.playerId,
    deviceNumber: getDeviceNumber(),
    knownPlayerNames: getDeviceKnownNames(),
    leaderboardNames: getDeviceLeaderboardNames(),
    modeKey: run.modeKey,
    gameScope: run.gameScope || run.runContext && run.runContext.gameScope || "countries",
    setKey: run.setKey || run.runContext && run.runContext.setKey || getLeaderboardSetKey(run.gameScope || "countries", run.continent),
    setLabel: run.setLabel || run.runContext && run.runContext.setLabel || run.continent,
    itemLabel: run.itemLabel || run.runContext && run.runContext.itemLabel || (run.gameScope === "regions" ? "region" : "country"),
    which: run.which,
    mode: run.which,
    continent: run.continent,
    region: run.continent,
    difficulty: run.difficulty,
    target: run.targetValue,
    targetLabel: run.targetLabel,
    countrySetVersion: run.runContext && run.runContext.countrySetVersion,
    questionOrder: run.runContext && run.runContext.questionOrder,
    questionOrderId: run.runContext && run.runContext.questionOrderId,
    startedAt: run.runContext && run.runContext.startedAt,
    completedAt: run.runContext && run.runContext.completedAt,
    timeMs: run.timeMs,
    totalDurationMs: run.timeMs,
    correct: run.correct,
    total: run.total,
    solvedCount: run.total,
    firstTryCorrectCount: run.correct,
    finalCorrectCount: run.total,
    typedChars: run.typedChars || 0,
    canonicalChars: run.canonicalChars || derivedMetrics.totalCanonicalChars || 0,
    wpm: run.wpm || 0,
    wpmVariants: run.wpmVariants || {},
    splits: run.splits || {},
    route,
    questionAnalytics,
    derivedMetrics,
    runContext: run.runContext || {},
    telemetry,
    antiCheat: run.antiCheat || {},
    dataQualityFlags: derivedMetrics.dataQualityFlags || [],
    leaderboardValid: !(derivedMetrics.dataQualityFlags || []).includes("suspicious-leaderboard-run"),
    analyticsOnly: !run.isPersonalBest,
    capturedAt: new Date().toISOString()
  };
}

function getSpeedRunAnalyticsQueue(){
  return Array.isArray(state.speedRunAnalyticsQueue) ? state.speedRunAnalyticsQueue : [];
}

function trimAnalyticsQueue(queue){
  const items = Array.isArray(queue) ? queue.slice(-MAX_ANALYTICS_QUEUE_RUNS) : [];
  while(items.length > 1 && JSON.stringify(items).length > MAX_ANALYTICS_QUEUE_BYTES){
    items.shift();
  }
  return items;
}

function saveDeviceAnalyticsHistory(run){
  if(!run || !run.clientRunId) return;
  const history = getDeviceAnalyticsHistory()
    .filter(item=>item && item.clientRunId !== run.clientRunId);
  history.push(run);
  state.deviceAnalyticsHistory = trimAnalyticsQueue(history);
  storage.set(LS_KEYS.speedRunDeviceAnalyticsHistory, state.deviceAnalyticsHistory);
}

function getDeviceAnalyticsHistory(){
  return Array.isArray(state.deviceAnalyticsHistory) ? state.deviceAnalyticsHistory : [];
}

function saveSpeedRunAnalyticsQueue(){
  storage.set(LS_KEYS.speedRunAnalyticsQueue, getSpeedRunAnalyticsQueue());
}

async function drainSpeedRunAnalyticsQueue(){
  if(state.analyticsSyncing) return;
  if(!window.sharedLeaderboard || !window.sharedLeaderboard.isAnalyticsConfigured || !window.sharedLeaderboard.submitAnalytics) return;
  if(!window.sharedLeaderboard.isAnalyticsConfigured()) return;

  let queue = getSpeedRunAnalyticsQueue().filter(item=>item && item.clientRunId);
  if(!queue.length) return;
  if(queue.length !== getSpeedRunAnalyticsQueue().length){
    state.speedRunAnalyticsQueue = queue;
    saveSpeedRunAnalyticsQueue();
  }
  state.analyticsSyncing = true;
  try{
    let submitted = 0;
    for(const item of queue){
      try{
        await window.sharedLeaderboard.submitAnalytics(item);
        submitted += 1;
      }catch{
        break;
      }
    }
    if(submitted > 0){
      state.speedRunAnalyticsQueue = getSpeedRunAnalyticsQueue().slice(submitted);
      saveSpeedRunAnalyticsQueue();
    }
  }finally{
    state.analyticsSyncing = false;
  }
}

function getSpeedRunSplitTargets(){
  if(state.playMode !== "speedrun" || !state.session.pool.length) return [];
  const finish = state.session.pool.length;
  const targets = SPEEDRUN_SPLITS.filter(split=>split <= finish);
  if(!targets.includes(finish) && state.speedTarget !== "all") targets.push(finish);
  targets.push("all");
  return targets;
}

async function renderRegionListMap(){
  cancelQuestionFocusMapRender();
  const token = ++worldMapState.renderToken;
  const group = getRegionGroupConfig();
  questionVisual.innerHTML = "";
  questionVisual.appendChild(createWorldMapStatus(`Loading ${group.itemPluralLabel} outlines...`));

  try{
    await window.RegionMap.renderList(questionVisual, state.selectedRegionGroup, {
      pool: state.session.pool,
      solved: state.session.solved
    });
    return token === worldMapState.renderToken && isWorldMode() && isRegionGame();
  }catch(error){
    if(token !== worldMapState.renderToken || !isWorldMode() || !isRegionGame()) return false;
    const message = error && error.message ? error.message : `${group.mapLabel || group.label} map could not load.`;
    questionVisual.innerHTML = "";
    questionVisual.appendChild(createWorldMapStatus(message, {
      retryLabel:"Try again",
      onRetry:()=>loadWorldMapRound()
    }));
    return false;
  }
}

async function renderWorldMap(){
  if(!isWorldMode()) return false;
  if(isRegionGame()) return renderRegionListMap();
  cancelQuestionFocusMapRender();
  const token = ++worldMapState.renderToken;
  if(worldMapState.features){
    questionVisual.innerHTML = "";
    questionVisual.appendChild(createWorldMapShell(worldMapState.features));
    return true;
  }
  questionVisual.innerHTML = "";
  questionVisual.appendChild(createWorldMapStatus("Loading country outlines..."));

  try{
    const features = await loadWorldMapFeatures();
    if(token !== worldMapState.renderToken || !isWorldMode()) return false;
    questionVisual.innerHTML = "";
    questionVisual.appendChild(createWorldMapShell(features));
    return true;
  }catch(error){
    if(token !== worldMapState.renderToken || !isWorldMode()) return false;
    worldMapState.error = error && error.message ? error.message : "Country outline map could not load.";
    questionVisual.innerHTML = "";
    questionVisual.appendChild(createWorldMapStatus(worldMapState.error, {
      retryLabel:"Try again",
      onRetry:()=>loadWorldMapRound()
    }));
    return false;
  }
}

function createWorldMapStatus(text, options={}){
  const status = document.createElement("div");
  status.className = "world-map-status";
  const message = document.createElement("span");
  message.textContent = text;
  status.appendChild(message);
  if(typeof options.onRetry === "function"){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn primary map-retry-btn";
    button.dataset.loadRetry = "true";
    button.textContent = options.retryLabel || "Retry";
    button.addEventListener("click", options.onRetry);
    status.appendChild(button);
  }
  return status;
}

async function loadWorldMapFeatures(){
  if(worldMapState.features) return worldMapState.features;
  if(worldMapState.loadPromise) return worldMapState.loadPromise;

  worldMapState.error = "";
  worldMapState.loadPromise = (async ()=>{
    if(!window.topojson || !window.topojson.feature){
      throw new Error("Map libraries did not load. Check your connection and try again.");
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
    normaliseWorldMapIrelandUnitedKingdomFeatures(worldMapState.features);
    addSyntheticWorldMapFeatures(worldMapState.features);
    return worldMapState.features;
  })().catch(error=>{
    worldMapState.loadPromise = null;
    throw error;
  });

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

function normaliseWorldMapIrelandUnitedKingdomFeatures(features){
  const ireland = features.find(feature=>feature.properties && feature.properties.quizCountry === "Ireland");
  const uk = features.find(feature=>feature.properties && feature.properties.quizCountry === "United Kingdom");
  if(!ireland || !uk) return;

  const ukPolygons = getWorldMapFeaturePolygons(uk);
  const northernIreland = [];
  const remainingUk = [];
  for(const polygon of ukPolygons){
    if(isWorldMapNorthernIrelandPolygon(polygon)){
      northernIreland.push(polygon);
    }else{
      remainingUk.push(polygon);
    }
  }
  if(!northernIreland.length || !remainingUk.length) return;

  setWorldMapFeaturePolygons(uk, remainingUk);
  setWorldMapFeaturePolygons(ireland, [...getWorldMapFeaturePolygons(ireland), ...northernIreland]);
}

function getWorldMapFeaturePolygons(feature){
  const geometry = feature && feature.geometry ? feature.geometry : {};
  if(geometry.type === "Polygon") return [geometry.coordinates];
  if(geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function setWorldMapFeaturePolygons(feature, polygons){
  if(!feature || !feature.geometry || !Array.isArray(polygons) || !polygons.length) return;
  if(polygons.length === 1){
    feature.geometry = {...feature.geometry, type:"Polygon", coordinates:polygons[0]};
  }else{
    feature.geometry = {...feature.geometry, type:"MultiPolygon", coordinates:polygons};
  }
}

function isWorldMapNorthernIrelandPolygon(polygon){
  const bounds = getWorldMapPolygonGeoBounds(polygon);
  if(!bounds) return false;
  const centreLon = (bounds.left + bounds.right) / 2;
  const centreLat = (bounds.bottom + bounds.top) / 2;
  return centreLon > -8.6
    && centreLon < -5.2
    && centreLat > 53.9
    && centreLat < 55.6
    && bounds.right < -5.0;
}

function getWorldMapPolygonGeoBounds(polygon){
  if(!Array.isArray(polygon)) return null;
  let left = Infinity;
  let right = -Infinity;
  let bottom = Infinity;
  let top = -Infinity;
  let count = 0;
  for(const ring of polygon){
    if(!Array.isArray(ring)) continue;
    for(const point of ring){
      if(!Array.isArray(point) || point.length < 2) continue;
      const lon = Number(point[0]);
      const lat = Number(point[1]);
      if(!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      left = Math.min(left, lon);
      right = Math.max(right, lon);
      bottom = Math.min(bottom, lat);
      top = Math.max(top, lat);
      count += 1;
    }
  }
  return count ? {left, right, bottom, top} : null;
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

  const renderFeatures = getWorldMapRenderFeatures(features);
  const panels = resolveWorldMapPanelPlacements(getWorldMapPanels(), renderFeatures);
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
  const mainPanel = {
    id:`continent-${normalise(state.selectedContinent).replace(/\s+/g, "-") || "selected"}`,
    label:state.selectedContinent,
    x:0,
    y:0,
    width:WORLD_MAP_WIDTH,
    height:WORLD_MAP_HEIGHT,
    bounds,
    full:true
  };
  return [mainPanel, ...getWorldMapContinentDetailPanels(state.selectedContinent)];
}

function getWorldMapContinentDetailPanels(continent){
  const panels = typeof WORLD_MAP_CONTINENT_DETAIL_PANELS === "undefined"
    ? null
    : WORLD_MAP_CONTINENT_DETAIL_PANELS[continent];
  return Array.isArray(panels) ? panels : [];
}

function resolveWorldMapPanelPlacements(panels, features){
  if(!Array.isArray(panels) || panels.length <= 1) return panels;
  const [mainPanel, ...detailPanels] = panels;
  if(!mainPanel.full) return panels;

  const countryRects = getWorldMapBlockingCountryRects(features, mainPanel);
  const occupiedRects = [];
  const placedPanels = [mainPanel];
  for(const panel of detailPanels){
    const placedPanel = panel.autoPlace
      ? resolveWorldMapDetailPanelPlacement(panel, mainPanel, countryRects, occupiedRects)
      : panel;
    placedPanels.push(placedPanel);
    occupiedRects.push(getWorldMapPanelRect(placedPanel));
  }
  return placedPanels;
}

function getWorldMapBlockingCountryRects(features, mainPanel){
  const pool = new Set(state.session.pool || []);
  return features
    .filter(feature=>{
      const country = feature.properties.quizCountry;
      return country && pool.has(country);
    })
    .map(feature=>getWorldMapProjectedBounds(feature, mainPanel))
    .filter(Boolean)
    .map(bounds=>({
      left:bounds.left,
      top:bounds.top,
      right:bounds.right,
      bottom:bounds.bottom
    }));
}

function resolveWorldMapDetailPanelPlacement(panel, mainPanel, countryRects, occupiedRects){
  const candidates = getWorldMapCornerCandidates(panel, mainPanel);
  if(!candidates.length) return panel;
  const ranked = candidates
    .map((candidate, index)=>({
      ...candidate,
      index,
      score:getWorldMapPlacementScore(candidate.rect, countryRects, occupiedRects)
    }))
    .sort((left, right)=>
      left.score.occupiedCount - right.score.occupiedCount
      || left.score.countryCount - right.score.countryCount
      || left.score.countryArea - right.score.countryArea
      || left.index - right.index
    );
  const best = ranked[0];
  return {...panel, x:best.x, y:best.y};
}

function getWorldMapCornerCandidates(panel, mainPanel){
  const margin = Number.isFinite(panel.cornerMargin) ? panel.cornerMargin : 24;
  const corners = Array.isArray(panel.preferredCorners) && panel.preferredCorners.length
    ? panel.preferredCorners
    : ["bottom-left", "bottom-right", "top-left", "top-right"];
  const positions = {
    "bottom-left": {x:margin, y:mainPanel.height - panel.height - margin},
    "bottom-right": {x:mainPanel.width - panel.width - margin, y:mainPanel.height - panel.height - margin},
    "top-left": {x:margin, y:margin},
    "top-right": {x:mainPanel.width - panel.width - margin, y:margin}
  };
  return corners
    .map(corner=>positions[corner])
    .filter(Boolean)
    .map(position=>({
      x:position.x,
      y:position.y,
      rect:getWorldMapPanelRect({...panel, x:position.x, y:position.y})
    }));
}

function getWorldMapPanelRect(panel){
  return {
    left:panel.x,
    top:panel.y,
    right:panel.x + panel.width,
    bottom:panel.y + panel.height
  };
}

function getWorldMapPlacementScore(panelRect, countryRects, occupiedRects){
  const countryConflicts = countryRects
    .filter(rect=>worldMapRectsIntersect(panelRect, rect, 6));
  const occupiedCount = occupiedRects
    .filter(rect=>worldMapRectsIntersect(panelRect, rect, 10))
    .length;
  return {
    occupiedCount,
    countryCount:countryConflicts.length,
    countryArea:countryConflicts.reduce((total, rect)=>total + getWorldMapRectIntersectionArea(panelRect, rect), 0)
  };
}

function worldMapRectsIntersect(left, right, padding=0){
  return left.left - padding < right.right
    && left.right + padding > right.left
    && left.top - padding < right.bottom
    && left.bottom + padding > right.top;
}

function getWorldMapRectIntersectionArea(left, right){
  const overlapWidth = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  const overlapHeight = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return overlapWidth * overlapHeight;
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
    if(country === "Ireland"){
      drawUnifiedWorldMapIrelandCountry(mapLayer, feature, panel);
      continue;
    }
    const pathDataList = makeWorldMapPathList(feature, panel);
    if(!pathDataList.length) continue;

    for(const pathData of pathDataList){
      const ownerIsSolved = !!contextOwner && state.session.solved.has(contextOwner);
      const classCountry = country || contextOwner || null;
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

function drawUnifiedWorldMapIrelandCountry(mapLayer, feature, panel){
  const pathData = makeWorldMapPathList(feature, panel).join("");
  if(!pathData) return;
  const fillPath = svgNode("path", {
    class:getWorldMapCountryClass("Ireland"),
    d:pathData
  });
  fillPath.dataset.country = "Ireland";
  fillPath.dataset.panel = panel.id;
  fillPath.style.stroke = "none";
  if(state.session.solved.has("Ireland") && alpha2Overrides.Ireland){
    fillPath.style.fill = `url(#${getWorldMapPatternId("Ireland")})`;
  }
  rememberWorldMapCountryPath("Ireland", fillPath);
  mapLayer.appendChild(fillPath);

  const outlinePath = makeWorldMapExteriorOutlinePath(feature, panel);
  if(!outlinePath) return;
  const outline = svgNode("path", {
    class:`${getWorldMapCountryClass("Ireland")} is-ireland-outline`,
    d:outlinePath
  });
  outline.dataset.country = "Ireland";
  outline.dataset.panel = panel.id;
  rememberWorldMapCountryPath("Ireland", outline);
  mapLayer.appendChild(outline);
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

function makeWorldMapExteriorOutlinePath(feature, panel){
  const segmentCounts = new Map();
  const polygons = getWorldMapFeaturePolygons(feature);
  for(const polygon of polygons){
    for(const ring of polygon){
      for(let i=1;i<ring.length;i++){
        const key = getWorldMapSegmentKey(ring[i - 1], ring[i]);
        if(key) segmentCounts.set(key, (segmentCounts.get(key) || 0) + 1);
      }
    }
  }

  const segments = [];
  for(const polygon of polygons){
    for(const ring of polygon){
      for(let i=1;i<ring.length;i++){
        const start = ring[i - 1];
        const end = ring[i];
        const key = getWorldMapSegmentKey(start, end);
        if(!key || segmentCounts.get(key) !== 1) continue;
        const projectedStart = projectWorldMapPoint(start, panel);
        const projectedEnd = projectWorldMapPoint(end, panel);
        if(!projectedStart || !projectedEnd) continue;
        segments.push(`M${formatWorldMapNumber(projectedStart[0])},${formatWorldMapNumber(projectedStart[1])}L${formatWorldMapNumber(projectedEnd[0])},${formatWorldMapNumber(projectedEnd[1])}`);
      }
    }
  }
  return segments.join("");
}

function getWorldMapSegmentKey(start, end){
  const startKey = getWorldMapPointKey(start);
  const endKey = getWorldMapPointKey(end);
  if(!startKey || !endKey || startKey === endKey) return "";
  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
}

function getWorldMapPointKey(point){
  if(!Array.isArray(point) || point.length < 2) return "";
  const lon = Number(point[0]);
  const lat = Number(point[1]);
  if(!Number.isFinite(lon) || !Number.isFinite(lat)) return "";
  return `${lon.toFixed(5)},${lat.toFixed(5)}`;
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
    height:maxY - minY,
    left:minX,
    top:minY,
    right:maxX,
    bottom:maxY
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
    const isIrelandOutline = country === "Ireland" && path.classList.contains("is-ireland-outline");
    path.className.baseVal = isIrelandOutline
      ? `${getWorldMapCountryClass(country)} is-ireland-outline`
      : getWorldMapCountryClass(country);
    if(isIrelandOutline){
      path.style.fill = "none";
    }else{
      path.style.fill = getWorldMapSolvedBaseFill(country);
    }
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
  if(isRegionGame()){
    if(window.RegionMap && typeof window.RegionMap.updateProgress === "function"){
      window.RegionMap.updateProgress(state.selectedRegionGroup, {
        pool: state.session.pool,
        solved: state.session.solved
      });
    }
    return;
  }
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
    timerValue.textContent = "0:00.000";
    timerStatus.textContent = "Switch to Speedrun to start the clock.";
    updateWpmDisplay();
    return;
  }
  const session = state.session;
  timerValue.textContent = formatTime(getSpeedRunDisplayMs(session));
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
  updateWpmDisplay();
}

function updateWpmDisplay(){
  if(!wpmValue || !wpmStatus) return;
  if(state.playMode !== "speedrun"){
    wpmValue.textContent = "0.0";
    wpmStatus.textContent = "Switch to Speedrun to track typing pace.";
    return;
  }
  const session = state.session;
  const elapsedMs = getSpeedRunDisplayMs(session);
  const typedChars = getSpeedRunTypedChars(session);
  wpmValue.textContent = formatWpm(getSpeedRunWpm(session, elapsedMs));
  if(!session.pool.length){
    wpmStatus.textContent = "Choose a target with available questions.";
  }else if(session.speedRun.gaveUp || isTargetComplete()){
    wpmStatus.textContent = `Final speedrun WPM from ${typedChars} actual typed characters.`;
  }else if(session.speedRun.started){
    wpmStatus.textContent = `Speedrun WPM from ${typedChars} actual typed characters.`;
  }else{
    wpmStatus.textContent = "Starts with your first typed character.";
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
    const liveAll = target === "all" && state.session.speedRun.started ? getSpeedRunDisplayMs(state.session) : null;
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
  leaderboardTitle.textContent = `${modeLabel} - ${getCurrentSetLabel()} - ${difficulty} - ${getSpeedTargetLabel()}`;
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
  if(session.gameOver){
    if(resultModal && !resultModal.classList.contains("is-visible")){
      showResultModal(reason);
    }
    return;
  }

  session.gameOver = true;
  if(state.playMode === "speedrun" && reason === "complete"){
    try{
      const run = recordSpeedRun();
      state.lastCompletedRun = run;
      state.pendingSharedRun = buildPendingSharedRuns(run);
      if(state.pendingSharedRun) prepareSecureRunCompletion(session, run);
      try{
        queueCompletedRunAnalytics(run);
      }catch(error){
        console.error("Could not queue completed speedrun analytics.", error);
      }
    }catch(error){
      console.error("Could not record completed speedrun.", error);
      stopSpeedRun();
      state.pendingSharedRun = null;
      state.lastCompletedRun = null;
    }
  }else{
    stopSpeedRun();
    state.pendingSharedRun = null;
    state.lastCompletedRun = null;
  }

  if(state.playMode === "practice" && reason === "complete"){
    recordPracticePercentage();
  }

  disableInputs();
  updateAllStatus();
  showResultModal(reason);
}

function buildPendingSharedRuns(run){
  return run && run.isPersonalBest ? run : null;
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

function disableInputs(options={}){
  mcqBtns.forEach(button=>button.disabled = true);
  if(!options.preserveAnswerInput) answerInput.disabled = true;
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
  resultHero.classList.toggle("speedrun-result-hero", isSpeed);
  const pct = session.totalFirstAttempts
    ? Math.round((session.correctFirstTry / session.totalFirstAttempts) * 1000) / 10
    : 0;

  resultKicker.textContent = isSpeed ? "Speedrun" : "Practice";
  resultTitle.textContent = getResultTitle(reason);

  const finalTime = isSpeed && session.speedRun.started
    ? formatTime(getSpeedRunDisplayMs(session))
    : null;
  const finalWpm = isSpeed && session.speedRun.started
    ? formatWpm(getSpeedRunWpm(session, getSpeedRunDisplayMs(session)))
    : null;
  const finalMetrics = isSpeed && state.lastCompletedRun && state.lastCompletedRun.derivedMetrics
    ? state.lastCompletedRun.derivedMetrics
    : null;
  renderResultHero({
    time: finalTime,
    wpm: finalWpm,
    solved: `${session.solved.size}/${session.pool.length}`,
    accuracy: `${pct}%`,
    lives: !isSpeed && session.livesRemaining !== null ? String(session.livesRemaining) : null
  });
  resultSummary.textContent = isWorldMode()
    ? `${capitalise(getCurrentItemPluralLabel())} found: ${session.solved.size}/${session.pool.length}. Wrong guesses: ${session.worldWrongSubmissions}.`
    : `First-try accuracy: ${session.correctFirstTry}/${session.totalFirstAttempts || 0}.`;

  resultDetails.innerHTML = "";
  const details = [
    ["Mode", `${getModeLabel()} / ${state.hard ? "Typed" : "Normal"}`],
    [isRegionGame() ? "Country" : "Continent", getCurrentSetLabel()],
    isSpeed ? ["Target", getSpeedTargetLabel()] : ["Lives", state.lifeSetting === "unlimited" ? "Unlimited" : state.lifeSetting],
    isSpeed ? ["Speedrun WPM", finalWpm || "0.0"] : null,
    isSpeed && finalMetrics ? ["Canonical WPM", formatWpm(finalMetrics.effectiveCanonicalWpm)] : null,
    isSpeed && finalMetrics ? ["Active input WPM", formatWpm(finalMetrics.activeInputWpm)] : null,
    isSpeed && finalMetrics ? ["Adjusted WPM", `${formatWpm(finalMetrics.noShortcutAdjustedWpm)} estimated`] : null,
    isSpeed && finalMetrics ? ["Countries/min", formatMetric(finalMetrics.countriesPerMinute, 2)] : null,
    isSpeed && finalMetrics ? ["Shortcut use", formatPercent(finalMetrics.shortcutUsageRate)] : null,
    ["Skipped unresolved", session.skipped.size],
    ["Wrong at least once", session.incorrect.size]
  ].filter(Boolean);

  for(const [label, value] of details){
    appendResultDetail(label, value);
  }

  if(session.incorrect.size){
    appendResultDetail("Review", Array.from(session.incorrect).sort().join(", "), "is-review");
  }

  renderLeaderboardPublishPromptSafely(reason);
  resultDialogController.open();
  if(leaderboardPublish && !leaderboardPublish.hidden && resultPlayerNameInput && !resultPlayerNameInput.hidden){
    resultPlayerNameInput.focus();
  }else{
    resultRetry.focus();
  }
  renderDeviceProgressSummarySafely(isSpeed);
}

function renderLeaderboardPublishPromptSafely(reason){
  try{
    renderLeaderboardPublishPrompt(reason);
  }catch(error){
    console.error("Could not render leaderboard publish prompt.", error);
    if(leaderboardPublish) leaderboardPublish.hidden = true;
  }
}

function renderDeviceProgressSummarySafely(isSpeed){
  if(!isSpeed || isRegionGame()) return;
  try{
    renderDeviceProgressSummary();
  }catch(error){
    console.error("Could not render device progress summary.", error);
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
  if(items.wpm) entries.push(["WPM", items.wpm]);
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

function appendResultDetail(label, value, className=""){
  const item = document.createElement("p");
  if(className) item.className = className;
  const labelEl = document.createElement("span");
  labelEl.className = "result-detail-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("strong");
  valueEl.className = "result-detail-value";
  valueEl.textContent = String(value);
  item.append(labelEl, valueEl);
  resultDetails.appendChild(item);
}

function getCompletedRunCountryScope(record){
  const scope = new Set();
  const questions = Array.isArray(record && record.questionAnalytics) ? record.questionAnalytics : [];
  for(const question of questions){
    if(question && question.country) scope.add(question.country);
  }
  const route = Array.isArray(record && record.route) ? record.route : [];
  for(const entry of route){
    if(entry && entry.country) scope.add(entry.country);
  }
  return scope;
}

function completedRunRegionIsUsable(region){
  return !!region && region !== "All" && region !== "unknown";
}

function countryMatchesCompletedRunRegion(country, region, mode){
  if(!completedRunRegionIsUsable(region)) return true;
  if(mode === "world") return getWorldMapCountryContinents(country).includes(region);
  return countryContinent[country] === region;
}

function scopeMasteryToCompletedRun(mastery, latestRecord){
  const items = Array.isArray(mastery) ? mastery : [];
  const countryScope = getCompletedRunCountryScope(latestRecord);
  if(countryScope.size){
    return items.filter(item=>item && countryScope.has(item.country));
  }

  const region = latestRecord && latestRecord.region;
  const mode = latestRecord && latestRecord.mode;
  if(!completedRunRegionIsUsable(region)) return items;
  return items.filter(item=>item && countryMatchesCompletedRunRegion(item.country, region, mode));
}

function getAnalyticsRecordId(record){
  return String(record && (record.clientRunId || record.client_run_id || record.runId || record.run_id) || "");
}

function getCompletedRunSetIdentity(record){
  if(!record) return "";
  return record.setKey || normalise(String(record.setLabel || record.region || ""));
}

function getCompletedRunTargetIdentity(record){
  if(!record) return "";
  return String(record.target || record.targetLabel || "");
}

function completedAnalyticsRecordsShareContext(record, latestRecord, engine){
  const current = engine.normaliseRecord(record);
  return current.gameScope === latestRecord.gameScope
    && current.mode === latestRecord.mode
    && getCompletedRunSetIdentity(current) === getCompletedRunSetIdentity(latestRecord)
    && current.difficulty === latestRecord.difficulty
    && getCompletedRunTargetIdentity(current) === getCompletedRunTargetIdentity(latestRecord);
}

function getLatestCompletedAnalyticsRecord(history){
  const run = state.lastCompletedRun;
  if(!run || !run.telemetry || !run.telemetry.nonce) return null;
  const runId = String(run.telemetry.nonce);
  return history.find(item=>getAnalyticsRecordId(item) === runId) || buildCompletedRunAnalytics(run);
}

function getMatchingDeviceAnalyticsHistory(history, latestAnalytics, latestRecord, engine){
  const latestId = getAnalyticsRecordId(latestAnalytics);
  const matching = history.filter(item=>{
    try{
      return completedAnalyticsRecordsShareContext(item, latestRecord, engine);
    }catch{
      return false;
    }
  });
  if(latestAnalytics && (!latestId || !matching.some(item=>getAnalyticsRecordId(item) === latestId))){
    matching.push(latestAnalytics);
  }
  return matching;
}

function renderDeviceProgressSummary(){
  const history = getDeviceAnalyticsHistory();
  if(!window.SpeedrunAnalytics) return;
  const engine = window.SpeedrunAnalytics;
  const latest = getLatestCompletedAnalyticsRecord(history);
  if(!latest) return;
  const deviceNumber = getDeviceNumber();
  const latestRecord = engine.normaliseRecord(latest);
  const matchingHistory = getMatchingDeviceAnalyticsHistory(history, latest, latestRecord, engine);
  const mastery = engine.aggregateCountryMastery(matchingHistory);
  const latestMetrics = engine.deriveRunMetrics(latestRecord);
  const runScopedMastery = scopeMasteryToCompletedRun(mastery, latestRecord);
  const analysis = engine.generateRunAnalysis(latestRecord, latestMetrics, runScopedMastery);
  const needsRevision = runScopedMastery
    .filter(item=>item.masteryLevel === "Needs revision" || item.masteryLevel === "Error-prone")
    .slice(0, 5)
    .map(item=>item.country);
  const names = getDeviceKnownNames();

  const section = document.createElement("section");
  section.className = "device-progress-summary";

  const heading = document.createElement("h3");
  heading.textContent = "Your device progress";
  section.appendChild(heading);

  const facts = [
    `Device: ${deviceNumber}`,
    `Runs for this setup: ${matchingHistory.length}`,
    names.length ? `Names on this device: ${names.join(", ")}` : null,
    `Median solve: ${formatTimeCompact(latestMetrics.medianFinalSolveMs)}`,
    `Data quality: ${latestMetrics.dataQualityScore}/100`
  ].filter(Boolean);
  for(const fact of facts){
    const p = document.createElement("p");
    p.textContent = fact;
    section.appendChild(p);
  }

  const recommendation = (analysis.recommendations || [])[0]
    || (needsRevision.length ? `Revision targets: ${needsRevision.join(", ")}.` : "");
  if(recommendation){
    const p = document.createElement("p");
    p.textContent = recommendation;
    section.appendChild(p);
  }
  resultDetails.appendChild(section);
}

function getResultTitle(reason){
  if(reason === "gameover") return "Game over";
  if(reason === "giveup") return "Run ended";
  if(state.playMode === "speedrun") return "Speedrun complete";
  return "Practice complete";
}

function closeResultModal(){
  resultDialogController.close();
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
  return QuizUI.formatTime(ms);
}

function formatTimeCompact(ms){
  const value = Number(ms);
  if(!Number.isFinite(value)) return "unknown";
  return value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, "")}s` : `${Math.round(value)}ms`;
}

function formatWpm(value){
  const wpm = Number(value);
  if(!Number.isFinite(wpm) || wpm <= 0) return "0.0";
  return wpm >= 100 ? String(Math.round(wpm)) : wpm.toFixed(1);
}

function formatMetric(value, decimals=1){
  const number = Number(value);
  if(!Number.isFinite(number)) return "-";
  return number.toFixed(decimals).replace(/\.?0+$/, "");
}

function formatPercent(value){
  const number = Number(value);
  if(!Number.isFinite(number)) return "0%";
  return `${(number * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

function roundMetric(value, decimals=1){
  const number = Number(value);
  if(!Number.isFinite(number)) return 0;
  const factor = 10 ** decimals;
  return Math.round(number * factor) / factor;
}

function isRevisionMode(){
  return state.selectedContinent === "Revise" || state.selectedContinent === "Revise Capitals";
}

function isRegionGame(){
  return state.gameScope === "regions";
}

function isWorldMode(){
  return state.which === "world";
}

function getModeLabel(which=state.which){
  if(isRegionGame()){
    const group = getRegionGroupConfig();
    if(which === "capitals") return capitalise(group.capitalPluralLabel);
    if(which === "world") return group.listMapLabel || "List Map";
    return `${capitalise(group.itemLabel)} Flags`;
  }
  if(which === "capitals") return "Capitals";
  if(which === "world") return "Countries";
  return "Flags";
}

function getGameScopeKey(){
  return isRegionGame() ? "regions" : "countries";
}

function getRegionGroupConfig(){
  return REGION_GAME_GROUPS[state.selectedRegionGroup] || REGION_GAME_GROUPS[DEFAULT_REGION_GAME_GROUP];
}

function normaliseCurrentAnswer(value){
  return isRegionGame() ? normaliseRegionAnswer(value, state.selectedRegionGroup) : normalise(value);
}

function normaliseRegionAnswer(value, groupKey=state.selectedRegionGroup){
  const group = REGION_GAME_GROUPS[groupKey] || {};
  if(!group.strictDiacritics) return normalise(value);
  return String(value || "")
    .toLocaleLowerCase(group.answerLanguage || undefined)
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function regionAnswersEqual(left, right, groupKey=state.selectedRegionGroup){
  return normaliseRegionAnswer(left, groupKey) === normaliseRegionAnswer(right, groupKey);
}

function isCurrentRegionStrictDiacriticMode(){
  return isRegionGame() && !!getRegionGroupConfig().strictDiacritics;
}

function getRegionItems(groupKey=state.selectedRegionGroup){
  const group = REGION_GAME_GROUPS[groupKey] || REGION_GAME_GROUPS[DEFAULT_REGION_GAME_GROUP];
  return Array.isArray(group.items) ? group.items : [];
}

function getRegionItemNames(groupKey=state.selectedRegionGroup){
  return getRegionItems(groupKey).map(item=>item.name);
}

function getRegionQuestionItemNames(groupKey=state.selectedRegionGroup, mode=state.which){
  const group = REGION_GAME_GROUPS[groupKey] || REGION_GAME_GROUPS[DEFAULT_REGION_GAME_GROUP];
  const items = getRegionItems(groupKey);
  if(mode !== "flags") return items.map(item=>item.name);
  return items.filter(item=>regionItemHasFlag(group, item)).map(item=>item.name);
}

function getRegionFlagItemCount(groupKey=state.selectedRegionGroup){
  const group = REGION_GAME_GROUPS[groupKey] || REGION_GAME_GROUPS[DEFAULT_REGION_GAME_GROUP];
  return getRegionItems(groupKey).filter(item=>regionItemHasFlag(group, item)).length;
}

function isRegionModeAvailable(mode=state.which, groupKey=state.selectedRegionGroup){
  return !isRegionGame() || mode !== "flags" || getRegionFlagItemCount(groupKey) > 0;
}

function ensureAvailableRegionMode(){
  if(isRegionModeAvailable()) return false;
  state.which = "capitals";
  return true;
}

function getUnavailableRegionFlagsMessage(groupKey=state.selectedRegionGroup){
  const group = REGION_GAME_GROUPS[groupKey] || REGION_GAME_GROUPS[DEFAULT_REGION_GAME_GROUP];
  return `${group.label} has no verified regional flag assets yet. Use ${getShortRegionCapitalButtonLabel(group).toLowerCase()} or map mode.`;
}

function regionItemHasFlag(group, item){
  if(!group || !item) return false;
  return !!(
    item.flagUrl
    || item.flagFile
    || group.flagFileTemplate
    || group.key === "United States"
    || (Array.isArray(item.colours) && item.colours.length)
  );
}

function getRegionItemByName(name, groupKey=state.selectedRegionGroup){
  const key = normalise(name);
  return getRegionItems(groupKey).find(item=>normalise(item.name) === key) || null;
}

function getRegionCapital(itemName){
  const item = getRegionItemByName(itemName);
  return item ? item.capital : "";
}

function getRegionAliases(itemName){
  const item = getRegionItemByName(itemName);
  return item && Array.isArray(item.aliases) ? item.aliases : [];
}

function getRegionCapitalAliases(itemName){
  const item = getRegionItemByName(itemName);
  return item && Array.isArray(item.capitalAliases) ? item.capitalAliases : [];
}

function getCurrentReviseList(kind){
  if(isRegionGame()){
    const store = kind === "flags" ? state.reviseRegionFlags : state.reviseRegionCapitals;
    const list = store && Array.isArray(store[state.selectedRegionGroup]) ? store[state.selectedRegionGroup] : [];
    return list;
  }
  return kind === "flags" ? state.reviseFlags : state.reviseCapitals;
}

function getCurrentReviseStorageKey(kind){
  if(isRegionGame()) return kind === "flags" ? LS_KEYS.reviseRegionFlags : LS_KEYS.reviseRegionCapitals;
  return kind === "flags" ? LS_KEYS.reviseFlags : LS_KEYS.reviseCapitals;
}

function getCurrentSetLabel(){
  if(!isRegionGame()) return state.selectedContinent;
  const group = getRegionGroupConfig();
  if(state.selectedContinent === "Revise") return `${group.label} - Revise ${group.itemPluralLabel}`;
  if(state.selectedContinent === "Revise Capitals") return `${group.label} - Revise ${group.capitalPluralLabel}`;
  return group.label;
}

function getCurrentSetKey(){
  return normalise(getCurrentSetLabel()).replace(/\s+/g, "-") || "all";
}

function getCurrentItemLabel(){
  return isRegionGame() ? getRegionGroupConfig().itemLabel : "country";
}

function getCurrentItemPluralLabel(){
  return isRegionGame() ? getRegionGroupConfig().itemPluralLabel : "countries";
}

function getCapitalQuestionText(itemName){
  if(isRegionGame()){
    const group = getRegionGroupConfig();
    return `What is the ${group.capitalLabel} of ${itemName}?`;
  }
  return `What is the capital of ${itemName}?`;
}

function capitalise(value){
  const text = String(value || "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "";
}

document.addEventListener("DOMContentLoaded", init);
