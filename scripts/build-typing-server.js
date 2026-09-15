// Run locally to synchronise public content/scoring with the ignored private function bundle.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const target = path.join(root,'.private-supabase-backup/supabase/functions/typing-session');
const context = {window:{}};
vm.createContext(context);
for(const file of ['typing-data.js','typing-passages.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
fs.mkdirSync(target,{recursive:true});
fs.writeFileSync(path.join(target,'catalog.json'),JSON.stringify({vocabulary:context.window.TypingData.languages,passages:context.window.TypingPassages}));
fs.copyFileSync(path.join(root,'typing-core.js'),path.join(target,'core.js'));
console.log('Private typing content bundle synchronised.');
