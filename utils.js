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

/* Flag helpers.

GitHub Pages should not depend on runtime country-name lookups. The complete
alpha-2 map in data.js lets the browser render direct FlagCDN URLs immediately.
*/

const FLAG_CDN_WIDTHS = [40, 80, 160, 320, 640, 1280];

function flagCdnUrl(alpha2,size=320){
  const cdnWidth = FLAG_CDN_WIDTHS.find(width=>width>=size) || FLAG_CDN_WIDTHS[FLAG_CDN_WIDTHS.length-1];
  return `https://flagcdn.com/w${cdnWidth}/${alpha2}.png`;
}

async function createFlagImg(country, size=320, fallbackLabel=""){
  const code = (alpha2Overrides[country] || "").toLowerCase();
  if(!code) return createFlagFallback(country, size, fallbackLabel);

  const img = document.createElement("img");
  img.alt = `Flag of ${country}`;
  img.loading = "lazy";
  img.decoding = "async";
  img.width = size;
  img.height = Math.round(size * 0.625);
  img.src = flagCdnUrl(code, size);
  img.referrerPolicy = "no-referrer";
  img.addEventListener("error", ()=>{
    const fallback = createFlagFallback(country, size, fallbackLabel);
    img.classList.forEach(className=>fallback.classList.add(className));
    img.replaceWith(fallback);
  }, {once:true});
  return img;
}

function createFlagFallback(country, size=320, fallbackLabel=""){
  const div=document.createElement("div");
  div.className="flag-fallback";
  div.style.width=`${size}px`;
  div.style.height=`${Math.round(size*0.625)}px`;
  div.textContent = fallbackLabel || `Flag of ${country}`;
  return div;
}

