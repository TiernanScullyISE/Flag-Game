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

/* Flag helpers */
async function getAlpha2(countryName){
  if(alpha2Overrides[countryName]) return alpha2Overrides[countryName];
  try{
    const resp = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true`);
    if(!resp.ok) throw new Error("not ok");
    const data = await resp.json();
    return (data && data[0] && data[0].cca2) ? data[0].cca2.toLowerCase() : null;
  }catch{ return null; }
}
function flagUrl(alpha2,size=320){ return `https://flagcdn.com/w${size}/${alpha2}.png`; }

async function createFlagImg(country,size=320,fallbackLabel=""){
  const img=document.createElement("img");
  img.alt=`Flag of ${country}`;
  img.loading="lazy";

  let code=alpha2Overrides[country]||null;
  if(!code) code = await getAlpha2(country);

  if(code){
    img.src = flagUrl(code,size);
  }else{
    const div=document.createElement("div");
    div.className="flag-fallback";
    div.style.width=`${size}px`;
    div.style.height=`${Math.round(size*0.625)}px`;
    div.textContent=fallbackLabel || `Flag of ${country}`;
    return div;
  }

  img.addEventListener("error",()=>{
    const div=document.createElement("div");
    div.className="flag-fallback";
    div.style.width=`${size}px`;
    div.style.height=`${Math.round(size*0.625)}px`;
    div.textContent=fallbackLabel || `Flag of ${country}`;
    img.replaceWith(div);
  });
  return img;
}
