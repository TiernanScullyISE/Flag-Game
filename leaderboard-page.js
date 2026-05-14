const PAGE_SPEEDRUN_SPLITS = [10, 25, 50, 100, 150];
const PAGE_TOP_RUNS = 5;
const FETCH_LIMIT = 5000;

const leaderboardPageState = {
  categories: [],
  runsByKey: new Map(),
  runLimitByKey: new Map(),
  loading: false,
  error: ""
};

const modeFilter = document.getElementById("leaderboard-mode");
const continentFilter = document.getElementById("leaderboard-continent");
const targetFilter = document.getElementById("leaderboard-target");
const withScoresFilter = document.getElementById("leaderboard-with-scores");
const refreshBtn = document.getElementById("leaderboard-refresh");
const statusEl = document.getElementById("leaderboard-page-status");
const gridEl = document.getElementById("leaderboard-page-grid");

function initLeaderboardPage(){
  leaderboardPageState.categories = buildLeaderboardCategories();
  populateContinentFilter();

  modeFilter.addEventListener("change", renderLeaderboardPage);
  continentFilter.addEventListener("change", renderLeaderboardPage);
  targetFilter.addEventListener("change", renderLeaderboardPage);
  withScoresFilter.addEventListener("change", renderLeaderboardPage);
  refreshBtn.addEventListener("click", loadSharedLeaderboards);

  loadSharedLeaderboards();
}

function populateContinentFilter(){
  const continents = getLeaderboardContinents();
  continentFilter.innerHTML = "";
  for(const value of ["all", ...continents]){
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value === "all" ? "All continents" : value;
    continentFilter.appendChild(option);
  }
}

function getLeaderboardContinents(){
  return Array.from(new Set(Object.values(countryContinent))).sort();
}

function buildLeaderboardCategories(){
  const continents = ["All", ...getLeaderboardContinents()];
  const categories = [];

  for(const which of ["flags", "capitals", "world"]){
    for(const continent of continents){
      const max = getCategoryPoolSize(continent, which);
      const targets = PAGE_SPEEDRUN_SPLITS
        .filter(split=>split <= max)
        .map(split=>String(split));
      targets.push("all");

      for(const target of targets){
        categories.push({
          key: `${which}_${continent}_hard_${target}`,
          which,
          continent,
          target,
          modeLabel: getLeaderboardModeLabel(which),
          targetLabel: target === "all" ? `All available (${max})` : `First ${target}`
        });
      }
    }
  }

  return categories;
}

function getLeaderboardModeLabel(which){
  if(which === "capitals") return "Capitals";
  if(which === "world") return "Countries";
  return "Flags";
}

function getCategoryPoolSize(continent, which="flags"){
  if(continent === "All") return countries.length;
  return countries.filter(country=>getLeaderboardCountryContinents(country, which).includes(continent)).length;
}

function getLeaderboardCountryContinents(country, which="flags"){
  if(which === "world" && country === "Russia") return ["Europe", "Asia"];
  return [countryContinent[country]];
}

async function loadSharedLeaderboards(){
  leaderboardPageState.loading = true;
  leaderboardPageState.error = "";
  refreshBtn.disabled = true;
  renderLeaderboardPage();

  if(!window.sharedLeaderboard || !window.sharedLeaderboard.isConfigured()){
    leaderboardPageState.loading = false;
    leaderboardPageState.error = "Shared leaderboard is not configured.";
    refreshBtn.disabled = false;
    renderLeaderboardPage();
    return;
  }

  try{
    const runs = await window.sharedLeaderboard.fetchAllRuns(FETCH_LIMIT);
    leaderboardPageState.runsByKey = groupRunsByCategory(runs);
  }catch(error){
    leaderboardPageState.error = error.message || "Shared leaderboard unavailable.";
  }finally{
    leaderboardPageState.loading = false;
    refreshBtn.disabled = false;
    renderLeaderboardPage();
  }
}

function groupRunsByCategory(runs){
  const validKeys = new Set(leaderboardPageState.categories.map(category=>category.key));
  const grouped = new Map();

  for(const run of runs){
    if(!validKeys.has(run.modeKey)) continue;
    const group = grouped.get(run.modeKey) || [];
    group.push(run);
    grouped.set(run.modeKey, group);
  }

  for(const group of grouped.values()){
    group.sort((left,right)=>left.timeMs - right.timeMs || String(left.date).localeCompare(String(right.date)));
  }

  return grouped;
}

function renderLeaderboardPage(){
  gridEl.innerHTML = "";

  const filtered = leaderboardPageState.categories.filter(category=>{
    if(modeFilter.value !== "all" && category.which !== modeFilter.value) return false;
    if(continentFilter.value !== "all" && category.continent !== continentFilter.value) return false;
    if(targetFilter.value !== "all-targets" && category.target !== targetFilter.value) return false;
    if(withScoresFilter.checked && !getCategoryRuns(category).length) return false;
    return true;
  });

  renderStatus(filtered);

  if(leaderboardPageState.loading){
    gridEl.appendChild(emptyLeaderboardPage("Loading shared leaderboards..."));
    return;
  }

  if(leaderboardPageState.error){
    gridEl.appendChild(emptyLeaderboardPage(leaderboardPageState.error));
    return;
  }

  if(!filtered.length){
    gridEl.appendChild(emptyLeaderboardPage("No categories match these filters."));
    return;
  }

  for(const category of filtered){
    gridEl.appendChild(renderCategoryCard(category));
  }
}

function renderStatus(filtered){
  const scoredCategories = leaderboardPageState.categories
    .filter(category=>getCategoryRuns(category).length)
    .length;
  statusEl.innerHTML = "";

  const status = document.createElement("div");
  status.className = "leaderboard-page-summary";
  status.append(
    summaryPill(`${filtered.length} shown`),
    summaryPill(`${scoredCategories} with scores`),
    summaryPill(`Default top ${PAGE_TOP_RUNS}`)
  );
  statusEl.appendChild(status);
}

function summaryPill(text){
  const pill = document.createElement("span");
  pill.className = "stat-pill";
  pill.textContent = text;
  return pill;
}

function renderCategoryCard(category){
  const allRuns = getCategoryRuns(category);
  const limitMode = getCategoryRunLimit(category);
  const runs = limitMode === "all" ? allRuns : allRuns.slice(0, PAGE_TOP_RUNS);
  const card = document.createElement("article");
  card.className = "leaderboard-category-card";

  const heading = document.createElement("header");
  heading.className = "leaderboard-category-heading";
  const titleWrap = document.createElement("div");
  titleWrap.className = "leaderboard-category-title";
  const kicker = document.createElement("p");
  kicker.className = "panel-label";
  kicker.textContent = `${category.modeLabel} - ${category.continent}`;
  const title = document.createElement("h2");
  title.textContent = category.targetLabel;
  titleWrap.append(kicker, title);
  heading.append(titleWrap, renderCategoryControls(category, allRuns.length, runs.length, limitMode));
  card.appendChild(heading);

  const list = document.createElement("div");
  list.className = "leaderboard-category-list";
  if(!runs.length){
    list.appendChild(emptyMiniPage("No posted runs."));
  }else{
    runs.forEach((run,index)=>list.appendChild(renderRunRow(run, index)));
  }
  card.appendChild(list);
  return card;
}

function getCategoryRunLimit(category){
  return leaderboardPageState.runLimitByKey.get(category.key) || "top";
}

function renderCategoryControls(category, totalRuns, shownRuns, limitMode){
  const controls = document.createElement("div");
  controls.className = "leaderboard-category-controls";

  const select = document.createElement("select");
  select.className = "leaderboard-run-limit";
  select.setAttribute("aria-label", `Runs shown for ${category.modeLabel} ${category.continent} ${category.targetLabel}`);

  const topOption = document.createElement("option");
  topOption.value = "top";
  topOption.textContent = `Top ${PAGE_TOP_RUNS}`;
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All";
  select.append(topOption, allOption);
  select.value = limitMode;
  select.addEventListener("change", ()=>{
    leaderboardPageState.runLimitByKey.set(category.key, select.value);
    renderLeaderboardPage();
  });

  const count = document.createElement("span");
  count.className = "leaderboard-category-count";
  count.textContent = totalRuns ? `Showing ${shownRuns} of ${totalRuns}` : "No runs";

  controls.append(select, count);
  return controls;
}

function getCategoryRuns(category){
  return leaderboardPageState.runsByKey.get(category.key) || [];
}

function renderRunRow(run, index){
  const details = document.createElement("details");
  details.className = "leaderboard-run-details";

  const row = document.createElement("summary");
  row.className = "leaderboard-full-row";

  const rank = document.createElement("strong");
  rank.textContent = `#${index + 1}`;
  const name = document.createElement("span");
  name.textContent = run.playerName || "Player";
  const time = document.createElement("span");
  time.textContent = formatLeaderboardTime(run.timeMs);
  const meta = document.createElement("span");
  const date = run.date ? new Date(run.date).toLocaleDateString() : "";
  meta.textContent = `${run.correct}/${run.total} first-try${date ? ` - ${date}` : ""}`;

  row.append(rank, name, time, meta);
  details.append(row, renderExpandedRun(run));
  return details;
}

function renderExpandedRun(run){
  const panel = document.createElement("div");
  panel.className = "leaderboard-expanded";

  const facts = document.createElement("div");
  facts.className = "leaderboard-expanded-facts";
  facts.append(
    factPill(`Posted: ${run.date ? new Date(run.date).toLocaleString() : "Unknown"}`),
    factPill(`Validation: ${run.verified ? "server verified" : "client checked"}`)
  );
  if(run.antiCheat && run.antiCheat.score !== undefined){
    facts.append(factPill(`Score: ${run.antiCheat.score} / 100`));
  }
  panel.appendChild(facts);

  panel.appendChild(renderSplits(run));
  panel.appendChild(renderRoute(run));
  return panel;
}

function factPill(text){
  const pill = document.createElement("span");
  pill.className = "leaderboard-fact";
  pill.textContent = text;
  return pill;
}

function renderSplits(run){
  const section = document.createElement("section");
  section.className = "leaderboard-expanded-section";
  const title = document.createElement("h3");
  title.textContent = "Splits";
  section.appendChild(title);

  const splits = run.splits || {};
  const entries = Object.entries(splits).sort((left,right)=>{
    const leftValue = left[0] === "all" ? Number.MAX_SAFE_INTEGER : Number(left[0]);
    const rightValue = right[0] === "all" ? Number.MAX_SAFE_INTEGER : Number(right[0]);
    return leftValue - rightValue;
  });

  if(!entries.length){
    section.appendChild(emptyMiniPage("No split data stored."));
    return section;
  }

  const list = document.createElement("div");
  list.className = "leaderboard-split-detail-list";
  for(const [label, value] of entries){
    const item = document.createElement("span");
    item.textContent = `${label === "all" ? "Finish" : `First ${label}`}: ${formatLeaderboardTime(value)}`;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
}

function renderRoute(run){
  const section = document.createElement("section");
  section.className = "leaderboard-expanded-section";
  const title = document.createElement("h3");
  title.textContent = "Route";
  section.appendChild(title);

  if(!run.route || !run.route.length){
    section.appendChild(emptyMiniPage("No route data stored for this run."));
    return section;
  }

  const list = document.createElement("ol");
  list.className = "leaderboard-route-list";
  for(const entry of run.route){
    const item = document.createElement("li");
    const label = run.which === "capitals"
      ? `${entry.country} -> ${entry.answer}`
      : entry.country;
    const timing = entry.solvedMs !== null && entry.solvedMs !== undefined
      ? ` at ${formatLeaderboardTime(entry.solvedMs)}`
      : "";
    const attempts = entry.attempts === 1 ? "1 attempt" : `${entry.attempts || 0} attempts`;
    item.textContent = `${label} (${entry.continent})${timing} - ${attempts}${entry.skipped ? " - skipped once" : ""}`;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
}

function emptyLeaderboardPage(text){
  const empty = document.createElement("p");
  empty.className = "empty-mini leaderboard-page-empty";
  empty.textContent = text;
  return empty;
}

function emptyMiniPage(text){
  const empty = document.createElement("p");
  empty.className = "empty-mini";
  empty.textContent = text;
  return empty;
}

function formatLeaderboardTime(ms){
  const value = Math.max(0, Math.round(ms || 0));
  const minutes = Math.floor(value / 60000);
  const seconds = Math.floor((value % 60000) / 1000);
  const tenths = Math.floor((value % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2,"0")}.${tenths}`;
}

document.addEventListener("DOMContentLoaded", initLeaderboardPage);
