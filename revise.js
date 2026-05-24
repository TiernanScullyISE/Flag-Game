const state = {
  reviseScope: "countries",
  selectedRegionGroup: DEFAULT_REGION_GAME_GROUP,
  reviseFlags: storage.get(LS_KEYS.reviseFlags, []),
  reviseCapitals: storage.get(LS_KEYS.reviseCapitals, []),
  reviseRegionFlags: storage.get(LS_KEYS.reviseRegionFlags, {}),
  reviseRegionCapitals: storage.get(LS_KEYS.reviseRegionCapitals, {})
};

const scopeButtons = Array.from(document.querySelectorAll(".revise-scope-segment"));
const reviseContinent = document.getElementById("revise-continent");
const reviseContinentLabel = document.getElementById("revise-continent-label");
const reviseRegionSetInput = document.getElementById("revise-region-set-input");
const reviseRegionSetOptions = document.getElementById("revise-region-set-options");
const listEl = document.getElementById("revise-list");
let flashcardIndex = 0;

function init(){
  populateContinents();
  populateRegionSets();

  scopeButtons.forEach(button=>{
    button.addEventListener("click", ()=>{
      if(state.reviseScope === button.dataset.reviseScope) return;
      state.reviseScope = button.dataset.reviseScope;
      flashcardIndex = 0;
      syncScopeUi();
      update();
    });
  });

  document.querySelectorAll('input[name="revise-mode"]').forEach(radio=>{
    radio.addEventListener("change", ()=>{
      flashcardIndex = 0;
      update();
    });
  });
  reviseContinent.addEventListener("change", ()=>{
    flashcardIndex = 0;
    update();
  });
  reviseRegionSetInput.addEventListener("change", applyRegionSetInput);
  reviseRegionSetInput.addEventListener("keydown", event=>{
    if(event.key === "Enter"){
      event.preventDefault();
      applyRegionSetInput();
    }
  });

  syncScopeUi();
  update();
}

function populateContinents(){
  const continents = Array.from(new Set(Object.values(countryContinent))).sort();
  reviseContinent.innerHTML = "";
  for(const value of ["All", ...continents]){
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    reviseContinent.appendChild(option);
  }
  reviseContinent.value = "All";
}

function populateRegionSets(){
  reviseRegionSetOptions.innerHTML = "";
  for(const key of REGION_GAME_GROUP_ORDER){
    const group = REGION_GAME_GROUPS[key];
    const option = document.createElement("option");
    option.value = group.label;
    reviseRegionSetOptions.appendChild(option);
  }
  reviseRegionSetInput.value = getRegionGroupConfig().label;
}

function syncScopeUi(){
  document.body.dataset.reviseScope = state.reviseScope;
  scopeButtons.forEach(button=>{
    button.classList.toggle("active", button.dataset.reviseScope === state.reviseScope);
  });
  if(reviseContinentLabel) reviseContinentLabel.textContent = "Continent";
  reviseRegionSetInput.value = getRegionGroupConfig().label;
  updateModeLabels();
}

function applyRegionSetInput(){
  const nextGroup = resolveRegionGroupName(reviseRegionSetInput.value);
  if(!nextGroup){
    reviseRegionSetInput.value = getRegionGroupConfig().label;
    return;
  }
  state.selectedRegionGroup = nextGroup;
  reviseRegionSetInput.value = getRegionGroupConfig().label;
  flashcardIndex = 0;
  updateModeLabels();
  update();
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

async function update(){
  const mode = getMode();
  const items = getRevisionItems(mode);

  listEl.innerHTML = "";
  if(items.length === 0){
    const p = document.createElement("p");
    p.className = "empty-state";
    p.textContent = getEmptyText(mode);
    listEl.appendChild(p);
    return;
  }

  const header = document.createElement("h3");
  header.textContent = `${getModeTitle(mode)} (${items.length} ${getItemPluralLabel()})`;
  listEl.appendChild(header);

  if(mode === "flashcards"){
    await renderFlashcard(items);
    return;
  }

  for(let i=0;i<items.length;i++){
    const itemName = items[i];
    const row = document.createElement("div");
    row.className = "revise-item";

    if(mode === "flags"){
      const img = await createRevisionFlag(itemName, 90);
      img.classList.add("revise-flag");
      row.appendChild(img);
      const label = document.createElement("div");
      label.textContent = `${i + 1}. ${itemName}`;
      row.appendChild(label);
    }else if(mode === "capitals"){
      const label = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = `${i + 1}. ${itemName}`;
      const capital = document.createElement("span");
      capital.className = "muted";
      capital.textContent = ` ${getCapitalLabel()}: ${getCapitalName(itemName)}`;
      label.append(strong, capital);
      row.appendChild(label);
    }

    listEl.appendChild(row);
  }
}

function getRevisionItems(mode){
  let items;
  if(isRegionScope()){
    if(mode === "flags"){
      items = getRegionReviseList("flags");
    }else if(mode === "capitals"){
      items = getRegionReviseList("capitals");
    }else{
      items = getRegionItemNames();
    }
  }else{
    items = mode === "flags"
      ? [...state.reviseFlags]
      : mode === "capitals"
        ? [...state.reviseCapitals]
        : [...countries];
    if(reviseContinent.value !== "All"){
      items = items.filter(country=>countryContinent[country] === reviseContinent.value);
    }
  }

  items = Array.from(new Set(items)).filter(Boolean);
  if(mode === "flashcards" || mode === "capitals"){
    items.sort((a, b)=>getCapitalName(a).localeCompare(getCapitalName(b)));
  }else{
    items.sort((a, b)=>a.localeCompare(b));
  }
  return items;
}

function getRegionReviseList(kind){
  const store = kind === "flags" ? state.reviseRegionFlags : state.reviseRegionCapitals;
  const list = store && Array.isArray(store[state.selectedRegionGroup]) ? store[state.selectedRegionGroup] : [];
  const valid = new Set(kind === "flags" ? getRegionFlagItemNames() : getRegionItemNames());
  return list.filter(item=>valid.has(item));
}

function getRegionFlagItemNames(){
  const group = getRegionGroupConfig();
  return getRegionItems()
    .filter(item=>item.flagUrl || item.flagFile || group.flagFileTemplate || group.key === "United States" || (Array.isArray(item.colours) && item.colours.length))
    .map(item=>item.name);
}

async function createRevisionFlag(itemName, size){
  if(isRegionScope() && window.RegionMap && typeof window.RegionMap.createFlagElement === "function"){
    return window.RegionMap.createFlagElement(state.selectedRegionGroup, itemName, size);
  }
  return createFlagImg(itemName, size, "No flag");
}

async function renderFlashcard(items){
  flashcardIndex = Math.max(0, Math.min(flashcardIndex, items.length - 1));
  const itemName = items[flashcardIndex];
  const viewer = document.createElement("div");
  viewer.className = "revise-item revise-flashcard";
  viewer.setAttribute("aria-label", `${getCapitalName(itemName)} in ${itemName}`);

  const map = document.createElement("div");
  map.className = "revise-flashcard-map";
  viewer.appendChild(map);

  const controls = document.createElement("div");
  controls.className = "revise-flashcard-controls";
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "btn subtle";
  previous.textContent = "Previous";
  const counter = document.createElement("span");
  counter.className = "revise-flashcard-counter";
  counter.textContent = `${flashcardIndex + 1} / ${items.length}`;
  const next = document.createElement("button");
  next.type = "button";
  next.className = "btn subtle";
  next.textContent = "Next";
  previous.addEventListener("click", ()=>{
    flashcardIndex = (flashcardIndex - 1 + items.length) % items.length;
    update();
  });
  next.addEventListener("click", ()=>{
    flashcardIndex = (flashcardIndex + 1) % items.length;
    update();
  });
  controls.append(previous, counter, next);
  viewer.appendChild(controls);
  listEl.appendChild(viewer);

  if(isRegionScope()){
    if(window.RegionMap && typeof window.RegionMap.renderFocus === "function"){
      try{
        await window.RegionMap.renderFocus(map, state.selectedRegionGroup, itemName, {
          showCaption:true,
          showCapitalMarker:true,
          showCapitalLabel:true
        });
      }catch(error){
        renderFlashcardMessage(map, error && error.message ? error.message : "Regional map could not load.");
      }
    }else{
      renderFlashcardFallback(map, itemName);
    }
    return;
  }

  if(window.CountryFocusMap && typeof window.CountryFocusMap.render === "function"){
    await window.CountryFocusMap.render(map, itemName, {
      continent: countryContinent[itemName] || undefined,
      showCountryName:true,
      showCapital:true,
      showCapitalUnderName:true
    });
  }else{
    renderFlashcardFallback(map, itemName);
  }
}

function renderFlashcardFallback(target, itemName){
  const fallback = document.createElement("div");
  fallback.className = "empty-state";
  fallback.textContent = getCapitalName(itemName);
  target.replaceChildren(fallback);
}

function renderFlashcardMessage(target, message){
  const fallback = document.createElement("div");
  fallback.className = "empty-state";
  fallback.textContent = message;
  target.replaceChildren(fallback);
}

function getMode(){
  return document.querySelector('input[name="revise-mode"]:checked').value;
}

function updateModeLabels(){
  const labels = isRegionScope()
    ? {
      capitals: `${getShortRegionCapitalLabel(getRegionGroupConfig())} Revise`,
      flags: "Flags Revise",
      flashcards: `${getShortRegionCapitalLabel(getRegionGroupConfig())} Flashcards`
    }
    : {
      capitals: "Capital Revise",
      flags: "Flag Revise",
      flashcards: "Capital Flashcards"
    };
  document.querySelectorAll('input[name="revise-mode"]').forEach(input=>{
    const label = input.closest("label");
    const span = label ? label.querySelector("span") : null;
    if(span && labels[input.value]) span.textContent = labels[input.value];
  });
}

function isRegionScope(){
  return state.reviseScope === "regions";
}

function getRegionGroupConfig(){
  return REGION_GAME_GROUPS[state.selectedRegionGroup] || REGION_GAME_GROUPS[DEFAULT_REGION_GAME_GROUP];
}

function getRegionItems(){
  const group = getRegionGroupConfig();
  return Array.isArray(group.items) ? group.items : [];
}

function getRegionItemNames(){
  return getRegionItems().map(item=>item.name);
}

function getRegionItem(itemName){
  const key = normalise(itemName);
  return getRegionItems().find(item=>normalise(item.name) === key) || null;
}

function getCapitalName(itemName){
  if(isRegionScope()){
    const item = getRegionItem(itemName);
    return item ? item.capital : "Unknown";
  }
  return countryCapitals[itemName] || "Unknown";
}

function getCapitalLabel(){
  return isRegionScope() ? capitalise(getRegionGroupConfig().capitalLabel) : "Capital";
}

function getItemPluralLabel(){
  return isRegionScope() ? getRegionGroupConfig().itemPluralLabel : "countries";
}

function getModeTitle(mode){
  if(isRegionScope()){
    const group = getRegionGroupConfig();
    const capitalLabel = getShortRegionCapitalLabel(group);
    if(mode === "flags") return "Flags to Revise";
    if(mode === "flashcards") return `${capitalLabel} Flashcards`;
    return `${capitalLabel} to Revise`;
  }
  if(mode === "flags") return "Flags to Revise";
  if(mode === "flashcards") return "Capital Flashcards";
  return "Capitals to Revise";
}

function getEmptyText(mode){
  if(isRegionScope()){
    const group = getRegionGroupConfig();
    if(mode === "flags") return `No ${group.itemLabel} flags in your revise list for ${group.label}. Add some from Play.`;
    if(mode === "flashcards") return `No ${group.itemPluralLabel} are available for ${group.label}.`;
    return `No ${group.capitalPluralLabel} in your revise list for ${group.label}. Add some from Play.`;
  }
  if(mode === "flags") return "No flags in your revise list for this continent. Add some from Play.";
  if(mode === "flashcards") return "No countries are available for this continent.";
  return "No capitals in your revise list for this continent. Add some from Play.";
}

function capitalise(value){
  const text = String(value || "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "";
}

function getShortRegionCapitalLabel(group){
  const label = normalise(group.capitalPluralLabel || group.capitalLabel || "");
  if(label.includes("town")) return "Towns";
  if(label.includes("centre") || label.includes("center")) return "Centres";
  return "Capitals";
}

document.addEventListener("DOMContentLoaded", init);
