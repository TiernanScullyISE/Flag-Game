const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data.js");
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
  return vm.runInNewContext(`${source}\n;({countryContinent,countryCapitals,alpha2Overrides,countryAliases,capitalAliases,countries,LS_KEYS});`, {}, {filename:"data.js"});
}

function normalise(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N} ]/gu, "")
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

function main(){
  const errors = [];
  const {
    countryContinent,
    countryCapitals,
    alpha2Overrides,
    countryAliases,
    capitalAliases,
    countries,
    LS_KEYS
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

  if(errors.length){
    console.error(`Data validation failed:\n${errors.join("\n")}`);
    process.exit(1);
  }

  console.log(`Data validation passed: ${countryNames.length} countries checked.`);
}

main();
