const grid = document.getElementById("grid");
const browseSearch = document.getElementById("browse-search");
const browseCount = document.getElementById("browse-count");
let browseRenderVersion = 0;

function init(){
  document.querySelectorAll('input[name="view-mode"]').forEach(r=>{
    r.addEventListener("change", update);
  });
  browseSearch.addEventListener("input", update);
  update();
}

async function update(){
  const version = ++browseRenderVersion;
  const mode = document.querySelector('input[name="view-mode"]:checked').value;
  const query = normalise(browseSearch.value);
  const filtered = countries.filter(country=>normalise(
    `${country} ${countryCapitals[country] || ""} ${countryContinent[country] || ""}`
  ).includes(query));
  const fragment = document.createDocumentFragment();
  for(const country of filtered){
    const card = document.createElement("div");
    card.className = "card";
    if(mode === "flags"){
      const img = await createFlagImg(country, 360, `Flag of ${country}`);
      if(version !== browseRenderVersion) return;
      img.classList.add("flag");
      card.appendChild(img);
    }
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = country;
    const meta = document.createElement("div");
    meta.className = "muted";
    meta.textContent = mode === "flags"
      ? `Continent: ${countryContinent[country]}`
      : `Capital: ${countryCapitals[country] || "Unknown"}`;
    card.append(title, meta);
    fragment.appendChild(card);
  }
  if(!filtered.length){
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No countries match. Try another country, capital or continent.";
    fragment.appendChild(empty);
  }
  if(version !== browseRenderVersion) return;
  grid.replaceChildren(fragment);
  browseCount.textContent = `${filtered.length} of ${countries.length} countries`;
}

document.addEventListener("DOMContentLoaded", init);
