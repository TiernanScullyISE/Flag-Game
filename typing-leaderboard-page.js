import {normaliseConfig} from './typing-core.js?v=named-passages-1';

const LANGUAGES = [
  ['english', 'English'],
  ['irish', 'Gaeilge'],
  ['python', 'Python'],
  ['java', 'Java']
];
const DURATIONS = [15, 30, 60, 90, 120, 300, 600, 1800, 3600];
const WORD_COUNTS = [10, 25, 50, 100, 250];
const languageFilter = document.getElementById('typing-leaderboard-language');
const modeFilter = document.getElementById('typing-leaderboard-mode');
const punctuationFilter = document.getElementById('typing-leaderboard-punctuation');
const refreshButton = document.getElementById('typing-leaderboards-refresh');
const status = document.getElementById('typing-leaderboards-status');
const grid = document.getElementById('typing-leaderboards-grid');
const boardCache = new Map();
let renderVersion = 0;

function getCategories(){
  const categories = [];
  for(const [language, languageLabel] of LANGUAGES){
    const punctuationOptions = ['python', 'java'].includes(language) ? [true] : [false, true];
    for(const punctuation of punctuationOptions){
      const suffix = punctuation ? ' · punctuation' : ' · plain';
      for(const target of DURATIONS) categories.push({language, languageLabel, mode:'time', target, punctuation, label:`${target < 180 ? `${target} seconds` : `${target / 60} minutes`}${suffix}`});
      for(const target of WORD_COUNTS) categories.push({language, languageLabel, mode:'words', target, punctuation, label:`${target} words${suffix}`});
      const entries=window.TypingPassages?.[language]?.entries || [];
      for(const entry of entries)categories.push({language,languageLabel,mode:'passage',target:entry.id,punctuation,label:`${entry.title}${suffix}`});
    }
  }
  categories.push(
    {language:'english', languageLabel:'English', mode:'alphabet', target:'alphabet', label:'Alphabet'},
    {language:'english', languageLabel:'English', mode:'pangram', target:'pangram', label:'Quick brown fox'}
  );
  return categories.map(category=>({...category, config:normaliseConfig(category)}));
}

async function requestBoard(config){
  const settings = window.LEADERBOARD_CONFIG;
  if(!settings?.typingFunctionUrl) throw new Error('Typing leaderboards are unavailable.');
  const headers = {apikey:settings.supabaseAnonKey, 'Content-Type':'application/json'};
  if(/^eyJ[^.]+\.[^.]+\.[^.]+$/.test(settings.supabaseAnonKey)) headers.Authorization = `Bearer ${settings.supabaseAnonKey}`;
  const response = await fetch(settings.typingFunctionUrl, {
    method:'POST', headers, signal:AbortSignal.timeout(10000), body:JSON.stringify({action:'board', config})
  });
  const body = await response.json();
  if(!response.ok) throw new Error(body.error || 'Typing leaderboard request failed.');
  return Array.isArray(body.rows) ? body.rows : [];
}

function makeTable(category){
  const card = document.createElement('section');
  card.className = 'leaderboard-category-card typing-leaderboard-card is-country-board';
  const heading = document.createElement('header');
  heading.className = 'leaderboard-category-heading';
  const titleWrap = document.createElement('div');
  titleWrap.className = 'leaderboard-category-title';
  const kicker = document.createElement('p');
  kicker.className = 'panel-label';
  const modeLabel = category.mode==='time' ? 'Timed' : category.mode==='words' ? 'Word count' : category.mode==='passage' ? 'Passage / script' : category.mode==='alphabet' ? 'Alphabet' : 'Quick brown fox';
  kicker.textContent = `Typing · ${category.languageLabel} · ${modeLabel}`;
  const title = document.createElement('h2');
  title.textContent = category.label;
  titleWrap.append(kicker,title);heading.append(titleWrap);
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th scope="col">Rank</th><th scope="col">Name</th><th scope="col">WPM</th><th scope="col">Accuracy</th></tr></thead>';
  const body = document.createElement('tbody');
  body.innerHTML = '<tr><td colspan="4">Loading records…</td></tr>';
  const tableWrap=document.createElement('div');tableWrap.className='typing-leaderboard-table-wrap';
  table.append(body);tableWrap.append(table);card.append(heading,tableWrap);
  return {card, body};
}

function categoryCacheKey(category){
  return JSON.stringify(category.config);
}

async function populateTable(table, version){
  const key = categoryCacheKey(table.category);
  try{
    const rows = boardCache.has(key) ? boardCache.get(key) : await requestBoard(table.category.config);
    boardCache.set(key, rows);
    if(version!==renderVersion || !table.body.isConnected)return;
    table.body.replaceChildren();
    rows.forEach((row, index)=>{
      const tr = document.createElement('tr');
      [index + 1, row.player_name || 'Player', Number(row.wpm).toFixed(1), `${Number(row.accuracy).toFixed(1)}%`].forEach(value=>{
        const td = document.createElement('td'); td.textContent = value; tr.append(td);
      });
      table.body.append(tr);
    });
    if(!rows.length)table.body.innerHTML='<tr><td colspan="4">No approved runs yet.</td></tr>';
  }catch{
    if(version===renderVersion && table.body.isConnected)table.body.innerHTML='<tr><td colspan="4">Leaderboard unavailable.</td></tr>';
  }
}

function syncModeFilter(){
  const englishPossible=['english','all'].includes(languageFilter.value);
  for(const value of ['alphabet','pangram']){
    const option=modeFilter.querySelector(`option[value="${value}"]`);
    option.hidden=!englishPossible;option.disabled=!englishPossible;
  }
  if(!englishPossible && ['alphabet','pangram'].includes(modeFilter.value))modeFilter.value='all';
}

function renderTypingLeaderboards(){
  syncModeFilter();
  const version=++renderVersion;
  const categories=getCategories().filter(category=>
    (languageFilter.value==='all' || category.language===languageFilter.value)
    && (modeFilter.value==='all' || category.mode===modeFilter.value)
    && (punctuationFilter.value==='all' || (category.config.punctuation ? 'punctuation' : 'plain')===punctuationFilter.value)
  );
  grid.replaceChildren();
  const tables=categories.map(category=>({category,...makeTable(category)}));
  grid.append(...tables.map(table=>table.card));
  status.textContent=`Loading ${categories.length} typing ${categories.length===1 ? 'leaderboard' : 'leaderboards'}…`;
  let completed=0;
  const queue=[...tables];
  const workers=Array.from({length:4},async()=>{
    while(queue.length){
      const table=queue.shift();
      await populateTable(table,version);
      completed+=1;
      if(version===renderVersion)status.textContent=`Loaded ${completed} of ${categories.length} typing leaderboards…`;
    }
  });
  Promise.all(workers).then(()=>{if(version===renderVersion)status.textContent=`Showing ${categories.length} public typing ${categories.length===1 ? 'leaderboard' : 'leaderboards'}.`;});
}

for(const filter of [languageFilter,modeFilter,punctuationFilter])filter.addEventListener('change',renderTypingLeaderboards);
refreshButton.addEventListener('click',()=>{boardCache.clear();renderTypingLeaderboards();});
renderTypingLeaderboards();
