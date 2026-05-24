const adminPassword = document.getElementById("admin-password");
const adminRememberPassword = document.getElementById("admin-remember-password");
const adminLoad = document.getElementById("admin-load");
const adminAnalytics = document.getElementById("admin-analytics");
const adminStatus = document.getElementById("admin-status");
const adminList = document.getElementById("admin-list");

const ADMIN_PASSWORD_STORAGE_KEY = "leaderboard_admin_password";
const ADMIN_PASSWORD_REMEMBER_KEY = "leaderboard_admin_password_remember";

function initAdmin(){
  const rememberPassword = sessionStorage.getItem(ADMIN_PASSWORD_REMEMBER_KEY) === "true";
  adminRememberPassword.checked = rememberPassword;
  adminPassword.value = rememberPassword ? sessionStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || "" : "";

  adminLoad.addEventListener("click", loadAdminQueue);
  adminAnalytics.addEventListener("click", loadAnalytics);
  adminRememberPassword.addEventListener("change", syncAdminPasswordStorage);
  adminPassword.addEventListener("input", syncAdminPasswordStorage);
  adminPassword.addEventListener("keydown", event=>{
    if(event.key === "Enter") loadAdminQueue();
  });
}

function syncAdminPasswordStorage(){
  if(adminRememberPassword.checked){
    sessionStorage.setItem(ADMIN_PASSWORD_REMEMBER_KEY, "true");
    sessionStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, adminPassword.value);
    return;
  }
  sessionStorage.removeItem(ADMIN_PASSWORD_REMEMBER_KEY);
  sessionStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
}

async function adminRequest(action, extra={}){
  const config = window.LEADERBOARD_CONFIG || {};
  if(!config.adminFunctionUrl) throw new Error("Admin function is not configured.");
  const password = adminPassword.value;
  syncAdminPasswordStorage();

  const response = await fetch(config.adminFunctionUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({password, action, ...extra})
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if(!response.ok) throw new Error(getAdminErrorMessage(payload, text, response.status));
  return payload;
}

function getAdminErrorMessage(payload, text, status){
  const raw = payload && payload.error ? String(payload.error) : text || "";
  if(raw.includes("PGRST205") && raw.includes("speedrun_analytics")){
    return "Analytics table is missing from Supabase schema cache. Run the private Supabase schema SQL, confirm speedrun_analytics exists, then try Load analytics again.";
  }
  try{
    const nested = JSON.parse(raw);
    if(nested.code === "PGRST205" && String(nested.message || "").includes("speedrun_analytics")){
      return "Analytics table is missing from Supabase schema cache. Run the private Supabase schema SQL, confirm speedrun_analytics exists, then try Load analytics again.";
    }
    return nested.message || nested.error || raw || `Admin request failed (${status}).`;
  }catch{
    return raw || `Admin request failed (${status}).`;
  }
}

async function loadAdminQueue(){
  adminLoad.disabled = true;
  setAdminStatus("Loading queue...");
  adminList.innerHTML = "";

  try{
    const payload = await adminRequest("list");
    renderAdminRuns(payload.runs || []);
    setAdminStatus(`${(payload.runs || []).length} runs need review.`);
  }catch(error){
    setAdminStatus(error.message || "Could not load admin queue.");
  }finally{
    adminLoad.disabled = false;
  }
}

async function loadAnalytics(){
  adminAnalytics.disabled = true;
  setAdminStatus("Loading analytics...");
  adminList.innerHTML = "";

  try{
    const payload = await adminRequest("analytics");
    renderAnalytics(payload.analytics || []);
    setAdminStatus(`${(payload.analytics || []).length} completed speedrun analytics records loaded.`);
  }catch(error){
    setAdminStatus(error.message || "Could not load analytics.");
  }finally{
    adminAnalytics.disabled = false;
  }
}

function renderAdminRuns(runs){
  adminList.innerHTML = "";
  if(!runs.length){
    const empty = document.createElement("p");
    empty.className = "empty-mini leaderboard-page-empty";
    empty.textContent = "No pending or rejected runs.";
    adminList.appendChild(empty);
    return;
  }

  for(const run of runs){
    adminList.appendChild(renderAdminRun(run));
  }
}

function renderAnalytics(records){
  adminList.innerHTML = "";
  if(!records.length){
    const empty = document.createElement("p");
    empty.className = "empty-mini leaderboard-page-empty";
    empty.textContent = "No analytics records stored yet.";
    adminList.appendChild(empty);
    return;
  }

  const engine = getAnalyticsEngine();
  const mastery = engine.aggregateCountryMastery(records);
  const devices = engine.aggregateDevices(records);
  adminList.appendChild(renderDeviceOverview(devices));
  adminList.appendChild(renderAnalyticsOverview(records, mastery));
  const sortedRecords = [...records].sort((left,right)=>{
    const leftRecord = engine.normaliseRecord(left);
    const rightRecord = engine.normaliseRecord(right);
    const deviceCompare = String(leftRecord.deviceNumber).localeCompare(String(rightRecord.deviceNumber));
    if(deviceCompare) return deviceCompare;
    return new Date(rightRecord.completedAt || rightRecord.createdAt || 0) - new Date(leftRecord.completedAt || leftRecord.createdAt || 0);
  });
  for(const record of sortedRecords){
    adminList.appendChild(renderAnalyticsRecord(record, mastery));
  }
}

function renderDeviceOverview(devices){
  const card = document.createElement("article");
  card.className = "leaderboard-category-card admin-run-card analytics-overview-card";

  const heading = document.createElement("header");
  heading.className = "leaderboard-category-heading";
  const kicker = document.createElement("p");
  kicker.className = "panel-label";
  kicker.textContent = "Private device tracking";
  const title = document.createElement("h2");
  title.textContent = `${devices.length} devices`;
  heading.append(kicker, title);

  card.append(
    heading,
    renderAnalyticsTable("Individuals by device", [
      ["Device", item=>item.deviceNumber],
      ["Known names", item=>formatNameList(item.names)],
      ["Leaderboard names", item=>formatNameList(item.leaderboardNames)],
      ["Runs", item=>String(item.runCount || 0)],
      ["Last seen", item=>item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString() : "unknown"],
      ["Median solve", item=>formatAdminMs(item.medianSolveMs)],
      ["First try", item=>formatAdminPercent(item.firstTryAccuracy)],
      ["Needs revision", item=>String(item.needsRevision || 0)]
    ], devices, "No device analytics available.")
  );
  return card;
}

function renderAnalyticsOverview(records, mastery){
  const card = document.createElement("article");
  card.className = "leaderboard-category-card admin-run-card analytics-overview-card";

  const heading = document.createElement("header");
  heading.className = "leaderboard-category-heading";
  const kicker = document.createElement("p");
  kicker.className = "panel-label";
  kicker.textContent = "Learning progress";
  const title = document.createElement("h2");
  title.textContent = `${records.length} analytics runs`;
  heading.append(kicker, title);

  const needsRevision = mastery.filter(item=>item.masteryLevel === "Needs revision" || item.masteryLevel === "Error-prone");
  const mastered = mastery.filter(item=>item.masteryLevel === "Mastered");
  const facts = document.createElement("div");
  facts.className = "leaderboard-expanded-facts";
  facts.append(
    factPill(`Countries tracked: ${mastery.length}`),
    factPill(`Mastered: ${mastered.length}`),
    factPill(`Needs revision: ${needsRevision.length}`)
  );

  card.append(
    heading,
    facts,
    renderAnalyticsTable("Per-country mastery", [
      ["Country", item=>item.country],
      ["Level", item=>item.masteryLevel],
      ["Trend", item=>item.trend],
      ["Median solve", item=>formatAdminMs(item.medianSolveTime)],
      ["P90", item=>formatAdminMs(item.p90SolveTime)],
      ["First try", item=>formatAdminPercent(item.firstTryAccuracy)]
    ], mastery.slice(0, 18), "No country-level analytics available yet.")
  );
  return card;
}

function renderAnalyticsRecord(rawRecord, mastery=[]){
  const engine = getAnalyticsEngine();
  const record = engine.normaliseRecord(rawRecord);
  const metrics = engine.deriveRunMetrics(record);
  const analysis = engine.generateRunAnalysis(record, metrics, mastery);
  const card = document.createElement("article");
  card.className = "leaderboard-category-card admin-run-card";

  const heading = document.createElement("header");
  heading.className = "leaderboard-category-heading";
  const kicker = document.createElement("p");
  kicker.className = "panel-label";
  kicker.textContent = `${record.deviceNumber} - ${record.mode} - ${record.region} - ${record.targetLabel || record.target}`;
  const title = document.createElement("h2");
  title.textContent = `${record.playerName} - ${formatAdminTime(record.totalDurationMs)}`;
  heading.append(kicker, title);

  const facts = document.createElement("div");
  facts.className = "leaderboard-expanded-facts";
  facts.append(
    factPill(`Created: ${record.createdAt ? new Date(record.createdAt).toLocaleString() : "unknown"}`),
    factPill(`Device: ${record.deviceNumber}`),
    factPill(`Known names: ${formatNameList([record.playerName, ...record.knownPlayerNames])}`),
    factPill(`Leaderboard names: ${formatNameList(record.leaderboardNames)}`),
    factPill(`Solved: ${metrics.solvedCount}/${metrics.totalQuestions}`),
    factPill(`First try: ${formatAdminPercent(metrics.firstTryAccuracy)}`),
    factPill(`Countries/min: ${formatAdminNumber(metrics.countriesPerMinute)}`),
    factPill(`Speedrun WPM: ${formatAdminNumber(metrics.speedrunInputWpm)}`),
    factPill(`Canonical WPM: ${formatAdminNumber(metrics.effectiveCanonicalWpm)}`),
    factPill(`Active input WPM: ${formatAdminNumber(metrics.activeInputWpm)}`),
    factPill(`Data quality: ${metrics.dataQualityScore}/100`)
  );

  const flags = Array.isArray(metrics.dataQualityFlags) ? metrics.dataQualityFlags : [];
  if(flags.length) facts.append(factPill(`Flags: ${flags.join(", ")}`));

  card.append(
    heading,
    facts,
    renderWrittenAnalysis(analysis),
    renderRunSummaryDashboard(metrics),
    renderQuadrants(metrics.quadrants),
    renderAnalyticsTable("Slowest countries", [
      ["Country", item=>item.country],
      ["Solve", item=>formatAdminMs(item.finalSolveMs)],
      ["Recognition", item=>formatAdminMs(item.recognitionMs)],
      ["Typing", item=>formatAdminMs(item.activeTypingMs)],
      ["Attempts", item=>String(item.attempts || 0)],
      ["Shortcut", item=>item.shortcutUsed ? "yes" : "no"],
      ["Bottleneck", item=>item.bottleneck || "unknown"]
    ], metrics.slowestFive || [], "No solved-question timing available."),
    renderAnalyticsTable("Error analysis", [
      ["Country", item=>item.country],
      ["Wrong", item=>String(item.wrongSubmits || 0)],
      ["Typed", item=>formatWrongAttempts(item.attempts)],
      ["Distance", item=>formatWrongDistances(item.attempts)],
      ["Type", item=>item.likelyErrorType || "unknown"],
      ["Correction", item=>formatAdminMs(item.correctionMs)]
    ], metrics.errorAnalysis || [], "No wrong attempts in this run."),
    renderAnalyticsTable("Typing bottlenecks", [
      ["Country", item=>item.country],
      ["Recognition", item=>formatAdminMs(item.recognitionMs)],
      ["Typing", item=>formatAdminMs(item.activeTypingMs)],
      ["Typed/canonical", item=>`${item.typedChars || 0}/${item.canonicalChars || "?"}`],
      ["Input", item=>item.rawFinalInput || "unknown"]
    ], metrics.typingBottlenecks || [], "No clear typing bottlenecks."),
    renderAnalyticsTable("Recognition bottlenecks", [
      ["Country", item=>item.country],
      ["Recognition", item=>formatAdminMs(item.recognitionMs)],
      ["Typing", item=>formatAdminMs(item.activeTypingMs)],
      ["Solve", item=>formatAdminMs(item.finalSolveMs)],
      ["Attempts", item=>String(item.attempts || 0)]
    ], metrics.recognitionBottlenecks || [], "No clear recognition bottlenecks."),
    renderAnalyticsTable("Region heatmap", [
      ["Region", item=>item.region],
      ["Median solve", item=>formatAdminMs(item.medianSolveMs)],
      ["First try", item=>formatAdminPercent(item.firstTryAccuracy)],
      ["P90 solve", item=>formatAdminMs(item.p90SolveMs)],
      ["Recognition", item=>formatAdminMs(item.medianRecognitionMs)],
      ["Typing burden", item=>formatAdminNumber(item.typingBurden)],
      ["Mastery", item=>formatAdminPercent(item.masteryPercentage)]
    ], metrics.regionStats || [], "No regional breakdown available."),
    renderShortcutImpact(metrics.shortcutImpact, metrics),
    renderDataQualityWarnings(metrics)
  );
  return card;
}

function renderRunSummaryDashboard(metrics){
  const wrap = document.createElement("section");
  wrap.className = "analytics-dashboard";
  const items = [
    ["Median solve", formatAdminMs(metrics.medianFinalSolveMs)],
    ["P90 solve", formatAdminMs(metrics.p90FinalSolveMs)],
    ["Median recognition", formatAdminMs(metrics.medianRecognitionMs)],
    ["Shortcut use", formatAdminPercent(metrics.shortcutUsageRate)],
    ["Autocomplete use", formatAdminPercent(metrics.autocompleteUsageRate)],
    ["No-shortcut WPM", `${formatAdminNumber(metrics.noShortcutAdjustedWpm)} est.`],
    ["Correction time", formatAdminMs(metrics.correctionTimeTotalMs)],
    ["Outlier impact", formatAdminPercent(metrics.outlierImpact)],
    ["Consistency", metrics.consistencyScore === null ? "unknown" : `${metrics.consistencyScore}/100`]
  ];
  for(const [label, value] of items){
    const item = document.createElement("div");
    item.className = "analytics-metric";
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    item.append(strong, span);
    wrap.appendChild(item);
  }
  return wrap;
}

function renderWrittenAnalysis(analysis){
  const section = document.createElement("section");
  section.className = "analytics-written-analysis";
  const title = document.createElement("h3");
  title.textContent = "Automatic analysis";
  section.appendChild(title);
  for(const text of analysis.paragraphs || []){
    const p = document.createElement("p");
    p.textContent = text;
    section.appendChild(p);
  }
  if((analysis.recommendations || []).length){
    const list = document.createElement("ul");
    for(const item of analysis.recommendations){
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    }
    section.appendChild(list);
  }
  return section;
}

function renderQuadrants(quadrants={}){
  const section = document.createElement("section");
  section.className = "analytics-quadrants";
  const title = document.createElement("h3");
  title.textContent = "Recognition vs typing";
  section.appendChild(title);
  const labels = [
    ["fastRecognitionFastTyping", "Fast recognition, fast typing"],
    ["fastRecognitionSlowTyping", "Fast recognition, slow typing"],
    ["slowRecognitionFastTyping", "Slow recognition, fast typing"],
    ["slowRecognitionSlowTyping", "Slow recognition, slow typing"]
  ];
  const grid = document.createElement("div");
  grid.className = "analytics-quadrant-grid";
  for(const [key, label] of labels){
    const box = document.createElement("div");
    box.className = "analytics-quadrant";
    const countries = Array.isArray(quadrants[key]) ? quadrants[key] : [];
    const heading = document.createElement("strong");
    heading.textContent = `${label}: ${countries.length}`;
    const body = document.createElement("span");
    body.textContent = countries.slice(0, 8).map(item=>item.country).join(", ") || "none";
    box.append(heading, body);
    grid.appendChild(box);
  }
  section.appendChild(grid);
  return section;
}

function renderShortcutImpact(shortcutImpact={}, metrics={}){
  const rows = Array.isArray(shortcutImpact.mostUsed) ? shortcutImpact.mostUsed : [];
  const section = document.createElement("section");
  section.className = "analytics-section";
  const title = document.createElement("h3");
  title.textContent = "Shortcut impact";
  const facts = document.createElement("div");
  facts.className = "leaderboard-expanded-facts";
  facts.append(
    factPill(`Shortcut answers: ${shortcutImpact.shortcutAnswers || 0}`),
    factPill(`Chars avoided: ${shortcutImpact.canonicalCharsAvoided || 0}`),
    factPill(`Estimated time saved: ${formatAdminMs(shortcutImpact.estimatedTimeSavedMs)}`),
    factPill(`Canonical vs actual WPM: ${formatAdminNumber(metrics.effectiveCanonicalWpm)} / ${formatAdminNumber(metrics.activeInputWpm)}`)
  );
  section.append(
    title,
    facts,
    renderAnalyticsTable("", [
      ["Alias", item=>item.alias],
      ["Uses", item=>String(item.count)],
      ["Countries", item=>(item.countries || []).join(", ")],
      ["Chars avoided", item=>String(item.canonicalCharsAvoided || 0)]
    ], rows, "No shortcut or autocomplete use recorded.")
  );
  return section;
}

function renderDataQualityWarnings(metrics){
  const section = document.createElement("section");
  section.className = "analytics-section";
  const title = document.createElement("h3");
  title.textContent = "Data quality warnings";
  section.appendChild(title);
  const flags = Array.isArray(metrics.dataQualityFlags) ? metrics.dataQualityFlags : [];
  if(!flags.length){
    const p = document.createElement("p");
    p.className = "empty-mini";
    p.textContent = "No quality warnings flagged.";
    section.appendChild(p);
    return section;
  }
  const list = document.createElement("ul");
  list.className = "analytics-warning-list";
  for(const flag of flags){
    const li = document.createElement("li");
    li.textContent = flag;
    list.appendChild(li);
  }
  section.appendChild(list);
  return section;
}

function renderAnalyticsTable(title, columns, rows, emptyText){
  const section = document.createElement("section");
  section.className = "analytics-section";
  if(title){
    const heading = document.createElement("h3");
    heading.textContent = title;
    section.appendChild(heading);
  }
  if(!rows.length){
    const empty = document.createElement("p");
    empty.className = "empty-mini";
    empty.textContent = emptyText;
    section.appendChild(empty);
    return section;
  }
  const table = document.createElement("table");
  table.className = "analytics-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for(const [label] of columns){
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  const tbody = document.createElement("tbody");
  for(const row of rows){
    const tr = document.createElement("tr");
    for(const [, getValue] of columns){
      const td = document.createElement("td");
      td.textContent = getValue(row);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.append(thead, tbody);
  section.appendChild(table);
  return section;
}

function renderAdminRun(run){
  const card = document.createElement("article");
  card.className = "leaderboard-category-card admin-run-card";

  const heading = document.createElement("header");
  heading.className = "leaderboard-category-heading";
  const kicker = document.createElement("p");
  kicker.className = "panel-label";
  kicker.textContent = `${run.status} - ${run.mode_key}`;
  const title = document.createElement("h2");
  title.textContent = `${run.player_name} - ${formatAdminTime(run.time_ms)}`;
  heading.append(kicker, title);

  const facts = document.createElement("div");
  facts.className = "leaderboard-expanded-facts";
  const reasons = Array.isArray(run.review_reasons) ? run.review_reasons : [];
  facts.append(
    factPill(`Created: ${new Date(run.created_at).toLocaleString()}`),
    factPill(`Set: ${run.set_label || run.continent || "All"}`),
    factPill(`Mode: ${formatAdminMode(run)}`),
    factPill(`Scope: ${run.game_scope || "countries"}`),
    factPill(`Score: ${run.anti_cheat && run.anti_cheat.score !== undefined ? run.anti_cheat.score : "-"}`),
    factPill(`Review flags: ${reasons.length || 0}`)
  );

  const route = document.createElement("ol");
  route.className = "leaderboard-route-list";
  for(const entry of Array.isArray(run.route) ? run.route : []){
    const item = document.createElement("li");
    item.textContent = `${entry.index}. ${entry.country} (${entry.continent}) at ${formatAdminTime(entry.solvedMs || 0)} - ${entry.attempts || 0} attempts`;
    route.appendChild(item);
  }

  const note = document.createElement("input");
  note.type = "text";
  note.placeholder = "Review note";

  const publicName = document.createElement("input");
  publicName.type = "text";
  publicName.maxLength = 24;
  publicName.pattern = "[A-Za-z0-9 _.-]{1,24}";
  publicName.placeholder = "Public leaderboard name";
  publicName.value = run.player_name || "";

  const nameReview = document.createElement("div");
  nameReview.className = "admin-name-review";
  const nameLabel = document.createElement("p");
  nameLabel.textContent = "Approve public name";
  nameReview.append(nameLabel, publicName);

  const suggestions = Array.isArray(run.name_suggestions) ? run.name_suggestions : [];
  if(suggestions.length){
    const suggestionRow = document.createElement("div");
    suggestionRow.className = "admin-name-suggestions";
    for(const name of suggestions){
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn subtle";
      button.textContent = name;
      button.addEventListener("click", ()=>{ publicName.value = name; });
      suggestionRow.appendChild(button);
    }
    nameReview.appendChild(suggestionRow);
  }

  const actions = document.createElement("div");
  actions.className = "result-actions";
  const approve = document.createElement("button");
  approve.className = "btn primary";
  approve.type = "button";
  approve.textContent = "Approve";
  approve.addEventListener("click", ()=>moderateRun(run.id, "approve", note.value, publicName.value));

  const reject = document.createElement("button");
  reject.className = "btn danger";
  reject.type = "button";
  reject.textContent = "Reject";
  reject.addEventListener("click", ()=>moderateRun(run.id, "reject", note.value));
  actions.append(approve, reject);

  card.append(heading, renderReviewReasonPanel(run, reasons), facts, route, nameReview, note, actions);
  return card;
}

function renderReviewReasonPanel(run, reasons){
  const panel = document.createElement("section");
  panel.className = `admin-review-panel ${reasons.length ? "has-reasons" : "is-clear"}`;

  const heading = document.createElement("div");
  heading.className = "admin-review-heading";
  const title = document.createElement("strong");
  title.textContent = reasons.length
    ? `${reasons.length} reason${reasons.length === 1 ? "" : "s"} pending review`
    : "No review reason stored";
  const status = document.createElement("span");
  status.textContent = String(run.status || "pending").toUpperCase();
  heading.append(title, status);
  panel.appendChild(heading);

  if(reasons.length){
    const list = document.createElement("div");
    list.className = "admin-review-reasons";
    reasons.forEach(reason=>list.appendChild(renderReviewReason(reason)));
    panel.appendChild(list);
  }else{
    const body = document.createElement("p");
    body.textContent = "This run is in the review queue without a stored flag. Check the route and name before approving.";
    panel.appendChild(body);
  }

  const context = document.createElement("div");
  context.className = "admin-review-context";
  context.append(
    factPill(`${run.correct_first_try}/${run.total} first try`),
    factPill(formatAdminTime(run.time_ms)),
    factPill(run.verified ? "Server verified" : "Not verified")
  );
  panel.appendChild(context);
  return panel;
}

function renderReviewReason(reason){
  const item = document.createElement("div");
  item.className = "admin-review-reason";
  const title = document.createElement("strong");
  title.textContent = getReviewReasonTitle(reason);
  const detail = document.createElement("span");
  detail.textContent = getReviewReasonDetail(reason);
  item.append(title, detail);
  return item;
}

function getReviewReasonTitle(reason){
  const labels = {
    "very-fast-average": "Very fast average",
    "fast-large-category": "Fast large-category run",
    "focus-loss": "Focus changed",
    "low-key-event-count": "Low key event count",
    "near-instant-answer": "Near-instant answers",
    "skipped-or-repeated-questions": "Skipped or repeated route",
    "name-review": "Name needs review",
    "blocked-name": "Blocked name term",
    "reserved-name": "Reserved name"
  };
  return labels[reason] || humaniseReviewReason(reason);
}

function getReviewReasonDetail(reason){
  const details = {
    "very-fast-average": "The average solve time is below the normal manual-review threshold.",
    "fast-large-category": "The run is unusually fast for a larger target, so route evidence should be checked.",
    "focus-loss": "The browser lost focus during the run. This may be harmless, but it needs a look.",
    "low-key-event-count": "There were fewer key events than expected for the number of solved answers.",
    "near-instant-answer": "One or more answers were submitted very shortly after appearing.",
    "skipped-or-repeated-questions": "The stored route has more entries than the target, usually from skips or repeats.",
    "name-review": "The public player name matched a moderation rule or needs a cleaner display name.",
    "blocked-name": "The public player name contains a blocked moderation term.",
    "reserved-name": "The public player name looks reserved or impersonation-prone."
  };
  return details[reason] || "Review the route, timing, and player name before approving.";
}

function humaniseReviewReason(reason){
  return String(reason || "Unknown reason")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, letter=>letter.toUpperCase());
}

function formatAdminMode(run){
  const mode = run.which === "capitals" ? "Capitals" : run.which === "world" ? "Map" : "Flags";
  const target = run.target_label || run.target || "All";
  return `${mode} / ${target}`;
}

async function moderateRun(id, action, note, publicName){
  setAdminStatus(`${action === "approve" ? "Approving" : "Rejecting"} run ${id}...`);
  try{
    await adminRequest(action, {id, note, publicName});
    await loadAdminQueue();
  }catch(error){
    setAdminStatus(error.message || "Could not update run.");
  }
}

function getAnalyticsEngine(){
  if(window.SpeedrunAnalytics) return window.SpeedrunAnalytics;
  throw new Error("Analytics engine did not load.");
}

function formatWrongAttempts(attempts){
  if(!Array.isArray(attempts) || !attempts.length) return "unknown";
  return attempts.map(item=>item.rawInput || "blank").join(", ");
}

function formatWrongDistances(attempts){
  if(!Array.isArray(attempts) || !attempts.length) return "-";
  return attempts
    .map(item=>item.editDistanceToCanonical === null || item.editDistanceToCanonical === undefined ? "?" : String(item.editDistanceToCanonical))
    .join(", ");
}

function formatNameList(names){
  const clean = Array.from(new Set((Array.isArray(names) ? names : [])
    .map(name=>String(name || "").trim())
    .filter(Boolean)));
  return clean.length ? clean.join(", ") : "unknown";
}

function factPill(text){
  const pill = document.createElement("span");
  pill.className = "leaderboard-fact";
  pill.textContent = text;
  return pill;
}

function setAdminStatus(text){
  adminStatus.innerHTML = "";
  const status = document.createElement("p");
  status.className = "empty-mini";
  status.textContent = text;
  adminStatus.appendChild(status);
}

function formatAdminTime(ms){
  const value = Math.max(0, Math.round(ms || 0));
  const minutes = Math.floor(value / 60000);
  const seconds = Math.floor((value % 60000) / 1000);
  const tenths = Math.floor((value % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2,"0")}.${tenths}`;
}

function formatAdminMs(ms){
  if(ms === null || ms === undefined || ms === "") return "-";
  const value = Number(ms);
  if(!Number.isFinite(value)) return "-";
  return `${Math.round(value)} ms`;
}

function formatAdminNumber(value){
  if(value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if(!Number.isFinite(number)) return "-";
  return number >= 100 ? String(Math.round(number)) : number.toFixed(1);
}

function formatAdminPercent(value){
  if(value === null || value === undefined || value === "") return "unknown";
  const number = Number(value);
  if(!Number.isFinite(number)) return "unknown";
  return `${(number * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

document.addEventListener("DOMContentLoaded", initAdmin);
