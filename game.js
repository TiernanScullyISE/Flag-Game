const ANSWER_FLASH_MS = 100;
const TIMER_TICK_MS = 100;
const SPEEDRUN_SPLITS = [10, 25, 50, 100, 150];
const MAX_LEADERBOARD_RUNS = 5;

const state = {
  playMode: "practice",
  which: "flags",
  hard: false,
  selectedContinent: "All",
  lifeSetting: "unlimited",
  speedTarget: "all",

  reviseFlags: storage.get(LS_KEYS.reviseFlags, []),
  reviseCapitals: storage.get(LS_KEYS.reviseCapitals, []),
  highScores: storage.get(LS_KEYS.highScores, {}),
  sessionPercentages: storage.get(LS_KEYS.sessionPercentages, {}),
  speedRuns: storage.get(LS_KEYS.speedRuns, {}),

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

  mcqBtns.forEach((button,index)=>button.addEventListener("click",()=>checkMcq(index)));
  submitBtn.addEventListener("click", ()=>checkText());
  answerInput.addEventListener("keydown", event=>{ if(event.key==="Enter") checkText(); });
  reviseToggle.addEventListener("click", ()=>toggleRevise());
  lastBtn.addEventListener("click", ()=>lastQuestion());
  nextBtn.addEventListener("click", ()=>nextQuestion());
  giveupBtn.addEventListener("click", ()=>giveUp());
  resultRetry.addEventListener("click", ()=>{
    closeResultModal();
    resetSession();
  });
  resultClose.addEventListener("click", closeResultModal);

  syncModeButtons();
  populateContinents();
  populateSpeedTargets();
  resetSession();
}

function syncModeButtons(){
  if(state.playMode === "speedrun") state.hard = true;
  document.body.dataset.playMode = state.playMode;
  playModeButtons.forEach(button=>button.classList.toggle("active", button.dataset.playMode === state.playMode));
  quizButtons.forEach(button=>button.classList.toggle("active", button.dataset.mode === state.which));
  hardToggle.checked = state.hard;
  hardToggle.disabled = state.playMode === "speedrun";
  hardLabel.textContent = state.playMode === "speedrun" ? "Hard mode required" : "Hard mode";
  lifeSelect.value = state.lifeSetting;
  speedTargetSelect.value = state.speedTarget;
}

function populateContinents(){
  const continents = Array.from(new Set(Object.values(countryContinent))).sort();
  const options = state.playMode === "speedrun"
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
  const targets = SPEEDRUN_SPLITS
    .filter(split=>split <= max)
    .map(split=>({value:String(split), label:`First ${split}`}));
  targets.push({value:"all", label:`All available (${max})`});

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
  return countries.filter(country=>countryContinent[country]===state.selectedContinent);
}

function resetSession(){
  stopSpeedRun();
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
    pool = countries.filter(country=>countryContinent[country]===state.selectedContinent);
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

function toggleAnswerUi(){
  mcq.style.display = state.hard ? "none" : "grid";
  textWrap.style.display = state.hard ? "flex" : "none";
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
    mcqBtns.forEach(button=>button.disabled = true);
    handleCorrect(firstAttempt);
  }else{
    handleIncorrect(firstAttempt);
  }
}

function checkText(){
  const session = state.session;
  if(session.gameOver || !session.correctCountry) return;
  const value = answerInput.value.trim();
  if(!value) return;

  const firstAttempt = registerAttempt();
  const correct = getCorrectAnswer();
  const exact = normalise(value) === normalise(correct);
  const aliasOk = isAlias(value);

  if(exact || aliasOk || fuzzyMatch(value, correct)){
    answerInput.disabled = true;
    submitBtn.disabled = true;
    handleCorrect(firstAttempt, exact || aliasOk ? "Correct!" : "Correct! (Close enough)");
    return;
  }

  handleIncorrect(firstAttempt);
  answerInput.select();
}

function getCorrectAnswer(){
  return state.which === "flags" ? state.session.correctCountry : state.session.correctAnswer;
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
  if(session.gameOver || !session.correctCountry) return;
  if(!session.solved.has(session.correctCountry)){
    session.skipped.add(session.correctCountry);
    if(session.history.length && session.history[session.history.length-1] === session.correctCountry){
      session.history.pop();
    }
  }
  loadQuestion();
}

async function lastQuestion(){
  const session = state.session;
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
  if(state.playMode !== "practice" || !session.correctCountry) return;
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
  if(state.playMode !== "speedrun" || session.speedRun.recorded || session.speedRun.gaveUp || !isTargetComplete()) return;
  stopSpeedRun();
  const elapsed = session.speedRun.elapsedMs || getElapsedMs();
  session.speedRun.splits.all = elapsed;
  session.speedRun.recorded = true;

  const key = getSpeedRunKey();
  const record = state.speedRuns[key] || {bestSplits:{}, runs:[]};
  record.bestSplits = record.bestSplits || {};
  record.runs = Array.isArray(record.runs) ? record.runs : [];

  for(const [label, value] of Object.entries(session.speedRun.splits)){
    if(!record.bestSplits[label] || value < record.bestSplits[label]){
      record.bestSplits[label] = Math.round(value);
    }
  }

  record.runs.push({
    timeMs: Math.round(elapsed),
    date: new Date().toISOString(),
    correct: session.correctFirstTry,
    total: session.pool.length,
    target: getSpeedTargetLabel()
  });
  record.runs.sort((left,right)=>left.timeMs-right.timeMs);
  record.runs = record.runs.slice(0, MAX_LEADERBOARD_RUNS);

  state.speedRuns[key] = record;
  storage.set(LS_KEYS.speedRuns, state.speedRuns);
}

function getPracticeKey(){
  return `${state.which}_${state.selectedContinent}_${state.hard ? "hard" : "normal"}_${state.lifeSetting}`;
}

function getSpeedRunKey(){
  return `${state.which}_${state.selectedContinent}_${state.hard ? "hard" : "normal"}_${state.speedTarget}`;
}

function getSpeedTargetLabel(){
  return state.speedTarget === "all" ? "All" : `First ${state.speedTarget}`;
}

function getSpeedRunSplitTargets(){
  if(state.playMode !== "speedrun" || !state.session.pool.length) return [];
  const finish = state.session.pool.length;
  const targets = SPEEDRUN_SPLITS.filter(split=>split <= finish);
  if(!targets.includes(finish) && state.speedTarget !== "all") targets.push(finish);
  targets.push("all");
  return targets;
}

function updateAllStatus(){
  updateScoreTexts();
  updateSessionText();
  updateLivesDisplay();
  updateTimerDisplay();
  renderSplits();
  renderLeaderboard();
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
    timerStatus.textContent = "Starts on your first answer.";
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
  const modeLabel = state.which === "flags" ? "Flags" : "Capitals";
  const difficulty = state.hard ? "Hard" : "Normal";
  leaderboardTitle.textContent = `${modeLabel} - ${state.selectedContinent} - ${difficulty} - ${getSpeedTargetLabel()}`;

  if(state.playMode !== "speedrun"){
    leaderboardList.appendChild(emptyMini("Speedrun leaderboards are shown in Speedrun mode."));
    return;
  }

  const record = state.speedRuns[getSpeedRunKey()];
  if(!record || !record.runs || record.runs.length === 0){
    leaderboardList.appendChild(emptyMini("No completed runs yet for this exact setup."));
    return;
  }

  record.runs.forEach((run,index)=>{
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    const rank = document.createElement("strong");
    rank.textContent = `#${index+1}`;
    const time = document.createElement("span");
    time.textContent = formatTime(run.timeMs);
    const meta = document.createElement("span");
    const date = run.date ? new Date(run.date).toLocaleDateString() : "";
    meta.textContent = `${run.correct}/${run.total} first-try${date ? ` - ${date}` : ""}`;
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
    recordSpeedRun();
  }else{
    stopSpeedRun();
  }

  if(state.playMode === "practice" && reason === "complete"){
    recordPracticePercentage();
  }

  session.gameOver = true;
  disableInputs();
  updateAllStatus();
  showResultModal(reason);
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
  resultSummary.textContent = `First-try accuracy: ${session.correctFirstTry}/${session.totalFirstAttempts || 0}.`;

  resultDetails.innerHTML = "";
  const details = [
    `Mode: ${state.which === "flags" ? "Flags" : "Capitals"} / ${state.hard ? "Hard" : "Normal"}`,
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

  resultModal.classList.add("is-visible");
  resultModal.setAttribute("aria-hidden", "false");
  resultRetry.focus();
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
  answerFlash.textContent = ok ? "CORRECT" : "INCORRECT";
  answerFlash.className = `answer-flash ${ok ? "is-correct" : "is-incorrect"} is-visible`;
  answerFlash.setAttribute("aria-hidden", "false");
  setTimeout(()=>{
    answerFlash.classList.remove("is-visible");
    answerFlash.setAttribute("aria-hidden", "true");
  }, ANSWER_FLASH_MS);
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

document.addEventListener("DOMContentLoaded", init);
