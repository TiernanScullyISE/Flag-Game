const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data.js");
const GENERATED_REGIONS_DATA_PATH = path.join(ROOT, "regions-generated-data.js");
const REGIONS_DATA_PATH = path.join(ROOT, "regions-data.js");
const EXPECTED_CONTINENTS = new Set([
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania"
]);

function loadData(){
  const source = fs.readFileSync(DATA_PATH, "utf8");
  const generatedRegionsSource = fs.readFileSync(GENERATED_REGIONS_DATA_PATH, "utf8");
  const regionsSource = fs.readFileSync(REGIONS_DATA_PATH, "utf8");
  return vm.runInNewContext(`${source}\n${generatedRegionsSource}\n${regionsSource}\n;({countryContinent,countryCapitals,alpha2Overrides,countryAliases,capitalAliases,countries,LS_KEYS,REGION_GAME_GROUPS,REGION_GAME_GROUP_ORDER,DEFAULT_REGION_GAME_GROUP,GENERATED_REGION_GAME_GROUPS});`, {}, {filename:"data.js"});
}

function normalise(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim();
}

function normaliseStrictDiacritics(value, language){
  return String(value || "")
    .toLocaleLowerCase(language || undefined)
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addError(errors, message){
  errors.push(`- ${message}`);
}

function requirePlainObject(errors, value, name){
  if(!value || typeof value !== "object" || Array.isArray(value)){
    addError(errors, `${name} must be an object.`);
    return false;
  }
  return true;
}

function validateAliases(errors, aliasMap, canonicalValues, label){
  if(!requirePlainObject(errors, aliasMap, label)) return;
  const canonical = new Set(canonicalValues);
  const index = new Map();

  for(const value of canonical){
    const key = normalise(value);
    if(!key) continue;
    index.set(key, value);
  }

  for(const [owner, aliases] of Object.entries(aliasMap)){
    if(!canonical.has(owner)){
      addError(errors, `${label} has an unknown owner: ${owner}`);
      continue;
    }
    if(!Array.isArray(aliases)){
      addError(errors, `${label}.${owner} must be an array.`);
      continue;
    }
    for(const alias of aliases){
      if(typeof alias !== "string" || !alias.trim()){
        addError(errors, `${label}.${owner} contains a blank or non-string alias.`);
        continue;
      }
      const key = normalise(alias);
      const existing = index.get(key);
      if(existing && existing !== owner){
        addError(errors, `${label}.${owner} alias "${alias}" conflicts with ${existing}.`);
      }
      index.set(key, owner);
    }
  }
}

function validateRegionalData(errors, groups, order, defaultGroup){
  if(!requirePlainObject(errors, groups, "REGION_GAME_GROUPS")) return;
  if(!Array.isArray(order) || !order.length){
    addError(errors, "REGION_GAME_GROUP_ORDER must be a non-empty array.");
    return;
  }
  if(!groups[defaultGroup]){
    addError(errors, "DEFAULT_REGION_GAME_GROUP must name an existing regional group.");
  }

  const expectedCounts = new Map([
    ["Ireland", 32],
    ["Ireland as Gaeilge", 32],
    ["England", 47],
    ["Scotland", 12],
    ["Wales", 8],
    ["United States", 50]
  ]);

  for(const groupKey of order){
    const group = groups[groupKey];
    if(!group){
      addError(errors, `REGION_GAME_GROUP_ORDER contains unknown group ${groupKey}.`);
      continue;
    }
    if(!Array.isArray(group.items) || !group.items.length){
      addError(errors, `${groupKey} must contain regional items.`);
      continue;
    }
    const expected = expectedCounts.get(groupKey);
    if(expected && group.items.length !== expected){
      addError(errors, `${groupKey} expected ${expected} items, found ${group.items.length}.`);
    }
    if(!group.map || !group.map.url || !group.map.source){
      addError(errors, `${groupKey} must define a map source and URL.`);
    }else if(/^http:\/\//i.test(group.map.url)){
      addError(errors, `${groupKey} map URL must use https.`);
    }else if(/^https:\/\/cdn\.jsdelivr\.net\/gh\/wmgeolab\/geoBoundaries@/i.test(group.map.url)){
      addError(errors, `${groupKey} map URL points at jsDelivr, which serves GeoBoundaries Git LFS pointers instead of GeoJSON.`);
    }
    const answerKey = value=>group.strictDiacritics
      ? normaliseStrictDiacritics(value, group.answerLanguage)
      : normalise(value);

    const names = new Set();
    const answerIndex = new Map();
    for(const item of group.items){
      if(!item || typeof item.name !== "string" || !item.name.trim()){
        addError(errors, `${groupKey} contains an item without a name.`);
        continue;
      }
      if(!item.capital || typeof item.capital !== "string"){
        addError(errors, `${groupKey}.${item.name} is missing a capital or county town.`);
      }
      if(item.flagUrl && /^http:\/\//i.test(item.flagUrl)){
        addError(errors, `${groupKey}.${item.name} flagUrl must use https.`);
      }
      if(item.capitalCoordinates !== undefined){
        if(
          !Array.isArray(item.capitalCoordinates)
          || item.capitalCoordinates.length !== 2
          || !item.capitalCoordinates.every(Number.isFinite)
          || Math.abs(item.capitalCoordinates[0]) > 180
          || Math.abs(item.capitalCoordinates[1]) > 90
        ){
          addError(errors, `${groupKey}.${item.name} has invalid capitalCoordinates.`);
        }
      }
      if(names.has(item.name)){
        addError(errors, `${groupKey} contains duplicate item ${item.name}.`);
      }
      names.add(item.name);
      for(const value of [item.name, ...(item.aliases || [])]){
        const key = answerKey(value);
        const existing = answerIndex.get(key);
        if(existing && existing !== item.name){
          addError(errors, `${groupKey}.${item.name} alias "${value}" conflicts with ${existing}.`);
        }
        answerIndex.set(key, item.name);
      }
      for(const value of [item.capital, ...(item.capitalAliases || [])]){
        if(typeof value !== "string" || !value.trim()){
          addError(errors, `${groupKey}.${item.name} contains a blank or non-string capital alias.`);
        }
      }
    }
  }
}

function validateGeneratedRegionalData(errors, generatedGroups, countrySet){
  if(!requirePlainObject(errors, generatedGroups, "GENERATED_REGION_GAME_GROUPS")) return;
  const generatedKeys = Object.keys(generatedGroups);
  if(generatedKeys.length < 193){
    addError(errors, `Expected at least 193 generated regional groups, found ${generatedKeys.length}.`);
  }
  for(const groupKey of generatedKeys){
    if(!countrySet.has(groupKey)){
      addError(errors, `Generated regional group does not match a quiz country: ${groupKey}.`);
    }
  }
}

function main(){
  const errors = [];
  const {
    countryContinent,
    countryCapitals,
    alpha2Overrides,
    countryAliases,
    capitalAliases,
    countries,
    LS_KEYS,
    REGION_GAME_GROUPS,
    REGION_GAME_GROUP_ORDER,
    DEFAULT_REGION_GAME_GROUP,
    GENERATED_REGION_GAME_GROUPS
  } = loadData();

  requirePlainObject(errors, countryContinent, "countryContinent");
  requirePlainObject(errors, countryCapitals, "countryCapitals");
  requirePlainObject(errors, alpha2Overrides, "alpha2Overrides");
  requirePlainObject(errors, LS_KEYS, "LS_KEYS");

  const countryNames = Object.keys(countryContinent || {});
  const countrySet = new Set(countryNames);
  if(countryNames.length < 190){
    addError(errors, `Expected at least 190 countries, found ${countryNames.length}.`);
  }

  const sortedCountries = [...countryNames].sort();
  if(JSON.stringify(countries) !== JSON.stringify(sortedCountries)){
    addError(errors, "countries must match sorted countryContinent keys.");
  }

  for(const country of countryNames){
    const continent = countryContinent[country];
    if(!EXPECTED_CONTINENTS.has(continent)){
      addError(errors, `${country} has unknown continent "${continent}".`);
    }
    if(!countryCapitals[country]){
      addError(errors, `${country} is missing a capital.`);
    }
    const code = alpha2Overrides[country];
    if(!/^[a-z]{2}$/i.test(String(code || ""))){
      addError(errors, `${country} has invalid alpha-2 code "${code || ""}".`);
    }
  }

  for(const country of Object.keys(countryCapitals || {})){
    if(!countrySet.has(country)){
      addError(errors, `countryCapitals contains unknown country ${country}.`);
    }
  }
  for(const country of Object.keys(alpha2Overrides || {})){
    if(!countrySet.has(country)){
      addError(errors, `alpha2Overrides contains unknown country ${country}.`);
    }
  }

  validateAliases(errors, countryAliases, countryNames, "countryAliases");
  validateAliases(errors, capitalAliases, Object.values(countryCapitals || {}), "capitalAliases");
  validateGeneratedRegionalData(errors, GENERATED_REGION_GAME_GROUPS, countrySet);
  validateRegionalData(errors, REGION_GAME_GROUPS, REGION_GAME_GROUP_ORDER, DEFAULT_REGION_GAME_GROUP);

  if(errors.length){
    console.error(`Data validation failed:\n${errors.join("\n")}`);
    process.exit(1);
  }

  console.log(`Data validation passed: ${countryNames.length} countries checked.`);
}

main();
