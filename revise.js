const state = {
  reviseFlags: storage.get(LS_KEYS.reviseFlags, []),
  reviseCapitals: storage.get(LS_KEYS.reviseCapitals, [])
};

const reviseContinent = document.getElementById("revise-continent");
const listEl = document.getElementById("revise-list");
let flashcardIndex = 0;

function init(){
  const continents = Array.from(new Set(Object.values(countryContinent))).sort();
  reviseContinent.innerHTML = "";
  for(const v of ["All", ...continents]){
    const o=document.createElement("option");
    o.value=v; o.textContent=v;
    reviseContinent.appendChild(o);
  }
  reviseContinent.value="All";

  document.querySelectorAll('input[name="revise-mode"]').forEach(r=>{
    r.addEventListener("change", ()=>{
      flashcardIndex = 0;
      update();
    });
  });
  reviseContinent.addEventListener("change", ()=>{
    flashcardIndex = 0;
    update();
  });

  update();
}

async function update(){
  const mode = document.querySelector('input[name="revise-mode"]:checked').value; // 'flags' | 'capitals' | 'flashcards'
  const continent = reviseContinent.value;

  listEl.innerHTML = "";
  let items = mode==="flags"
    ? [...state.reviseFlags]
    : mode==="capitals"
      ? [...state.reviseCapitals]
      : [...countries];
  if(continent!=="All"){
    items = items.filter(c=>countryContinent[c]===continent);
  }
  if(mode==="flashcards"){
    items.sort((a, b)=>(countryCapitals[a] || a).localeCompare(countryCapitals[b] || b));
  }

  if(items.length===0){
    const p=document.createElement("p");
    p.className = "empty-state";
    p.textContent = getEmptyText(mode);
    listEl.appendChild(p);
    return;
  }

  const header=document.createElement("h3");
  header.textContent = `${getModeTitle(mode)} (${items.length} countries)`;
  listEl.appendChild(header);

  if(mode==="flashcards"){
    await renderFlashcard(items);
    return;
  }

  for(let i=0;i<items.length;i++){
    const country = items[i];
    const row = document.createElement("div");
    row.className = "revise-item";

    if(mode==="flags"){
      const img=await createFlagImg(country, 90, "No flag");
      img.classList.add("revise-flag");
      row.appendChild(img);
      const label=document.createElement("div");
      label.textContent = `${i+1}. ${country}`;
      row.appendChild(label);
    }else if(mode==="capitals"){
      const label=document.createElement("div");
      const strong=document.createElement("strong");
      strong.textContent = `${i+1}. ${country}`;
      const capital=document.createElement("span");
      capital.className = "muted";
      capital.textContent = ` Capital: ${countryCapitals[country] || "Unknown"}`;
      label.append(strong, capital);
      row.appendChild(label);
    }

    listEl.appendChild(row);
  }
}

async function renderFlashcard(items){
  flashcardIndex = Math.max(0, Math.min(flashcardIndex, items.length - 1));
  const country = items[flashcardIndex];
  const viewer = document.createElement("div");
  viewer.className = "revise-item revise-flashcard";
  viewer.setAttribute("aria-label", `${countryCapitals[country] || "Capital"} in ${country}`);

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

  if(window.CountryFocusMap && typeof window.CountryFocusMap.render === "function"){
    await window.CountryFocusMap.render(map, country, {
      continent: countryContinent[country] || undefined,
      showCountryName:true,
      showCapital:true
    });
  }else{
    const fallback=document.createElement("div");
    fallback.className = "empty-state";
    fallback.textContent = countryCapitals[country] || "Capital";
    map.replaceChildren(fallback);
  }
}

function getModeTitle(mode){
  if(mode==="flags") return "Flags to Revise";
  if(mode==="flashcards") return "Capital Flashcards";
  return "Capitals to Revise";
}

function getEmptyText(mode){
  if(mode==="flags") return "No flags in your revise list for this continent. Add some from Play.";
  if(mode==="flashcards") return "No countries are available for this continent.";
  return "No capitals in your revise list for this continent. Add some from Play.";
}

document.addEventListener("DOMContentLoaded", init);
