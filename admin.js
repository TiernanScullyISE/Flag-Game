const adminPassword = document.getElementById("admin-password");
const adminLoad = document.getElementById("admin-load");
const adminAnalytics = document.getElementById("admin-analytics");
const adminStatus = document.getElementById("admin-status");
const adminList = document.getElementById("admin-list");

function initAdmin(){
  adminPassword.value = sessionStorage.getItem("leaderboard_admin_password") || "";
  adminLoad.addEventListener("click", loadAdminQueue);
  adminAnalytics.addEventListener("click", loadAnalytics);
  adminPassword.addEventListener("keydown", event=>{
    if(event.key === "Enter") loadAdminQueue();
  });
}

async function adminRequest(action, extra={}){
  const config = window.LEADERBOARD_CONFIG || {};
  if(!config.adminFunctionUrl) throw new Error("Admin function is not configured.");
  const password = adminPassword.value;
  sessionStorage.setItem("leaderboard_admin_password", password);

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
    return "Analytics table is missing from Supabase schema cache. Run the updated supabase/leaderboard.sql in Supabase SQL Editor, then try Load analytics again.";
  }
  try{
    const nested = JSON.parse(raw);
    if(nested.code === "PGRST205" && String(nested.message || "").includes("speedrun_analytics")){
      return "Analytics table is missing from Supabase schema cache. Run the updated supabase/leaderboard.sql in Supabase SQL Editor, then try Load analytics again.";
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

  for(const record of records){
    adminList.appendChild(renderAnalyticsRecord(record));
  }
}

function renderAnalyticsRecord(record){
  const card = document.createElement("article");
  card.className = "leaderboard-category-card admin-run-card";

  const heading = document.createElement("header");
  heading.className = "leaderboard-category-heading";
  const kicker = document.createElement("p");
  kicker.className = "panel-label";
  kicker.textContent = `${record.which} - ${record.continent} - ${record.target_label}`;
  const title = document.createElement("h2");
  title.textContent = `${record.player_name} - ${formatAdminTime(record.time_ms)}`;
  heading.append(kicker, title);

  const facts = document.createElement("div");
  facts.className = "leaderboard-expanded-facts";
  facts.append(
    factPill(`Created: ${new Date(record.created_at).toLocaleString()}`),
    factPill(`WPM: ${formatAdminNumber(record.wpm)}`),
    factPill(`Accuracy: ${record.correct_first_try}/${record.total}`),
    factPill(`Recognition avg: ${formatAdminMs(record.avg_recognition_ms)}`),
    factPill(`Typing avg: ${formatAdminMs(record.avg_typing_ms)}`),
    factPill(`Solve avg: ${formatAdminMs(record.avg_solve_ms)}`)
  );

  const flags = Array.isArray(record.quality_flags) ? record.quality_flags : [];
  if(flags.length) facts.append(factPill(`Flags: ${flags.join(", ")}`));

  const route = document.createElement("ol");
  route.className = "leaderboard-route-list";
  const metrics = record.metrics && typeof record.metrics === "object" ? record.metrics : {};
  const perQuestion = Array.isArray(metrics.perQuestion) ? metrics.perQuestion : [];
  for(const entry of perQuestion.slice(0, 40)){
    const item = document.createElement("li");
    item.textContent = `${entry.index}. ${entry.country} - recognise ${formatAdminMs(entry.recognitionMs)}, type ${formatAdminMs(entry.typingMs)}, solve ${formatAdminMs(entry.solveMs)} - ${entry.attempts || 0} attempts`;
    route.appendChild(item);
  }

  if(perQuestion.length > 40){
    const item = document.createElement("li");
    item.textContent = `${perQuestion.length - 40} more question records hidden in this view.`;
    route.appendChild(item);
  }

  card.append(heading, facts, route);
  return card;
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
    factPill(`Score: ${run.anti_cheat && run.anti_cheat.score !== undefined ? run.anti_cheat.score : "-"}`),
    factPill(`Reasons: ${reasons.length ? reasons.join(", ") : "none"}`)
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

  card.append(heading, facts, route, nameReview, note, actions);
  return card;
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
  const value = Number(ms);
  if(!Number.isFinite(value)) return "-";
  return `${Math.round(value)} ms`;
}

function formatAdminNumber(value){
  const number = Number(value);
  if(!Number.isFinite(number)) return "-";
  return number >= 100 ? String(Math.round(number)) : number.toFixed(1);
}

document.addEventListener("DOMContentLoaded", initAdmin);
