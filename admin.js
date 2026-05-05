const adminPassword = document.getElementById("admin-password");
const adminLoad = document.getElementById("admin-load");
const adminStatus = document.getElementById("admin-status");
const adminList = document.getElementById("admin-list");

function initAdmin(){
  adminPassword.value = sessionStorage.getItem("leaderboard_admin_password") || "";
  adminLoad.addEventListener("click", loadAdminQueue);
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
  if(!response.ok) throw new Error(payload.error || text || `Admin request failed (${response.status}).`);
  return payload;
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

document.addEventListener("DOMContentLoaded", initAdmin);
