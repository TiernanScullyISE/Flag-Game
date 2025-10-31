/* State specific to the game window */
const state = {
  which: "flags", // "flags" or "capitals"
  hard: false,
  selectedContinent: "All",

  reviseFlags: storage.get(LS_KEYS.reviseFlags, []),
  reviseCapitals: storage.get(LS_KEYS.reviseCapitals, []),
  highScores: storage.get(LS_KEYS.highScores, {}),
  sessionPercentages: storage.get(LS_KEYS.sessionPercentages, {}),

  flags: makeQuizState(),
  capitals: makeQuizState()
};

function makeQuizState(){
  return {
    correctCountry: null,
    correctAnswer: null,
    currentPool: [],
    sessionAnswered: new Set(),
    sessionSkipped: new Set(),
    sessionIncorrect: new Set(),
    sessionCorrect: 0,
    sessionTotal: 0,
    streak: 0,
    questionAnswered: false,
    history: []
  };
}

/* DOM refs */
const segmentButtons = Array.from(document.querySelectorAll(".segment"));
const continentSelect = document.getElementById("continent-select");
const hardToggle = document.getElementById("hard-toggle");
const reviseToggle = document.getElementById("revise-toggle");

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
const session = document.getElementById("session");

const lastBtn = document.getElementById("last-btn");
const nextBtn = document.getElementById("next-btn");

/* Init */
function init(){
  // segments
  segmentButtons.forEach(b=>{
    b.addEventListener("click", ()=>{
      segmentButtons.forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      state.which = b.dataset.mode;
      state.selectedContinent = "All";
      hardToggle.checked = false;
      state.hard = false;
      populateContinents();
      resetSession();
    });
  });

  // continents
  populateContinents();
  continentSelect.addEventListener("change", ()=>{
    state.selectedContinent = continentSelect.value;
    toggleHardUI();
    resetSession();
  });

  // hard
  hardToggle.addEventListener("change", ()=>{
    state.hard = hardToggle.checked;
    toggleHardUI();
    if(!state.hard) setupMcq();
  });

  // MCQ
  mcqBtns.forEach((b,i)=>b.addEventListener("click",()=>checkMcq(i)));

  // text answer
  submitBtn.addEventListener("click", ()=>checkText());
  answerInput.addEventListener("keydown", e=>{ if(e.key==="Enter") checkText(); });
  giveupBtn.addEventListener("click", ()=>giveUp());

  // nav
  lastBtn.addEventListener("click", ()=>lastQuestion());
  nextBtn.addEventListener("click", ()=>nextQuestion());

  // revise
  reviseToggle.addEventListener("click", ()=>toggleRevise());

  // first question
  loadQuestion();
  toggleHardUI();
}
function populateContinents(){
  const continents = Array.from(new Set(Object.values(countryContinent))).sort();
  const opts = state.which==="flags"
    ? ["All", ...continents, "Revise"]
    : ["All", ...continents, "Revise Capitals"];
  continentSelect.innerHTML = "";
  for(const v of opts){
    const o=document.createElement("option");
    o.value=v; o.textContent=v;
    continentSelect.appendChild(o);
  }
  continentSelect.value="All";
}
function toggleHardUI(){
  const hard = state.hard;
  mcq.style.display = hard ? "none" : "grid";
  textWrap.style.display = hard ? "flex" : "none";
}

/* Question loading */
async function loadQuestion(){
  clearFeedback();
  const s = state[state.which];

  // build pool
  if(s.currentPool.length===0){
    const c = state.selectedContinent;
    if(c==="Revise"){
      s.currentPool = [...state.reviseFlags];
    }else if(c==="Revise Capitals"){
      s.currentPool = [...state.reviseCapitals];
    }else if(c==="All"){
      s.currentPool = [...countries];
    }else{
      s.currentPool = countries.filter(x=>countryContinent[x]===c);
    }
  }

  // unanswered
  let un = s.currentPool.filter(x=>!s.sessionAnswered.has(x));
  if(un.length===0 && s.sessionSkipped.size>0){
    un = Array.from(s.sessionSkipped);
    s.sessionSkipped.clear();
  }

  if(un.length===0){
    if(s.sessionTotal>0){ return showSessionResults(); }
    renderEmpty();
    return;
  }

  s.correctCountry = un[(Math.random()*un.length)|0];
  s.history.push(s.correctCountry);
  s.questionAnswered = false;

  if(state.which==="flags"){
    s.correctAnswer = s.correctCountry;
    await renderFlag(s.correctCountry);
    countryLabel.textContent = "";
  }else{
    s.correctAnswer = countryCapitals[s.correctCountry] || "Unknown";
    await renderFlag(s.correctCountry);
    countryLabel.textContent = `What is the capital of ${s.correctCountry}?`;
  }

  updateReviseButton();
  updateSessionText();
  updateScoreTexts();

  if(state.hard){
    answerInput.value=""; answerInput.disabled=false; submitBtn.disabled=false; answerInput.focus();
  }else{
    setupMcq();
  }
  lastBtn.disabled = s.history.length<=1;
}

async function renderFlag(country){
  questionVisual.innerHTML = "";
  const holder=document.createElement("div");
  holder.style.minHeight="214px";
  holder.style.display="grid";
  holder.style.placeItems="center";
  questionVisual.appendChild(holder);
  const img = await createFlagImg(country, 330, `Flag of ${country}`);
  holder.innerHTML="";
  holder.appendChild(img);
}

function renderEmpty(){
  questionVisual.innerHTML = `<div class="flag-fallback" style="width:330px;height:206px;display:grid;place-items:center">No items available.</div>`;
  mcqBtns.forEach(b=>{ b.textContent=""; b.disabled=true; });
  answerInput.disabled=true; submitBtn.disabled=true;
}

/* MCQ */
function setupMcq(){
  const s = state[state.which];
  if(!s.correctCountry || s.currentPool.length===0) return;

  let options, pool;
  if(state.which==="flags"){
    options=[s.correctCountry];
    pool=s.currentPool;
  }else{
    options=[s.correctAnswer];
    pool=s.currentPool.map(c=>countryCapitals[c]).filter(Boolean);
  }
  while(options.length<4 && options.length<pool.length){
    const c = pool[(Math.random()*pool.length)|0];
    if(!options.includes(c)) options.push(c);
  }
  shuffle(options);
  mcqBtns.forEach((btn,i)=>{
    if(i<options.length){
      btn.textContent=options[i];
      btn.disabled=false; btn.style.opacity="1";
    }else{
      btn.textContent=""; btn.disabled=true; btn.style.opacity=".6";
    }
  });
}
function checkMcq(index){
  const s = state[state.which];
  const selected = mcqBtns[index].textContent;
  s.questionAnswered = true;

  const first = !s.sessionAnswered.has(s.correctCountry);
  if(first){
    s.sessionTotal += 1;
    s.sessionAnswered.add(s.correctCountry);
  }

  const correct = state.which==="flags" ? s.correctCountry : s.correctAnswer;
  if(selected === correct){
    setFeedback("Correct!", true);
    mcqBtns.forEach(b=>b.disabled=true);
    if(first){ s.streak += 1; s.sessionCorrect += 1; }
    updateScoresAndAdvance();
  }else{
    setFeedback("Incorrect. Try again.", false);
    s.streak = 0;
    if(first) s.sessionIncorrect.add(s.correctCountry);
    updateScoreTexts();
  }
}

/* Text answers */
function checkText(){
  const s = state[state.which];
  const val = answerInput.value.trim();
  if(!val) return;

  s.questionAnswered = true;
  const first = !s.sessionAnswered.has(s.correctCountry);
  if(first){
    s.sessionTotal += 1;
    s.sessionAnswered.add(s.correctCountry);
  }

  const correct = state.which==="flags" ? s.correctCountry : s.correctAnswer;

  const aliasOk = state.which==="flags"
    ? !!(countryAliases[s.correctCountry] && countryAliases[s.correctCountry].some(a=>normalise(a)===normalise(val)))
    : !!(capitalAliases[s.correctAnswer] && capitalAliases[s.correctAnswer].some(a=>normalise(a)===normalise(val)));

  if(normalise(val)===normalise(correct) || aliasOk){
    setFeedback("Correct!", true);
    answerInput.disabled=true; submitBtn.disabled=true;
    if(first){ s.streak += 1; s.sessionCorrect += 1; }
    return updateScoresAndAdvance();
  }

  if(fuzzyMatch(val, correct)){
    setFeedback("Correct! (Close enough)", true);
    answerInput.disabled=true; submitBtn.disabled=true;
    if(first){ s.streak += 1; s.sessionCorrect += 1; }
    return updateScoresAndAdvance();
  }

  setFeedback("Incorrect. Try again.", false);
  s.streak = 0;
  if(first) s.sessionIncorrect.add(s.correctCountry);
  updateScoreTexts();
  answerInput.select();
}

/* Scores and records */
function getModeKey(){
  const hardSuffix = state.hard ? "_hard" : "_normal";
  return `${state.which}_${state.selectedContinent}${hardSuffix}`;
}
function updateScoresAndAdvance(){
  const s = state[state.which];
  const key = getModeKey();
  const high = state.highScores[key] || 0;
  if(s.streak > high){
    state.highScores[key] = s.streak;
    storage.set(LS_KEYS.highScores, state.highScores);
  }
  updateScoreTexts();

  const inRevise = state.selectedContinent==="Revise" || state.selectedContinent==="Revise Capitals";
  if(!inRevise){
    setTimeout(()=>loadQuestion(), 200);
  }else{
    answerInput.value=""; answerInput.disabled=false; submitBtn.disabled=false; answerInput.focus();
  }
}
function updateScoreTexts(){
  const s = state[state.which];
  const key = getModeKey();
  const high = state.highScores[key] || 0;
  const disp = `${state.selectedContinent} (${state.hard ? "H" : "N"})`;
  score.textContent = `Streak: ${s.streak} | High: ${high} (${disp})`;

  const bestPct = state.sessionPercentages[key] || 0;
  best.textContent = `Best Session: ${bestPct}% (${disp})`;
}
function updateSessionText(){
  const s = state[state.which];
  if(s.currentPool.length){
    const answered = s.sessionAnswered.size;
    const total = s.currentPool.length;
    session.textContent = `Progress: ${answered}/${total} | Remaining: ${total - answered}`;
  }else{
    session.textContent = "";
  }
}

/* Session lifecycle */
function resetSession(){
  state[state.which] = makeQuizState();
  clearFeedback();
  updateSessionText();
  loadQuestion();
}
function showSessionResults(){
  const s = state[state.which];
  const pct = Math.round((s.sessionCorrect / s.sessionTotal) * 1000) / 10;
  const key = getModeKey();
  const old = state.sessionPercentages[key] || 0;
  let note = "";
  if(pct > old){
    state.sessionPercentages[key] = pct;
    storage.set(LS_KEYS.sessionPercentages, state.sessionPercentages);
    note = "  NEW PERCENTAGE RECORD!";
  }else{
    note = `  (Best: ${old}%)`;
  }
  let wrong = "";
  if(s.sessionIncorrect.size){
    wrong = "\n\nGot these wrong:\n• " + Array.from(s.sessionIncorrect).sort().join("\n• ");
  }
  alert(`Session Complete!\nCorrect: ${s.sessionCorrect}/${s.sessionTotal} (${pct}%)${note}${wrong}\n\nOK = Play this mode again.`);
  resetSession();
}

/* Navigation */
function nextQuestion(){
  const s = state[state.which];
  if(!s.questionAnswered && s.correctCountry){
    s.sessionSkipped.add(s.correctCountry);
    if(s.history.length && s.history[s.history.length-1]===s.correctCountry){ s.history.pop(); }
  }
  loadQuestion();
}
async function lastQuestion(){
  const s = state[state.which];
  if(s.history.length<2) return;
  s.history.pop();
  const prev = s.history.pop();
  s.correctCountry = prev;
  s.questionAnswered = false;

  if(state.which==="flags"){
    s.correctAnswer = s.correctCountry;
    await renderFlag(s.correctCountry);
    countryLabel.textContent = "";
  }else{
    s.correctAnswer = countryCapitals[s.correctCountry] || "Unknown";
    await renderFlag(s.correctCountry);
    countryLabel.textContent = `What is the capital of ${s.correctCountry}?`;
  }
  s.history.push(s.correctCountry);
  updateReviseButton();
  updateSessionText();
  clearFeedback();
  if(state.hard){
    answerInput.value=""; answerInput.disabled=false; submitBtn.disabled=false; answerInput.focus();
  }else{
    setupMcq();
  }
}

/* Revise */
function updateReviseButton(){
  const s = state[state.which];
  const list = state.which==="flags" ? state.reviseFlags : state.reviseCapitals;
  reviseToggle.textContent = s.correctCountry && list.includes(s.correctCountry)
    ? "Remove from Revise"
    : "Add to Revise";
}
function toggleRevise(){
  const s = state[state.which];
  if(!s.correctCountry) return;
  const list = state.which==="flags" ? state.reviseFlags : state.reviseCapitals;
  const key = state.which==="flags" ? LS_KEYS.reviseFlags : LS_KEYS.reviseCapitals;

  const i = list.indexOf(s.correctCountry);
  if(i>=0){
    list.splice(i,1);
    setReviseFeedback(false);
  }else{
    list.push(s.correctCountry);
    setReviseFeedback(true);
  }
  storage.set(key, list);
  updateReviseButton();
  setTimeout(()=>{ reviseFeedback.textContent=""; }, 3000);
}

/* Give up */
function giveUp(){
  const s = state[state.which];
  if(s.currentPool.length===0){ renderEmpty(); return; }
  const un = s.currentPool.filter(x=>!s.sessionAnswered.has(x));
  for(const item of un){
    s.sessionIncorrect.add(item);
    s.sessionTotal += 1;
    s.sessionAnswered.add(item);
  }
  s.streak = 0;
  showSessionResults();
}

/* Feedback helpers */
function setFeedback(text, ok){
  feedback.textContent = text;
  feedback.classList.remove("ok","err");
  feedback.classList.add(ok?"ok":"err");
}
function setReviseFeedback(added){
  const s = state[state.which];
  if(state.hard){
    reviseFeedback.textContent = added ? "Added to Revise list." : "Removed from Revise list.";
  }else{
    const c = s.correctCountry || "";
    reviseFeedback.textContent = added ? `Added ${c} to Revise list.` : `Removed ${c} from Revise list.`;
  }
}
function clearFeedback(){
  feedback.textContent=""; feedback.classList.remove("ok","err");
  reviseFeedback.textContent="";
}

/* Boot */
document.addEventListener("DOMContentLoaded", init);
