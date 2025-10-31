/* LocalStorage helpers */
const storage = {
  get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch{ return fallback; }
  },
  set(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
};

/* Normalise strings and fuzzy matching */
function normalise(s){
  return s.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu,"")
    .replace(/[^\p{L}\p{N} ]/gu,"").trim();
}
function levenshtein(a,b){
  a = normalise(a); b = normalise(b);
  const m=a.length,n=b.length;
  if(!m) return n; if(!n) return m;
  const dp=Array.from({length:m+1},()=>new Array(n+1));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1]===b[j-1]?0:1;
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}
function fuzzyMatch(input, answer){
  const a=normalise(input), b=normalise(answer);
  if(a===b) return true;
  const d=levenshtein(a,b);
  const threshold=Math.max(1,Math.floor(b.length*0.2));
  return d<=threshold;
}

/* Shuffle */
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=(Math.random()*(i+1))|0;
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}

/* ---------- Flag helpers: name-first strategy (GitHub Pages friendly) ----------

We avoid ISO lookups to restcountries (can be blocked or rate-limited) and instead:
1) Try CountryFlags API by country name (very permissive CORS).
2) If that fails for a special name, fall back to FlagCDN with a small alpha-2 map.

This makes flags load reliably on GitHub Pages.
------------------------------------------------------------------------------- */

/* Names that the CountryFlags API expects slightly differently */
const nameFixes = {
  "Türkiye": "Turkey",
  "Côte d’Ivoire": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Ivory Coast": "Ivory Coast",
  "Cape Verde": "Cape Verde",
  "Cabo Verde": "Cape Verde",
  "The Gambia": "Gambia",
  "United States": "United States of America",
  "United Kingdom": "United Kingdom",
  "Vatican City": "Vatican City",
  "Republic of the Congo": "Congo",
  "Democratic Republic of the Congo": "Democratic Republic of the Congo",
  "Timor-Leste": "East Timor",
  "Eswatini": "Eswatini",
  "Myanmar": "Myanmar",
  "North Macedonia": "North Macedonia",
  "Palestine": "Palestine",
  "São Tomé and Príncipe": "Sao Tome and Principe",
  "Micronesia": "Micronesia",
  "Solomon Islands": "Solomon Islands",
  "Marshall Islands": "Marshall Islands",
  "Antigua and Barbuda": "Antigua and Barbuda",
  "Saint Kitts and Nevis": "Saint Kitts and Nevis",
  "Saint Lucia": "Saint Lucia",
  "Saint Vincent and the Grenadines": "Saint Vincent and the Grenadines",
  "Trinidad and Tobago": "Trinidad and Tobago",
  "North Korea": "North Korea",
  "South Korea": "South Korea"
};

/* Minimal alpha-2 fallback for hard cases only */
const alpha2Fallback = {
  "Ivory Coast":"ci","Türkiye":"tr","United States":"us","United Kingdom":"gb",
  "Cabo Verde":"cv","Cape Verde":"cv","The Gambia":"gm","Czechia":"cz","Taiwan":"tw",
  "North Macedonia":"mk","South Korea":"kr","North Korea":"kp","Russia":"ru",
  "Vatican City":"va","Myanmar":"mm","Eswatini":"sz","Republic of the Congo":"cg",
  "Congo":"cg","Democratic Republic of the Congo":"cd","São Tomé and Príncipe":"st",
  "Sao Tome and Principe":"st","Palestine":"ps","Timor-Leste":"tl","East Timor":"tl",
  "Micronesia":"fm","Solomon Islands":"sb","Marshall Islands":"mh",
  "Antigua and Barbuda":"ag","Saint Kitts and Nevis":"kn",
  "Saint Lucia":"lc","Saint Vincent and the Grenadines":"vc","Trinidad and Tobago":"tt"
};

function flagCdnUrl(alpha2,size=320){
  return `https://flagcdn.com/w${size}/${alpha2}.png`;
}

/**
 * Create an <img> (or fallback <div>) for the flag of `country`.
 * Strategy:
 *  - First try CountryFlags API by name (generous matching, good CORS).
 *  - On error, try FlagCDN using alpha-2 fallback map for sticky names.
 */
async function createFlagImg(country, size=320, fallbackLabel=""){
  const displayName = nameFixes[country] || country;

  // Primary: CountryFlags by name
  const img = document.createElement("img");
  img.alt = `Flag of ${country}`;
  img.loading = "lazy";
  img.decoding = "async";
  img.width = size;
  img.height = Math.round(size * 0.625);
  img.src = `https://countryflagsapi.com/png/${encodeURIComponent(displayName)}`;
  img.referrerPolicy = "no-referrer";

  // If it loads, great
  let loaded = false;
  const ok = new Promise(res=>{
    img.addEventListener("load", ()=>{ loaded=true; res(true); }, {once:true});
    img.addEventListener("error", ()=>res(false), {once:true});
  });

  const success = await ok;
  if(success){
    return img;
  }

  // Fallback to FlagCDN for the tricky ones
  const code = (alpha2Fallback[country] || alpha2Fallback[displayName] || "").toLowerCase();
  if(code){
    img.src = flagCdnUrl(code, size);
    const ok2 = await new Promise(res=>{
      img.addEventListener("load", ()=>res(true), {once:true});
      img.addEventListener("error", ()=>res(false), {once:true});
    });
    if(ok2) return img;
  }

  // Final text fallback
  const div=document.createElement("div");
  div.className="flag-fallback";
  div.style.width=`${size}px`;
  div.style.height=`${Math.round(size*0.625)}px`;
  div.style.display="grid";
  div.style.placeItems="center";
  div.textContent = fallbackLabel || `Flag of ${country}`;
  return div;
}

