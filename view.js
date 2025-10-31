const grid = document.getElementById("grid");

function init(){
  document.querySelectorAll('input[name="view-mode"]').forEach(r=>{
    r.addEventListener("change", update);
  });
  update();
}

async function update(){
  const mode = document.querySelector('input[name="view-mode"]:checked').value; // flags | capitals
  grid.innerHTML = "";

  if(mode==="flags"){
    for(const c of countries){
      const card=document.createElement("div");
      card.className="card";
      const img=await createFlagImg(c, 360, `Flag of ${c}`);
      img.classList.add("flag");
      const title=document.createElement("div");
      title.className="title"; title.textContent=c;
      const meta=document.createElement("div");
      meta.className="muted"; meta.textContent=`Continent: ${countryContinent[c]}`;
      card.append(img,title,meta);
      grid.appendChild(card);
    }
  }else{
    for(const c of countries){
      const card=document.createElement("div");
      card.className="card";
      const title=document.createElement("div");
      title.className="title"; title.textContent=c;
      const meta=document.createElement("div");
      meta.className="muted"; meta.textContent=`Capital: ${countryCapitals[c] || "Unknown"}`;
      card.append(title,meta);
      grid.appendChild(card);
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
