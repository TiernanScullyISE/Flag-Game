const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const HTML_FILES = ["index.html", "game.html", "leaderboard.html", "admin.html", "revise.html", "view.html"];
const JS_FILES = [
  "theme.js",
  "data.js",
  "regions-generated-data.js",
  "regions-data.js",
  "utils.js",
  "leaderboard-config.js",
  "leaderboard.js",
  "analytics.js",
  "map-view.js",
  "region-map.js",
  "world-map-config.js",
  "game.js",
  "leaderboard-page.js",
  "admin.js",
  "revise.js",
  "view.js"
];

function fail(message){
  console.error(message);
  process.exit(1);
}

function localAssetTarget(value){
  if(!value || value.startsWith("#")) return "";
  if(/^(https?:|mailto:|tel:)/i.test(value)) return "";
  return value.split("#")[0].split("?")[0];
}

function checkHtmlAssets(){
  const missing = [];
  const pattern = /\b(?:src|href)="([^"]+)"/g;

  for(const file of HTML_FILES){
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    for(const match of source.matchAll(pattern)){
      const target = localAssetTarget(match[1]);
      if(!target) continue;
      const targetPath = path.join(ROOT, target);
      if(!fs.existsSync(targetPath)){
        missing.push(`${file} -> ${target}`);
      }
    }
  }

  if(missing.length){
    fail(`Missing local page assets:\n- ${missing.join("\n- ")}`);
  }
}

function checkScriptSyntax(){
  for(const file of JS_FILES){
    execFileSync(process.execPath, ["--check", path.join(ROOT, file)], {stdio:"inherit"});
  }
}

function checkScriptOrder(){
  const gameHtml = fs.readFileSync(path.join(ROOT, "game.html"), "utf8");
  const generatedIndex = gameHtml.indexOf("regions-generated-data.js");
  const dataIndex = gameHtml.indexOf("regions-data.js");
  const regionMapIndex = gameHtml.indexOf("region-map.js");
  const configIndex = gameHtml.indexOf("world-map-config.js");
  const gameIndex = gameHtml.indexOf("game.js");
  if(configIndex === -1 || gameIndex === -1 || configIndex > gameIndex){
    fail("game.html must load world-map-config.js before game.js.");
  }
  if(generatedIndex === -1 || generatedIndex > dataIndex){
    fail("game.html must load regions-generated-data.js before regions-data.js.");
  }
  if(dataIndex === -1 || dataIndex > gameIndex){
    fail("game.html must load regions-data.js before game.js.");
  }
  if(regionMapIndex === -1 || regionMapIndex > gameIndex){
    fail("game.html must load region-map.js before game.js.");
  }
}

function checkPublishableKeyHeaders(){
  const config = fs.readFileSync(path.join(ROOT, "leaderboard-config.js"), "utf8");
  const leaderboard = fs.readFileSync(path.join(ROOT, "leaderboard.js"), "utf8");
  if(config.includes("sb_publishable_") && !leaderboard.includes("if(isJwt(key)")){
    fail("Publishable Supabase keys must not be sent as Authorization bearer tokens.");
  }
}

checkHtmlAssets();
checkScriptSyntax();
checkScriptOrder();
checkPublishableKeyHeaders();
console.log("Smoke checks passed.");
