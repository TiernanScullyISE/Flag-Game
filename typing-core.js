// Public scoring and content rules. The private server applies these independently.
export const VERSION = 2;
export const DURATIONS = [15,30,60,90,120,300,600,1800,3600];
export const WORD_COUNTS = [10,25,50,100,250];
export function normaliseConfig(value){
  const c = {...value};
  if(!["english","irish","python","java"].includes(c.language)) throw new Error("Unknown language.");
  if(!["time","words","passage","alphabet","pangram"].includes(c.mode)) throw new Error("Unknown test mode.");
  if(c.mode === "time" && !DURATIONS.includes(c.target)) throw new Error("Unknown duration.");
  if(c.mode === "words" && !WORD_COUNTS.includes(c.target)) throw new Error("Unknown word count.");
  if(c.mode === "passage" && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(c.target)) throw new Error("Unknown passage.");
  if(c.mode === "alphabet" && c.target !== "alphabet") throw new Error("Unknown alphabet test.");
  if(c.mode === "pangram" && c.target !== "pangram") throw new Error("Unknown pangram test.");
  return {language:c.language,mode:c.mode,target:c.target,punctuation:["alphabet","pangram"].includes(c.mode) ? false : ["python","java"].includes(c.language) ? true : c.punctuation === true};
}
export function categoryKey(config){
  const c = normaliseConfig(config);
  return `v${VERSION}:${c.language}:${c.mode}:${c.target}:${c.punctuation ? "punctuation" : "plain"}`;
}
export function makeText(config, seed, vocabulary, passages){
  const c = normaliseConfig(config);
  let state = seed >>> 0;
  const random = ()=>{state = (Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
  const pick = list=>list[Math.floor(random()*list.length)];
  if(c.mode === "alphabet") return "abcdefghijklmnopqrstuvwxyz";
  if(c.mode === "pangram") return "the quick brown fox jumps over the lazy dog";
  if(c.mode === "passage"){
    const collection = passages[c.language];
    const p=(collection.entries || []).find(entry=>entry.id===c.target);
    if(!p)throw new Error("Unknown passage.");
    let text = p.text.trim().replace(/\s+/g," ");
    if(["python","java"].includes(c.language))text=p.text.trim();
    return (c.punctuation ? text : text.replace(/[^\p{L}\p{N}\s]/gu,"").toLowerCase()).normalize("NFC");
  }
  const source = vocabulary[c.language];
  const tokens = source.words || source.snippets.join(" ").split(/\s+/);
  const count = c.mode === "words" ? c.target : Math.max(200, c.target*12);
  const words = [];
  for(let i=0;i<count;i++){
    let word = pick(tokens);
    if(c.punctuation && source.words){
      if(i%9===0) word=word[0].toUpperCase()+word.slice(1);
      if(i%9===8) word+=pick([".","!","?"]);
      else if(random()<.15) word+=",";
    }
    words.push(word);
  }
  return words.join(" ").normalize("NFC");
}
export function scoreText(target,text,attempts,hits,corrections,elapsedMs){
  const correct = Array.from(text).reduce((sum,char,i)=>sum+Number(char===target[i]),0);
  const minutes = elapsedMs/60000;
  return {wpm:minutes>0 ? correct/5/minutes : 0,raw:minutes>0 ? attempts/5/minutes : 0,accuracy:attempts ? hits/attempts*100 : 100,correct,errors:attempts-hits,corrections,characters:text.length,elapsedMs};
}
