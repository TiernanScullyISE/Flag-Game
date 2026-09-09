const adminPassword = document.getElementById("admin-password");
const adminRememberPassword = document.getElementById("admin-remember-password");
const adminLoad = document.getElementById("admin-load");
const adminTools = document.getElementById("admin-tools");
const adminRefresh = document.getElementById("admin-refresh");
const adminRunStatusFilter = document.getElementById("admin-run-status-filter");
const adminRunAgeFilter = document.getElementById("admin-run-age-filter");
const adminRunSearch = document.getElementById("admin-run-search");
const adminRunDuplicatesOnly = document.getElementById("admin-run-duplicates-only");
const adminSelectVisible = document.getElementById("admin-select-visible");
const adminBulkReject = document.getElementById("admin-bulk-reject");
const adminAnalytics = document.getElementById("admin-analytics");
const adminFeedback = document.getElementById("admin-feedback");
const adminExportScope = document.getElementById("admin-export-scope");
const adminExportFilter = document.getElementById("admin-export-filter");
const adminExport = document.getElementById("admin-export");
const adminStatus = document.getElementById("admin-status");
const adminList = document.getElementById("admin-list");

const ADMIN_TRUST_DEVICE_KEY = "leaderboard_admin_trust_device";
const ADMIN_DEVICE_ID_KEY = "leaderboard_admin_device_id";
let currentFeedbackSubmissions = [];
let currentAdminRuns = [];
let currentAdminView = "runs";
let currentAdminDuplicateCounts = new Map();
const selectedAdminRunIds = new Set();

function initAdmin(){
  adminRememberPassword.checked = true;
  adminPassword.value = "";
  sessionStorage.removeItem("leaderboard_admin_password");
  sessionStorage.removeItem("leaderboard_admin_password_remember");
  ensureAdminDeviceId();

  adminLoad.addEventListener("click", loadAdminQueue);
  adminRefresh.addEventListener("click", loadAdminQueue);
  adminRunStatusFilter.addEventListener("change", renderFilteredAdminRuns);
  adminRunAgeFilter.addEventListener("change", renderFilteredAdminRuns);
  adminRunSearch.addEventListener("input", renderFilteredAdminRuns);
  adminRunDuplicatesOnly.addEventListener("change", renderFilteredAdminRuns);
  adminSelectVisible.addEventListener("change", toggleVisibleAdminRuns);
  adminBulkReject.addEventListener("click", bulkRejectSelectedRuns);
  adminAnalytics.addEventListener("click", loadAnalytics);
  adminFeedback.addEventListener("click", loadFeedback);
  adminExport.addEventListener("click", exportCsv);
  adminExportScope.addEventListener("change", updateExportControls);
  adminRememberPassword.addEventListener("change", syncAdminTrustStorage);
  adminPassword.addEventListener("keydown", event=>{
    if(event.key === "Enter") loadAdminQueue();
  });
  updateExportControls();
  updateAdminSelectionControls();
}

function syncAdminTrustStorage(){
  if(!adminRememberPassword.checked) clearTrustedAdminDevice();
}

function ensureAdminDeviceId(){
  let deviceId = localStorage.getItem(ADMIN_DEVICE_ID_KEY) || "";
  if(/^[A-Za-z0-9_-]{16,80}$/.test(deviceId)) return deviceId;
  deviceId = makeAdminDeviceId();
  localStorage.setItem(ADMIN_DEVICE_ID_KEY, deviceId);
  return deviceId;
}

function makeAdminDeviceId(){
  const bytes = new Uint8Array(18);
  if(window.crypto && window.crypto.getRandomValues){
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte=>byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}`;
}

function getTrustedAdminDevice(){
  try{
    const record = JSON.parse(localStorage.getItem(ADMIN_TRUST_DEVICE_KEY) || "null");
    if(!record || typeof record !== "object") return null;
    if(record.deviceId !== ensureAdminDeviceId()) return null;
    if(typeof record.token !== "string" || !record.token) return null;
    if(record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()){
      clearTrustedAdminDevice();
      return null;
    }
    return record;
  }catch{
    clearTrustedAdminDevice();
    return null;
  }
}

function saveTrustedAdminDevice(device){
  if(!device || typeof device.token !== "string") return;
  if(!adminRememberPassword.checked) return;
  localStorage.setItem(ADMIN_TRUST_DEVICE_KEY, JSON.stringify({
    deviceId: device.deviceId || ensureAdminDeviceId(),
    token: device.token,
    expiresAt: device.expiresAt || ""
  }));
}

function clearTrustedAdminDevice(){
  localStorage.removeItem(ADMIN_TRUST_DEVICE_KEY);
}

async function adminRequest(action, extra={}){
  const config = window.LEADERBOARD_CONFIG || {};
  if(!config.adminFunctionUrl) throw new Error("Admin function is not configured.");
  syncAdminTrustStorage();

  const password = adminPassword.value;
  const trustedDevice = getTrustedAdminDevice();
  const requestBody = {
    action,
    deviceId: ensureAdminDeviceId(),
    ...extra
  };
  if(password){
    requestBody.password = password;
  }else if(trustedDevice){
    requestBody.adminToken = trustedDevice.token;
  }

  const response = await fetch(config.adminFunctionUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(requestBody)
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if(!response.ok){
    if(response.status === 401 && trustedDevice && !password){
      clearTrustedAdminDevice();
      throw new Error("Trusted admin device expired. Enter the admin password once to trust this device again.");
    }
    throw new Error(getAdminErrorMessage(payload, text, response.status));
  }
  if(payload.trustedAdminDevice) saveTrustedAdminDevice(payload.trustedAdminDevice);
  if(password) adminPassword.value = "";
  unlockAdminTools();
  return payload;
}

function unlockAdminTools(){
  adminTools.hidden = false;
  adminLoad.textContent = "Reload all runs";
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
  adminRefresh.disabled = true;
  setAdminStatus("Loading queue...");
  adminList.innerHTML = "";

  try{
    const payload = await adminRequest("list", {statusFilter:"all"});
    currentAdminRuns = Array.isArray(payload.runs) ? payload.runs : [];
    currentAdminView = "runs";
    selectedAdminRunIds.clear();
    renderFilteredAdminRuns();
  }catch(error){
    setAdminStatus(error.message || "Could not load admin queue.");
  }finally{
    adminLoad.disabled = false;
    adminRefresh.disabled = false;
  }
}

function renderFilteredAdminRuns(){
  if(currentAdminView !== "runs") return;
  currentAdminDuplicateCounts = buildAdminDuplicateCounts(currentAdminRuns);
  const runs = getFilteredAdminRuns();
  renderAdminRuns(runs);
  updateAdminSelectionControls(runs);

  const counts = {approved:0, pending:0, rejected:0};
  currentAdminRuns.forEach(run=>{
    if(Object.hasOwn(counts, run.status)) counts[run.status] += 1;
  });
  const duplicateGroups = new Set(currentAdminRuns
    .map(getAdminRunEvidenceKey)
    .filter(key=>(currentAdminDuplicateCounts.get(key) || 0) > 1)).size;
  setAdminStatus(
    `${runs.length} of ${currentAdminRuns.length} loaded runs shown. `
    + `${counts.pending} pending, ${counts.approved} approved, ${counts.rejected} rejected. `
    + `${duplicateGroups} duplicate evidence group${duplicateGroups === 1 ? "" : "s"}.`
  );
}

function getFilteredAdminRuns(){
  const status = adminRunStatusFilter.value || "pending";
  const age = adminRunAgeFilter.value || "24";
  const query = normaliseAdminSearch(adminRunSearch.value);
  const duplicatesOnly = adminRunDuplicatesOnly.checked;
  const cutoff = age === "all" ? null : Date.now() - Number(age) * 60 * 60 * 1000;

  return currentAdminRuns.filter(run=>{
    if(status !== "all" && run.status !== status) return false;
    if(duplicatesOnly && (currentAdminDuplicateCounts.get(getAdminRunEvidenceKey(run)) || 0) < 2) return false;
    if(cutoff !== null){
      const createdAt = new Date(run.created_at || 0).getTime();
      if(!Number.isFinite(createdAt) || createdAt < cutoff) return false;
    }
    return !query || getAdminRunSearchText(run).includes(query);
  });
}

function buildAdminDuplicateCounts(runs){
  const counts = new Map();
  for(const run of runs){
    const key = getAdminRunEvidenceKey(run);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function getAdminRunEvidenceKey(run){
  const route = (Array.isArray(run && run.route) ? run.route : []).map(entry=>[
    entry.index,
    entry.country,
    entry.answer,
    entry.shownMs,
    entry.firstInputMs,
    entry.firstSubmitMs,
    entry.solvedMs,
    entry.attempts,
    entry.wrongAttempts,
    entry.typedChars,
    entry.skipped
  ]);
  return JSON.stringify([
    run.mode_key,
    run.time_ms,
    run.correct_first_try,
    run.total,
    run.typed_chars,
    run.canonical_chars,
    run.wpm,
    run.splits,
    route
  ]);
}

function getAdminRunSearchText(run){
  const telemetry = run && run.telemetry && typeof run.telemetry === "object" ? run.telemetry : {};
  const antiCheat = run && run.anti_cheat && typeof run.anti_cheat === "object" ? run.anti_cheat : {};
  return normaliseAdminSearch([
    run.id,
    run.player_name,
    run.mode_key,
    run.status,
    run.set_label,
    run.continent,
    telemetry.playerId,
    telemetry.deviceNumber,
    antiCheat.submissionFingerprint,
    ...(Array.isArray(telemetry.knownPlayerNames) ? telemetry.knownPlayerNames : []),
    ...(Array.isArray(telemetry.leaderboardNames) ? telemetry.leaderboardNames : [])
  ].join(" "));
}

function normaliseAdminSearch(value){
  return String(value || "").trim().toLowerCase();
}

function toggleVisibleAdminRuns(){
  for(const run of getFilteredAdminRuns()){
    const id = Number(run.id);
    if(!Number.isInteger(id)) continue;
    if(adminSelectVisible.checked) selectedAdminRunIds.add(id);
    else selectedAdminRunIds.delete(id);
  }
  renderFilteredAdminRuns();
}

function updateAdminSelectionControls(visibleRuns=getFilteredAdminRuns()){
  const visibleIds = visibleRuns.map(run=>Number(run.id)).filter(Number.isInteger);
  const selectedVisible = visibleIds.filter(id=>selectedAdminRunIds.has(id)).length;
  adminSelectVisible.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length;
  adminSelectVisible.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
  adminBulkReject.disabled = selectedAdminRunIds.size === 0;
  adminBulkReject.textContent = selectedAdminRunIds.size
    ? `Reject selected (${selectedAdminRunIds.size})`
    : "Reject selected";
}

async function bulkRejectSelectedRuns(){
  const ids = Array.from(selectedAdminRunIds).filter(Number.isInteger).slice(0, 100);
  if(!ids.length) return;
  if(!window.confirm(`Reject ${ids.length} selected run${ids.length === 1 ? "" : "s"}?`)) return;

  adminBulkReject.disabled = true;
  setAdminStatus(`Rejecting ${ids.length} selected runs...`);
  try{
    const payload = await adminRequest("bulk-reject", {
      ids,
      note:"Bulk rejected by admin"
    });
    updateAdminRunsLocally(payload.runs || []);
    ids.forEach(id=>selectedAdminRunIds.delete(id));
    renderFilteredAdminRuns();
  }catch(error){
    setAdminStatus(error.message || "Could not reject selected runs.");
  }finally{
    updateAdminSelectionControls();
  }
}

function updateAdminRunsLocally(updatedRuns){
  const byId = new Map((Array.isArray(updatedRuns) ? updatedRuns : [])
    .map(run=>[Number(run.id), run]));
  currentAdminRuns = currentAdminRuns.map(run=>byId.get(Number(run.id)) || run);
}

async function loadAnalytics(){
  adminAnalytics.disabled = true;
  setAdminStatus("Loading analytics...");
  adminList.innerHTML = "";

  try{
    const payload = await adminRequest("analytics");
    currentAdminView = "analytics";
    renderAnalytics(payload.analytics || []);
    setAdminStatus(`${(payload.analytics || []).length} completed speedrun analytics records loaded.`);
  }catch(error){
    setAdminStatus(error.message || "Could not load analytics.");
  }finally{
    adminAnalytics.disabled = false;
  }
}

async function loadFeedback(){
  adminFeedback.disabled = true;
  setAdminStatus("Loading feedback...");
  adminList.innerHTML = "";

  try{
    const payload = await adminRequest("feedback");
    currentAdminView = "feedback";
    currentFeedbackSubmissions = Array.isArray(payload.feedback) ? payload.feedback : [];
    renderFeedbackSubmissions(currentFeedbackSubmissions);
    setAdminStatus(`${currentFeedbackSubmissions.length} feedback item${currentFeedbackSubmissions.length === 1 ? "" : "s"} loaded.`);
  }catch(error){
    currentFeedbackSubmissions = [];
    setAdminStatus(error.message || "Could not load feedback.");
  }finally{
    adminFeedback.disabled = false;
  }
}

function updateExportControls(){
  const filtered = adminExportScope.value === "filter";
  adminExportFilter.disabled = !filtered;
  adminExportFilter.closest(".control").classList.toggle("is-disabled", !filtered);
  if(!filtered) adminExportFilter.value = "";
}

async function exportCsv(){
  const exportScope = adminExportScope.value === "filter" ? "filter" : "all";
  const exportFilter = adminExportFilter.value.trim();
  if(exportScope === "filter" && !exportFilter){
    setAdminStatus("Enter at least one device number, player id, or player name before exporting.");
    adminExportFilter.focus();
    return;
  }

  adminExport.disabled = true;
  setAdminStatus("Preparing CSV export...");

  try{
    const payload = await adminRequest("export", {exportScope, exportFilter});
    downloadCsv(payload.filename || "flag-game-admin-export.csv", payload.csv || "");
    const limitText = payload.truncated ? " Export hit the row limit; narrow the filter for the full set." : "";
    setAdminStatus(`Exported ${payload.count || 0} rows to CSV.${limitText}`);
  }catch(error){
    setAdminStatus(error.message || "Could not export CSV.");
  }finally{
    adminExport.disabled = false;
  }
}

function downloadCsv(filename, csv){
  const blob = new Blob([csv], {type: "text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderAdminRuns(runs){
  adminList.innerHTML = "";
  if(!runs.length){
    const empty = document.createElement("p");
    empty.className = "empty-mini leaderboard-page-empty";
    empty.textContent = "No runs match these filters.";
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

function renderFeedbackSubmissions(items){
  currentFeedbackSubmissions = Array.isArray(items) ? items : [];
  adminList.innerHTML = "";
  if(!currentFeedbackSubmissions.length){
    const empty = document.createElement("p");
    empty.className = "empty-mini leaderboard-page-empty";
    empty.textContent = "No feedback submissions stored yet.";
    adminList.appendChild(empty);
    return;
  }

  adminList.appendChild(renderFeedbackControls(currentFeedbackSubmissions.length));
  for(const item of currentFeedbackSubmissions){
    adminList.appendChild(renderFeedbackSubmission(item));
  }
  updateFeedbackSelection();
}

function renderFeedbackControls(total){
  const controls = document.createElement("section");
  controls.className = "admin-feedback-controls";

  const selectAllLabel = document.createElement("label");
  selectAllLabel.className = "checkbox";
  const selectAll = document.createElement("input");
  selectAll.type = "checkbox";
  selectAll.id = "admin-feedback-select-all";
  selectAll.addEventListener("change", toggleAllFeedback);
  const selectAllText = document.createElement("span");
  selectAllText.textContent = `Select all ${total}`;
  selectAllLabel.append(selectAll, selectAllText);

  const selectionStatus = document.createElement("p");
  selectionStatus.id = "admin-feedback-selection-status";
  selectionStatus.className = "empty-mini admin-feedback-selection-status";

  const copySelected = document.createElement("button");
  copySelected.id = "admin-feedback-copy-selected";
  copySelected.className = "btn primary";
  copySelected.type = "button";
  copySelected.textContent = "Copy selected";
  copySelected.addEventListener("click", copySelectedFeedback);

  controls.append(selectAllLabel, selectionStatus, copySelected);
  return controls;
}

function renderFeedbackSubmission(item){
  const feedback = normaliseFeedbackItem(item);
  const card = document.createElement("article");
  card.className = "leaderboard-category-card admin-run-card admin-feedback-card";
  card.dataset.feedbackId = feedback.id;

  const heading = document.createElement("header");
  heading.className = "leaderboard-category-heading";
  const kicker = document.createElement("p");
  kicker.className = "panel-label";
  kicker.textContent = `${feedback.category} feedback`;
  const title = document.createElement("h2");
  title.textContent = feedback.name ? `${feedback.name} - ${formatDateTime(feedback.createdAt)}` : formatDateTime(feedback.createdAt);
  heading.append(kicker, title);

  const selectLabel = document.createElement("label");
  selectLabel.className = "checkbox admin-feedback-select";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "admin-feedback-checkbox";
  checkbox.value = feedback.id;
  checkbox.addEventListener("change", updateFeedbackSelection);
  const selectText = document.createElement("span");
  selectText.textContent = "Select";
  selectLabel.append(checkbox, selectText);

  const facts = document.createElement("div");
  facts.className = "leaderboard-expanded-facts";
  facts.append(
    factPill(`Created: ${formatDateTime(feedback.createdAt)}`),
    factPill(`Type: ${feedback.category}`),
    factPill(`Name: ${feedback.name || "anonymous"}`),
    factPill(`Page: ${feedback.pageUrl || "not specified"}`)
  );

  const message = document.createElement("p");
  message.className = "admin-feedback-message";
  message.textContent = feedback.message;

  const actions = document.createElement("div");
  actions.className = "result-actions";
  const copy = document.createElement("button");
  copy.className = "btn subtle";
  copy.type = "button";
  copy.textContent = "Copy";
  copy.addEventListener("click", ()=>copyFeedbackItems([feedback]));
  actions.appendChild(copy);

  card.append(heading, selectLabel, facts, message, actions);
  return card;
}

function toggleAllFeedback(event){
  const checked = event.currentTarget.checked;
  for(const checkbox of adminList.querySelectorAll(".admin-feedback-checkbox")){
    checkbox.checked = checked;
  }
  updateFeedbackSelection();
}

function updateFeedbackSelection(){
  const checkboxes = Array.from(adminList.querySelectorAll(".admin-feedback-checkbox"));
  const selected = checkboxes.filter(checkbox=>checkbox.checked);
  const selectAll = document.getElementById("admin-feedback-select-all");
  const status = document.getElementById("admin-feedback-selection-status");
  const copySelected = document.getElementById("admin-feedback-copy-selected");

  if(selectAll){
    selectAll.checked = checkboxes.length > 0 && selected.length === checkboxes.length;
    selectAll.indeterminate = selected.length > 0 && selected.length < checkboxes.length;
  }
  if(status){
    status.textContent = `${selected.length} of ${checkboxes.length} selected`;
  }
  if(copySelected){
    copySelected.disabled = selected.length === 0;
  }
}

async function copySelectedFeedback(){
  const selectedIds = Array.from(adminList.querySelectorAll(".admin-feedback-checkbox:checked"))
    .map(checkbox=>checkbox.value);
  const selected = currentFeedbackSubmissions
    .map(normaliseFeedbackItem)
    .filter(item=>selectedIds.includes(item.id));
  if(!selected.length){
    setAdminStatus("Select at least one feedback item to copy.");
    return;
  }
  await copyFeedbackItems(selected);
}

async function copyFeedbackItems(items){
  try{
    await writeClipboardText(items.map(formatFeedbackForAgent).join("\n\n---\n\n"));
    setAdminStatus(`Copied ${items.length} feedback item${items.length === 1 ? "" : "s"} to clipboard.`);
  }catch(error){
    setAdminStatus(error.message || "Could not copy feedback.");
  }
}

async function writeClipboardText(text){
  if(navigator.clipboard && window.isSecureContext){
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.className = "clipboard-fallback";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if(!copied) throw new Error("Clipboard copy failed.");
}

function formatFeedbackForAgent(item){
  const feedback = normaliseFeedbackItem(item);
  return [
    `Feedback #${feedback.id}`,
    `Submitted: ${formatDateTime(feedback.createdAt)}`,
    `Type: ${feedback.category}`,
    `Name: ${feedback.name || "anonymous"}`,
    `Page or area: ${feedback.pageUrl || "not specified"}`,
    "",
    "Suggestion:",
    feedback.message
  ].join("\n");
}

function normaliseFeedbackItem(item){
  const row = item && typeof item === "object" ? item : {};
  return {
    id: String(row.id || ""),
    createdAt: row.created_at || row.createdAt || "",
    category: String(row.category || "suggestion"),
    name: String(row.name || "").trim(),
    pageUrl: String(row.page_url || row.pageUrl || "").trim(),
    message: String(row.message || "").trim()
  };
}

function renderAdminRun(run){
  const card = document.createElement("article");
  const matchingEvidence = currentAdminDuplicateCounts.get(getAdminRunEvidenceKey(run)) || 1;
  card.className = `leaderboard-category-card admin-run-card is-${run.status || "pending"}${matchingEvidence > 1 ? " is-duplicate" : ""}`;
  card.dataset.runId = String(run.id || "");

  const selection = document.createElement("label");
  selection.className = "checkbox admin-run-selection";
  const selectionInput = document.createElement("input");
  selectionInput.type = "checkbox";
  selectionInput.className = "admin-run-select";
  selectionInput.value = String(run.id || "");
  selectionInput.checked = selectedAdminRunIds.has(Number(run.id));
  selectionInput.addEventListener("change", ()=>{
    const id = Number(run.id);
    if(selectionInput.checked) selectedAdminRunIds.add(id);
    else selectedAdminRunIds.delete(id);
    updateAdminSelectionControls();
  });
  const selectionText = document.createElement("span");
  selectionText.textContent = `Select run #${run.id}`;
  selection.append(selectionInput, selectionText);

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
  const telemetry = run.telemetry && typeof run.telemetry === "object" ? run.telemetry : {};
  const antiCheat = run.anti_cheat && typeof run.anti_cheat === "object" ? run.anti_cheat : {};
  const crossRun = antiCheat.crossRun && typeof antiCheat.crossRun === "object" ? antiCheat.crossRun : {};
  facts.append(
    factPill(`Run ID: ${run.id}`),
    factPill(`Created: ${new Date(run.created_at).toLocaleString()}`),
    factPill(`Set: ${run.set_label || run.continent || "All"}`),
    factPill(`Mode: ${formatAdminMode(run)}`),
    factPill(`Scope: ${run.game_scope || "countries"}`),
    factPill(`Review flags: ${reasons.length || 0}`),
    factPill(`Matching evidence: ${matchingEvidence}`),
    factPill(`Player ID: ${telemetry.playerId || "unknown"}`),
    factPill(`Device: ${telemetry.deviceNumber || "unknown"}`),
    factPill(`Fingerprint: ${antiCheat.submissionFingerprint || antiCheat.routeHash || "legacy"}`)
  );
  if(Number(crossRun.fingerprintMatches) > 0){
    facts.append(factPill(`Reused evidence: ${crossRun.fingerprintMatches}`));
  }
  if(Number(crossRun.routeOrderMatches) > 0){
    facts.append(factPill(`Matching routes: ${crossRun.routeOrderMatches}`));
  }
  if(Number(crossRun.timingReplayMatches) > 0){
    facts.append(factPill(`Timing matches: ${crossRun.timingReplayMatches}`));
    const matchedIds = (Array.isArray(crossRun.timingReplayRunIds) ? crossRun.timingReplayRunIds : [])
      .filter(id=>Number.isInteger(id) && id > 0).map(id=>`#${id}`);
    if(matchedIds.length) facts.append(factPill(`Earlier matching runs: ${matchedIds.join(", ")}`));
  }
  if(Number(crossRun.recentServerClientNames) > 1){
    facts.append(factPill(`Recent client names: ${crossRun.recentServerClientNames}`));
  }
  if(Number(crossRun.serverClientBurstRuns) > 1){
    facts.append(factPill(`Recent client burst: ${crossRun.serverClientBurstRuns}`));
  }
  if(run.reviewed_at) facts.append(factPill(`Reviewed: ${formatDateTime(run.reviewed_at)}`));
  if(run.review_note) facts.append(factPill(`Note: ${run.review_note}`));

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
  approve.textContent = run.status === "approved" ? "Approved" : "Approve";
  approve.disabled = run.status === "approved";
  approve.addEventListener("click", ()=>moderateRun(run.id, "approve", note.value, publicName.value));

  const reject = document.createElement("button");
  reject.className = "btn danger";
  reject.type = "button";
  reject.textContent = run.status === "rejected" ? "Rejected" : "Reject";
  reject.disabled = run.status === "rejected";
  reject.addEventListener("click", ()=>moderateRun(run.id, "reject", note.value));
  actions.append(approve, reject);

  card.append(selection, heading, renderReviewReasonPanel(run, reasons), facts, route, nameReview, note, actions);
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
    body.textContent = run.status === "approved"
      ? "This run is currently visible on the public leaderboard."
      : run.status === "rejected"
        ? "This run is retained as moderation history and is not public."
        : "This run is pending without a specific stored flag. Check the route and name before approving.";
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
  if(["reused-run-evidence", "repeated-run-route", "replayed-timing-pattern", "cross-run-check-unavailable", "rapid-identity-switching", "multi-account-submission-burst"].includes(String(reason || ""))){
    return "Cross-run review";
  }
  if(String(reason || "").includes("name")) return "Name review";
  return "Server review check";
}

function getReviewReasonDetail(reason){
  if(reason === "mechanical-answer-timing"){
    return "Recognition delays and typing durations follow a repeated mechanical pattern across several answers. Review the evidence; a single fast answer does not trigger this check.";
  }
  if(reason === "uniform-solve-timing"){
    return "Solve times stay unusually fixed while typing durations closely follow answer length. Both patterns together require review; steady typing alone is not enough.";
  }
  if(reason === "replayed-timing-pattern"){
    return "Detailed question timings match an earlier run, either exactly or after a uniform speed change. Review the linked run IDs; names and overall speed alone do not establish a match.";
  }
  if(reason === "cross-run-check-unavailable"){
    return "Historical evidence could not be checked. The run is held for review, not rejected or labelled as cheating.";
  }
  if(reason === "reused-run-evidence"){
    return "The signed route and timing evidence exactly matches an earlier submission.";
  }
  if(reason === "repeated-run-route"){
    return "The full question order matches earlier run evidence closely enough to require review.";
  }
  if(reason === "rapid-identity-switching"){
    return "Several display names were used recently by the same player or server-derived client identity.";
  }
  if(reason === "multi-account-submission-burst"){
    return "A server-derived client submitted an unusual burst of runs under several display names.";
  }
  if(String(reason || "").includes("name")){
    return "The public display name needs an admin decision before publication.";
  }
  if(String(reason || "").includes("manual-approval")){
    return "Automatic publication is paused; an admin must approve this run.";
  }
  if(String(reason || "").includes("duplicate")){
    return "The server found matching run evidence and blocked a replay.";
  }
  return "Server-side validation requested manual review before publication.";
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
  const card = adminList.querySelector(`[data-run-id="${id}"]`);
  const buttons = card ? Array.from(card.querySelectorAll("button")) : [];
  buttons.forEach(button=>{ button.disabled = true; });
  try{
    const payload = await adminRequest(action, {id, note, publicName});
    if(payload.run) updateAdminRunsLocally([payload.run]);
    selectedAdminRunIds.delete(Number(id));
    renderFilteredAdminRuns();
    setAdminStatus(`${action === "approve" ? "Approved" : "Rejected"} run ${id}. No queue reload was needed.`);
  }catch(error){
    setAdminStatus(error.message || "Could not update run.");
    buttons.forEach(button=>{ button.disabled = false; });
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

function formatDateTime(value){
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleString() : "unknown";
}

function formatAdminTime(ms){
  return QuizUI.formatTime(ms);
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
