const state = {
  reviseFlags: storage.get(LS_KEYS.reviseFlags, []),
  reviseCapitals: storage.get(LS_KEYS.reviseCapitals, [])
};

const reviseContinent = document.getElementById("revise-continent");
const listEl = document.getElementById("revise-list");

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
    r.addEventListener("change", update);
  });
  reviseContinent.addEventListener("change", update);

  update();
}

async function update(){
  const mode = document.querySelector('input[name="revise-mode"]:checked').value; // 'flags' | 'capitals'
  const continent = reviseContinent.value;

  listEl.innerHTML = "";
  let items = mode==="flags" ? [...state.reviseFlags] : [...state.reviseCapitals];
  if(continent!=="All"){
    items = items.filter(c=>countryContinent[c]===continent);
  }

  if(items.length===0){
    const p=document.createElement("p");
    p.style.color="#aab2c0"; p.style.padding="18px 6px";
    p.textContent = mode==="flags"
      ? "No flags in your revise list for this continent. Add some from Play."
      : "No capitals in your revise list for this continent. Add some from Play.";
    listEl.appendChild(p);
    return;
  }

  const header=document.createElement("h3");
  header.textContent = `${mode==="flags" ? "Flags" : "Capitals"} to Revise (${items.length} countries)`;
  listEl.appendChild(header);

  for(let i=0;i<items.length;i++){
    const country = items[i];
    const row = document.createElement("div");
    row.className="revise-item";

    if(mode==="flags"){
      const img=await createFlagImg(country, 90, "No flag");
      img.classList.add("revise-flag");
      row.appendChild(img);
      const label=document.createElement("div");
      label.textContent = `${i+1}. ${country}`;
      row.appendChild(label);
    }else{
      const label=document.createElement("div");
      label.innerHTML = `<strong>${i+1}. ${country}</strong> — Capital: <span style="color:#7bd09f">${countryCapitals[country] || "Unknown"}</span>`;
      row.appendChild(label);
    }

    listEl.appendChild(row);
  }
}

document.addEventListener("DOMContentLoaded", init);
