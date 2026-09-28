// Run locally to synchronise public content/scoring with the ignored private function bundle.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const target = path.join(root,'.private-supabase-backup/supabase/functions/typing-session');
const vocabulary = require('../typing-data.js').languages;
const passages = require('../typing-passages.js');
fs.mkdirSync(target,{recursive:true});
fs.writeFileSync(path.join(target,'catalog.json'),JSON.stringify({vocabulary,passages}));
fs.copyFileSync(path.join(root,'typing-core.js'),path.join(target,'core.js'));
console.log('Private typing content bundle synchronised.');
