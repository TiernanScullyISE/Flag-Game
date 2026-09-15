import {normaliseConfig,categoryKey,makeText,scoreText} from './typing-core.js?v=named-passages-1';
const $=id=>document.getElementById(id);
const input=$('typing-input'),language=$('typing-language'),duration=$('typing-duration'),mode=$('typing-mode'),punctuation=$('typing-punctuation');
const englishOnlyModes=Array.from(mode.querySelectorAll('[data-english-only]'));
const STORE='typing-studio-records-v2';
let run,interval,composing=false,boardVersion=0,pendingInput='';
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)) || fallback;}catch{return fallback;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function config(){return normaliseConfig({language:language.value,mode:mode.value,target:mode.value==='time' ? Number(duration.value) : mode.value==='words' ? Number($('typing-count').value) : mode.value==='passage' ? $('typing-length').value : mode.value,punctuation:punctuation.checked});}
function clock(ms){const s=Math.ceil(ms/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function label(c=config()){
  const entry=c.mode==='passage' ? getPassageEntry(c) : null;
  const target=c.mode==='time' ? (c.target<180 ? `${c.target} seconds` : `${c.target/60} minutes`) : c.mode==='words' ? `${c.target} words` : c.mode==='passage' ? entry?.title || c.target : c.mode==='alphabet' ? 'alphabet' : 'quick brown fox';
  return `${window.TypingData.languages[c.language].label} · ${target} · ${c.punctuation ? 'punctuation' : 'plain'}`;
}
function getPassageEntry(c=config()){return (window.TypingPassages[c.language]?.entries || []).find(entry=>entry.id===c.target) || null;}
function syncPassageOptions(){
  const select=$('typing-length'),selected=select.value,entries=window.TypingPassages[language.value]?.entries || [];
  select.replaceChildren();
  for(const entry of entries){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.title;select.append(option);}
  if(entries.some(entry=>entry.id===selected))select.value=selected;
}
async function api(action,extra={},timeout=10000){
  const c=window.LEADERBOARD_CONFIG;
  if(!c?.typingFunctionUrl)throw new Error('Online typing is unavailable.');
  const headers={apikey:c.supabaseAnonKey,'Content-Type':'application/json'};
  if(/^eyJ[^.]+\.[^.]+\.[^.]+$/.test(c.supabaseAnonKey))headers.Authorization=`Bearer ${c.supabaseAnonKey}`;
  const response=await fetch(c.typingFunctionUrl,{method:'POST',headers,signal:AbortSignal.timeout(timeout),body:JSON.stringify({action,...extra})});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error || 'Online typing is unavailable.');
  return result;
}
function elapsed(r=run){
  if(r.finalMs!==null)return r.finalMs;
  if(r.started===null)return 0;
  const ms=Math.max(performance.now()-r.started,Date.now()-r.wallStarted);
  return r.config.mode==='time' ? Math.min(r.config.target*1000,ms) : ms;
}
function metrics(r=run){return scoreText(r.target,r.text,r.attempts,r.hits,r.corrections,elapsed(r));}
function drawText(){
  const pos=run.text.length;
  // Keep ordinary and passage tests as one vertically scrolling document. Only
  // the very long timers use a bounded window to avoid creating tens of
  // thousands of DOM nodes.
  const bounded=run.config.mode==='time' && run.config.target>=1800;
  let from=bounded ? Math.max(0,pos-160) : 0;
  if(from>0){
    const newline=run.prompt.indexOf('\n',from);
    if(newline>=from && newline<pos-60)from=newline+1;
  }
  const to=bounded ? Math.min(run.target.length,pos+650) : run.target.length,fragment=document.createDocumentFragment();
  for(let i=from;i<to;i++){
    const span=document.createElement('span');span.className='typing-char';span.textContent=run.target[i];
    if(i<pos)span.classList.add(run.text[i]===run.target[i] ? 'correct' : 'wrong');
    if(i===pos){span.classList.add('caret');span.id='typing-caret';}
    fragment.append(span);
  }
  const prompt=$('typing-prompt');prompt.replaceChildren(fragment);
  const caret=$('typing-caret');
  if(caret)prompt.scrollTop=Math.max(0,caret.offsetTop-prompt.clientHeight*.35);
  $('typing-current').textContent=`Next text: ${run.prompt.slice(pos,pos+100)}`;
}
function updateLive(){
  const ms=elapsed(),v=metrics();
  $('typing-remaining').textContent=run.config.mode==='time' ? clock(Math.max(0,run.config.target*1000-ms)) : clock(ms);
  $('typing-remaining').nextElementSibling.textContent=run.config.mode==='time' ? 'remaining' : 'elapsed';
  $('typing-wpm').textContent=Math.round(v.wpm);$('typing-accuracy').textContent=`${Math.round(v.accuracy)}%`;
  const progress=run.config.mode==='time' ? 1-ms/(run.config.target*1000) : run.text.length/run.prompt.length;
  $('typing-progress-fill').style.width=`${progress*100}%`;
}
function controls(){
  const englishOnly=language.value==='english';
  if(!englishOnly && ['alphabet','pangram'].includes(mode.value))mode.value='time';
  englishOnlyModes.forEach(option=>{
    if(englishOnly && !mode.contains(option))mode.append(option);
    if(!englishOnly && mode.contains(option))option.remove();
  });
  syncPassageOptions();
  duration.parentElement.hidden=mode.value!=='time';$('typing-count-control').hidden=mode.value!=='words';$('typing-length-control').hidden=mode.value!=='passage';
  punctuation.disabled=['python','java','alphabet','pangram'].includes(language.value) || ['alphabet','pangram'].includes(mode.value);
  if(punctuation.disabled)punctuation.checked=false;
}
function focusTypingSurface(){
  $('typing-surface').scrollIntoView({block:'center',behavior:'instant'});
  (input.disabled ? $('typing-surface') : input).focus({preventScroll:true});
}
function renderSource(){
  $('typing-source').replaceChildren();if(run.config.mode!=='passage')return;
  const collection=window.TypingPassages[run.config.language],p=getPassageEntry(run.config),text=document.createElement('span');
  const note=['python','java'].includes(run.config.language) ? 'Type the complete program; Enter supplies its indentation.' : collection.contentNote || 'Complete passage; keyboard typography normalised.';
  text.textContent=`${p.title} — ${p.author}. ${note} `;$('typing-source').append(text);
  if(p.source){const link=document.createElement('a');link.href=p.source;link.textContent='Read the source';link.className='typing-source-link';link.target='_blank';link.rel='noopener noreferrer';$('typing-source').append(link);}
}
async function restart(focus=false){
  clearInterval(interval);composing=false;pendingInput='';controls();
  const c=config();
  const r={config:c,category:categoryKey(c),prompt:'',target:[],text:'',started:null,wallStarted:0,finalMs:null,done:false,attempts:0,hits:0,corrections:0,events:[],samples:[],lastSample:0,session:null,startPromise:null,receipt:null,pb:false};
  run=r;input.value='';input.disabled=true;
  $('typing-results').hidden=true;$('typing-publish').hidden=true;$('typing-fair-play').checked=false;
  $('typing-surface').hidden=false;$('typing-surface').classList.remove('is-running');
  $('typing-phase').textContent='Preparing test…';$('typing-notice').textContent='';$('typing-category').textContent=label(c);$('typing-prompt').textContent='Loading your next test…';
  if(focus)focusTypingSurface();
  renderSource();renderBoard();loadPublicBoard();
  try{
    const issued=await api('prepare',{config:c,identity:read('typing-identity','')},6000);
    if(typeof issued.prompt!=='string' || !issued.prompt || typeof issued.id!=='string' || typeof issued.identity!=='string')throw new Error('Invalid online test.');
    if(run!==r)return;
    r.session=issued;r.prompt=issued.prompt;write('typing-identity',issued.identity);
  }catch{
    if(run!==r)return;
    r.prompt=makeText(c,crypto.getRandomValues(new Uint32Array(1))[0],window.TypingData.languages,window.TypingPassages);
    $('typing-notice').textContent='Offline practice. This run can be saved locally but cannot be published.';
  }
  r.target=Array.from(r.prompt);input.maxLength=r.prompt.length;
  input.lang=window.TypingData.languages[c.language].lang;$('typing-prompt').lang=input.lang;
  input.disabled=false;$('typing-phase').textContent='Ready when you are';drawText();updateLive();
  if(pendingInput){input.value=pendingInput.slice(0,r.prompt.length);pendingInput='';processInput();}
  if(focus)focusTypingSurface();
}
function start(){
  const r=run;r.started=performance.now();r.wallStarted=Date.now();
  if(r.session)r.startPromise=api('start',{id:r.session.id,identity:r.session.identity}).catch(error=>{r.startError=error.message;});
  $('typing-phase').textContent='Keep your rhythm';$('typing-surface').classList.add('is-running');interval=setInterval(tick,100);
}
function tick(){
  if(run.done || run.started===null)return;
  const ms=elapsed();
  if(ms-run.lastSample>=Math.max(1000,(run.config.mode==='time' ? run.config.target*1000 : 60000)/180)){
    run.samples.push({ms,wpm:metrics().wpm});run.lastSample=ms;
    if(run.samples.length>360)run.samples=run.samples.filter((_,i)=>i%2===0);
  }
  updateLive();
  if(run.config.mode==='time' && ms>=run.config.target*1000)finish();
  else if(ms>=3900000)finish(false);
}
function processInput(){
  if(run.done || input.disabled)return;
  if(run.started!==null && run.config.mode==='time' && elapsed()>=run.config.target*1000){finish();return;}
  const next=input.value.normalize('NFC');if(next===run.text)return;
  if(run.started===null){if(!next)return;start();}
  const previous=run.text;let position;
  if(next.startsWith(previous))position=previous.length;
  else if(previous.startsWith(next))position=next.length;
  else{position=0;while(position<previous.length && position<next.length && previous[position]===next[position])position++;}
  let suffix=0;
  while(suffix<previous.length-position && suffix<next.length-position && previous[previous.length-1-suffix]===next[next.length-1-suffix])suffix++;
  const inserted=next.slice(position,next.length-suffix),removed=previous.length-position-suffix;
  run.corrections+=removed;
  for(let i=0;i<inserted.length;i++){run.attempts++;if(inserted[i]===run.target[position+i])run.hits++;}
  if(run.events.length<200000)run.events.push([Math.round(elapsed()),position,removed,inserted]);else run.evidenceFull=true;
  run.text=next;input.value=next;drawText();updateLive();
  if(run.config.mode!=='time' && next===run.prompt)finish();
}
function readRecords(){
  const stored=read(STORE,{});if(typeof stored!=='object' || Array.isArray(stored))return {};
  const result={};
  for(const [key,rows] of Object.entries(stored))if(Array.isArray(rows))result[key]=rows.filter(r=>r && [r.wpm,r.raw,r.accuracy].every(Number.isFinite) && Number.isFinite(Date.parse(r.date))).slice(0,10);
  return result;
}
async function finish(complete=true){
  if(run.done)return;
  const r=run;r.finalMs=elapsed();r.done=true;clearInterval(interval);
  const result={...metrics(),date:new Date().toISOString()};r.samples.push({ms:r.finalMs,wpm:result.wpm});input.disabled=true;
  // Freeze the server clock immediately, without sending typing history before consent.
  if(r.session)r.stopPromise=(async()=>{await r.startPromise;if(r.startError)throw new Error(r.startError);return api('stop',{id:r.session.id,identity:r.session.identity});})().catch(error=>{r.stopError=error.message;});
  $('typing-surface').hidden=true;$('typing-results').hidden=false;$('typing-phase').textContent='Test complete';$('typing-metrics').replaceChildren();
  for(const [name,value] of [['WPM',result.wpm.toFixed(1)],['Raw WPM',result.raw.toFixed(1)],['Accuracy',`${result.accuracy.toFixed(1)}%`],['Correct characters',result.correct],['Errors typed',result.errors],['Characters removed',result.corrections],['Characters typed',r.text.length],['Duration',clock(r.finalMs)]]){
    const card=document.createElement('div');card.className='typing-metric';const strong=document.createElement('strong');strong.textContent=value;
    const caption=document.createElement('span');caption.textContent=name;card.append(strong,caption);$('typing-metrics').append(card);
  }
  const records=readRecords(),previous=records[r.category] || [];
  r.pb=complete && result.wpm>Math.max(0,...previous.map(item=>item.wpm));let saved=false;
  if(complete){records[r.category]=[...previous,result].sort((a,b)=>b.wpm-a.wpm || b.accuracy-a.accuracy).slice(0,10);saved=write(STORE,records);}
  $('typing-result-summary').textContent=`${label(r.config)}. ${r.pb ? 'New personal best! ' : 'Test complete. '}${!complete ? 'Time limit reached; incomplete tests are not ranked.' : saved ? 'Your personal leaderboard is updated.' : 'This browser could not save the result.'}`;
  $('typing-publish').hidden=!r.pb;$('typing-post').disabled=true;
  $('typing-publish-status').textContent=r.session ? 'Confirming the run’s timing…' : 'Offline practice cannot be published. Start a new test while connected.';
  drawChart();renderBoard();updateLive();$('typing-results').focus({preventScroll:true});$('typing-results').scrollIntoView({block:'nearest',behavior:'instant'});
  if(r.pb && r.session && !r.evidenceFull && complete){
    await r.stopPromise;if(run!==r)return;
    if(r.stopError){$('typing-publish-status').textContent='The online timing could not be confirmed. This result is local only.';return;}
    $('typing-post').disabled=false;$('typing-publish-status').textContent='Ordinary runs go live immediately; only flagged runs require admin review.';
  }
}
function renderBoard(){
  $('typing-board-category').textContent=label();const rows=readRecords()[categoryKey(config())] || [];
  $('typing-empty').hidden=rows.length>0;$('typing-rankings').replaceChildren();
  rows.forEach((r,i)=>addRow('typing-rankings',[i+1,r.wpm.toFixed(1),r.raw.toFixed(1),`${r.accuracy.toFixed(1)}%`,new Date(r.date).toLocaleDateString('en-GB')]));
}
function addRow(id,values){const row=document.createElement('tr');for(const value of values){const td=document.createElement('td');td.textContent=value;row.append(td);}$(id).append(row);}
async function loadPublicBoard(){
  const version=++boardVersion;$('typing-public-rankings').replaceChildren();$('typing-public-status').textContent='Loading approved runs…';
  try{
    const result=await api('board',{config:config()});if(version!==boardVersion)return;
    result.rows.forEach((r,i)=>addRow('typing-public-rankings',[i+1,r.player_name,Number(r.wpm).toFixed(1),`${Number(r.accuracy).toFixed(1)}%`]));
    $('typing-public-status').textContent=result.rows.length ? 'Approved runs for this exact category.' : 'No approved runs yet. Set the first record.';
  }catch{if(version===boardVersion)$('typing-public-status').textContent='Public leaderboard unavailable. Personal records are still available.';}
}
function drawChart(){
  const svg=$('typing-chart');svg.replaceChildren();const top=Math.max(10,...run.samples.map(s=>s.wpm));
  const element=(tag,attrs,text)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));if(text)node.textContent=text;svg.append(node);};
  for(const f of [0,.5,1]){const y=115-f*100;element('line',{x1:40,x2:590,y1:y,y2:y,stroke:'currentColor',opacity:'.15'});element('text',{x:0,y:y+4},String(Math.round(top*f)));}
  const points=[{ms:0,wpm:0},...run.samples].map(s=>`${40+s.ms/Math.max(1,run.finalMs)*550},${115-s.wpm/top*100}`).join(' ');
  element('polyline',{points,fill:'none',stroke:'currentColor','stroke-width':2,'stroke-linejoin':'round'});element('text',{x:40,y:138},'0:00');element('text',{x:590,y:138,'text-anchor':'end'},clock(run.finalMs));
}
$('typing-publish').addEventListener('submit',async event=>{
  event.preventDefault();const r=run;if(!r.pb || !r.session || !$('typing-fair-play').checked)return;
  $('typing-post').disabled=true;$('typing-publish-status').textContent='Submitting for review…';
  try{
    if(!r.receipt){const checked=await api('finish',{id:r.session.id,identity:r.session.identity,elapsedMs:r.finalMs,events:r.events},30000);r.receipt=checked.receipt;}
    const result=await api('publish',{id:r.receipt,identity:r.session.identity,name:$('typing-name').value});if(run!==r)return;
    $('typing-publish-status').textContent=result.message;write('typing-public-name',$('typing-name').value);r.pb=false;
  }catch(error){if(run===r){$('typing-publish-status').textContent=error.message;$('typing-post').disabled=false;}}
});
$('typing-decline').addEventListener('click',()=>{$('typing-publish').hidden=true;$('typing-again').focus();});
input.addEventListener('compositionstart',()=>{composing=true;});input.addEventListener('compositionend',()=>{composing=false;processInput();});
input.addEventListener('input',event=>{if(!composing && !event.isComposing)processInput();});
for(const name of ['paste','drop'])input.addEventListener(name,event=>{event.preventDefault();$('typing-notice').textContent='Type the text yourself; pasting is disabled during tests.';});
input.addEventListener('beforeinput',event=>{if(['insertFromPaste','insertFromDrop','insertReplacementText'].includes(event.inputType))event.preventDefault();});
function isInteractiveElement(element){
  return element instanceof HTMLElement && (element.matches('input,textarea,select,button,a,[contenteditable="true"]') || element.isContentEditable);
}
document.addEventListener('keydown',event=>{
  if(run.done && event.key==='Tab' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey){event.preventDefault();restart(true);return;}
  if(run.done || isInteractiveElement(document.activeElement))return;
  const printable=event.key.length===1 || event.key==='Enter' || event.key==='Backspace';
  if(!printable || event.ctrlKey || event.metaKey || event.altKey)return;
  event.preventDefault();focusTypingSurface();
  if(input.disabled){
    if(event.key==='Backspace')pendingInput=Array.from(pendingInput).slice(0,-1).join('');
    else pendingInput+=event.key==='Enter' ? '\n' : event.key;
    return;
  }
  if(event.key==='Backspace')input.value=Array.from(input.value).slice(0,-1).join('');
  else input.value+=event.key==='Enter' ? '\n' : event.key;
  input.dispatchEvent(new Event('input',{bubbles:true}));
},{capture:true});
input.addEventListener('keydown',event=>{
  if(event.key==='Tab' && !event.shiftKey){event.preventDefault();restart(true);}
  if(event.key==='Escape'){event.preventDefault();$('typing-reset').focus();}
  if(event.key==='Enter' && run.config.mode==='passage' && ['python','java'].includes(run.config.language) && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey){
    const position=input.selectionStart;
    if(input.selectionStart!==input.selectionEnd || run.prompt[position]!=='\n')return;
    const indent=(run.prompt.slice(position+1).match(/^ */) || [''])[0];
    event.preventDefault();input.setRangeText(`\n${indent}`,position,position,'end');input.dispatchEvent(new Event('input',{bubbles:true}));
  }
});
$('typing-again').addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();event.stopPropagation();}});
$('typing-again').addEventListener('keyup',event=>{if(event.key===' ')event.preventDefault();});
$('typing-reset').addEventListener('click',()=>restart(true));$('typing-again').addEventListener('click',()=>restart(true));
for(const selector of [language,duration,mode,punctuation,$('typing-count'),$('typing-length')])selector.addEventListener('change',()=>restart(true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
$('typing-name').value=read('typing-public-name','Player');restart();
