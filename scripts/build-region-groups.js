const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const zlib = require("node:zlib");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data.js");
const OUTPUT_PATH = path.join(ROOT, "regions-generated-data.js");
const REPORT_PATH = path.join(ROOT, "region-source-report.json");
const DEFAULT_CACHE_PATH = path.join(ROOT, ".region-cache");
const DEFAULT_USER_AGENT = "Flag-Game regional data builder (https://github.com/tiernanscullyise/Flag-Game)";
const GEONAMES_ADMIN1_URL = "https://download.geonames.org/export/dump/admin1CodesASCII.txt";
const GEONAMES_CITIES500_URL = "https://download.geonames.org/export/dump/cities500.zip";
const COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php";
const BOUNDARY_RELEASES = ["gbOpen", "gbHumanitarian"];
const BOUNDARY_FALLBACK_SOURCE = "generated from GeoBoundaries ADM1 with GeoNames ADM1/PPLA administrative centres, Wikidata/Commons flags where verified, and generated regional training flags where no public flag asset is available";
const BOUNDARY_ALPHA3_OVERRIDES = {
  Kosovo:"XKX"
};

const MANUAL_GROUPS = new Set(["Ireland", "Ireland as Gaeilge", "United States"]);
const MIN_GROUP_SIZE = 2;
const MAX_GROUP_SIZE = 120;
const NAME_FIELDS = ["shapeName", "shapeISO", "shapeID", "name", "NAME_1", "NAME", "name_en"];
const LABEL_LANGUAGES = "en,es,pt,fr,de,it,ru,ja,da,hu,nl,sv,pl,uk,zh,ga";
const SELF_CAPITAL_SUBDIVISION_NAMES = {
  [normalise("Asunción")]: "Asunción",
  [normalise("Asuncion")]: "Asunción",
  [normalise("Bogotá")]: "Bogotá",
  [normalise("Bogota")]: "Bogotá",
  [normalise("Bogotá Capital District")]: "Bogotá",
  [normalise("Bogota Capital District")]: "Bogotá",
  [normalise("Capital Territory (Honiara)")]: "Honiara",
  [normalise("City of Zagreb")]: "Zagreb",
  [normalise("Hlavní město Praha")]: "Prague",
  [normalise("Kyiv")]: "Kyiv",
  [normalise("Kuala Lumpur")]: "Kuala Lumpur",
  [normalise("Lima Metropolitan Area")]: "Lima",
  [normalise("Metropolitan Municipality of Lima")]: "Lima",
  [normalise("Minsk City")]: "Minsk",
  [normalise("Montevideo Department")]: "Montevideo",
  [normalise("Prague")]: "Prague",
  [normalise("Putrajaya")]: "Putrajaya",
  [normalise("Sevastopol")]: "Sevastopol",
  [normalise("Tacuarembó Department")]: "Tacuarembó",
  [normalise("Tacuarembo Department")]: "Tacuarembó",
  [normalise("Thimpu")]: "Thimphu",
  [normalise("Thimphu District")]: "Thimphu",
  [normalise("Ulaanbaatar")]: "Ulaanbaatar"
};
const SERVICE_LIMITS = {
  wikidata: {
    endpoint:"https://query.wikidata.org/sparql",
    limits:[
      "60 second query timeout",
      "60 seconds of processing time per 60 seconds per client, where a client is IP plus user agent",
      "30 error queries per minute per client"
    ]
  },
  geoboundaries: {
    endpoint:"https://www.geoboundaries.org/api/current/gbOpen/[ISO3]/ADM1/",
    limits:[
      "No public numeric per-minute quota is documented for the API",
      "API metadata JSON is pre-cached by the project",
      "Boundary downloads may still be throttled by the hosting layer if requests are too aggressive"
    ]
  },
  geonames: {
    endpoint:"https://download.geonames.org/export/dump/",
    limits:[
      "Public dump files are downloaded and cached locally; no per-country API key is needed",
      "This generator uses admin1CodesASCII.txt plus cities500.zip PPLA rows as a capital fallback"
    ]
  },
  commons: {
    endpoint:"https://commons.wikimedia.org/w/api.php",
    limits:[
      "No fixed anonymous read quota is published for ordinary API reads",
      "The generator batches exact filename checks and caches results locally",
      "When a real Commons flag cannot be verified, the app generates a deterministic training flag so the quiz stays playable"
    ]
  }
};
const RUN_OPTIONS = parseArgs(process.argv.slice(2));
const RUN_STATE = {
  startedAt:Date.now(),
  completed:false,
  stoppedReason:null,
  fromCache:0,
  networkRequests:0,
  requestsByHost:{},
  rateLimitEvents:[],
  responseLimitHeaders:[],
  cacheWrites:0
};
const EXTRA_NORMALISED_FEATURE_ALIASES = {
  Argentina: {
    [normalise("Ciudad AutÃ³noma de Buenos Aires")]: "Autonomous City of Buenos Aires",
    [normalise("Ciudad Autónoma de Buenos Aires")]: "Autonomous City of Buenos Aires"
  },
  Belgium: {
    [normalise("Brussels Hoofdstedelijk")]: "Brussels-Capital Region",
    [normalise("Vlaams Gewest")]: "Flemish Region",
    [normalise("Wallonne Gewest")]: "Walloon Region"
  },
  "Bosnia and Herzegovina": {
    [normalise("Federation of Bosnia and Herzegovina")]: "Federation of Bosnia and Herzegovina"
  },
  Chile: {
    [normalise("Región de Magallanes y Antártica Chilena")]: "Magellan and the Chilean Antarctic Region",
    [normalise("Región Metropolitana de Santiago")]: "Santiago Metropolitan Region"
  },
  Ecuador: {
    [normalise("Morona Santiago")]: "Morona-Santiago Province"
  },
  Poland: {
    [normalise("Subcarpathian Voivodeship")]: "Podkarpackie Voivodeship"
  },
  "South Africa": {
    [normalise("Nothern Cape")]: "Northern Cape"
  },
  Spain: {
    [normalise("Andalucía")]: "Andalusia",
    [normalise("Aragón")]: "Aragon",
    [normalise("Canarias")]: "Canary Islands",
    [normalise("Castilla-La Mancha")]: "Castile–La Mancha",
    [normalise("Castilla y León")]: "Castile and León",
    [normalise("Cataluña/Catalunya")]: "Catalonia",
    [normalise("Comunidad de Madrid")]: "Community of Madrid",
    [normalise("Comunidad Foral de Navarra")]: "Navarre",
    [normalise("Comunitat Valenciana")]: "Valencian Community",
    [normalise("Illes Balears")]: "Balearic Islands",
    [normalise("País Vasco/Euskadi")]: "Basque Country",
    [normalise("Principado de Asturias")]: "Asturias",
    [normalise("Región de Murcia")]: "Region of Murcia"
  }
};

const BOUNDARY_FALLBACK_ITEM_PATCHES = {
  Bhutan: {
    [normalise("Thimpu")]: {
      name:"Thimphu",
      capital:"Thimphu"
    }
  }
};

const MANUAL_ITEM_PATCHES = {
  Argentina: [
    {
      name:"Autonomous City of Buenos Aires",
      capital:"Buenos Aires",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Buenos%20Aires.svg",
      isoCodes:["AR-C"]
    }
  ],
  Austria: [
    {
      name:"Vienna",
      capital:"Vienna",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Wien.svg",
      isoCodes:["AT-9"]
    }
  ],
  BosniaAndHerzegovina: [
    {
      name:"Federation of Bosnia and Herzegovina",
      capital:"Sarajevo",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Federation%20of%20Bosnia%20and%20Herzegovina.svg",
      isoCodes:["BA-BIH"]
    }
  ],
  Germany: [
    {
      name:"Berlin",
      capital:"Berlin",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Berlin.svg",
      isoCodes:["DE-BE"]
    },
    {
      name:"Hamburg",
      capital:"Hamburg",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Hamburg.svg",
      isoCodes:["DE-HH"]
    }
  ],
  Ecuador: [
    {
      name:"Esmeraldas Province",
      capital:"Esmeraldas",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Bandera%20Provincia%20Esmeraldas.svg",
      isoCodes:["EC-E"]
    },
    {
      name:"Pichincha Province",
      capital:"Quito",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Bandera%20Provincia%20Pichincha.svg",
      isoCodes:["EC-P"]
    }
  ],
  Russia: [
    {
      name:"Moscow",
      capital:"Moscow",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Moscow%2C%20Russia.svg",
      isoCodes:["RU-MOW"]
    },
    {
      name:"Saint Petersburg",
      capital:"Saint Petersburg",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Saint%20Petersburg.svg",
      isoCodes:["RU-SPE"]
    }
  ],
  SouthAfrica: [
    {
      name:"Gauteng",
      capital:"Johannesburg",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Gauteng.svg",
      isoCodes:["ZA-GP"]
    },
    {
      name:"KwaZulu-Natal",
      capital:"Pietermaritzburg",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20KwaZulu-Natal.svg",
      isoCodes:["ZA-KZN"]
    },
    {
      name:"Limpopo",
      capital:"Polokwane",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Limpopo.svg",
      isoCodes:["ZA-LP"]
    }
  ],
  Spain: [
    {
      name:"Castile and León",
      capital:"Valladolid",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Castile%20and%20Le%C3%B3n.svg",
      isoCodes:["ES-CL"]
    },
    {
      name:"Ceuta",
      capital:"Ceuta",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Ceuta.svg",
      isoCodes:["ES-CE"]
    },
    {
      name:"Melilla",
      capital:"Melilla",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Melilla.svg",
      isoCodes:["ES-ML"]
    }
  ],
  UnitedKingdom: [
    {
      name:"Northern Ireland",
      capital:"Belfast",
      flagUrl:"http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Northern%20Ireland.svg",
      isoCodes:["GB-NIR"]
    }
  ]
};

const GROUP_LABEL_OVERRIDES = {
  Argentina: {itemLabel:"province", itemPluralLabel:"provinces", capitalLabel:"provincial capital", capitalPluralLabel:"provincial capitals", listMapLabel:"Province Map"},
  Australia: {itemLabel:"state or territory", itemPluralLabel:"states and territories", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"State/Territory Map"},
  Austria: {itemLabel:"state", itemPluralLabel:"states", capitalLabel:"state capital", capitalPluralLabel:"state capitals", listMapLabel:"State Map"},
  Belarus: {itemLabel:"region or city", itemPluralLabel:"regions and city", capitalLabel:"administrative centre", capitalPluralLabel:"administrative centres", listMapLabel:"Region Map"},
  Belgium: {itemLabel:"region", itemPluralLabel:"regions", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"Region Map"},
  BosniaAndHerzegovina: {itemLabel:"entity or district", itemPluralLabel:"entities and district", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"Entity Map"},
  Brazil: {itemLabel:"state", itemPluralLabel:"states", capitalLabel:"state capital", capitalPluralLabel:"state capitals", listMapLabel:"State Map"},
  Canada: {itemLabel:"province or territory", itemPluralLabel:"provinces and territories", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"Province/Territory Map"},
  Colombia: {itemLabel:"department or capital district", itemPluralLabel:"departments and capital district", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"Department Map"},
  Croatia: {itemLabel:"county or city", itemPluralLabel:"counties and city", capitalLabel:"county seat", capitalPluralLabel:"county seats", listMapLabel:"County Map"},
  Czechia: {itemLabel:"region", itemPluralLabel:"regions", capitalLabel:"regional capital", capitalPluralLabel:"regional capitals", listMapLabel:"Region Map"},
  Ecuador: {itemLabel:"province", itemPluralLabel:"provinces", capitalLabel:"provincial capital", capitalPluralLabel:"provincial capitals", listMapLabel:"Province Map"},
  Germany: {itemLabel:"state", itemPluralLabel:"states", capitalLabel:"state capital", capitalPluralLabel:"state capitals", listMapLabel:"State Map"},
  India: {itemLabel:"state or territory", itemPluralLabel:"states and territories", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"State/Territory Map"},
  Italy: {itemLabel:"region", itemPluralLabel:"regions", capitalLabel:"regional capital", capitalPluralLabel:"regional capitals", listMapLabel:"Region Map"},
  Japan: {itemLabel:"prefecture", itemPluralLabel:"prefectures", capitalLabel:"prefectural capital", capitalPluralLabel:"prefectural capitals", listMapLabel:"Prefecture Map"},
  Malaysia: {itemLabel:"state or federal territory", itemPluralLabel:"states and federal territories", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"State/Territory Map"},
  Mexico: {itemLabel:"state", itemPluralLabel:"states", capitalLabel:"state capital", capitalPluralLabel:"state capitals", listMapLabel:"State Map"},
  Mongolia: {itemLabel:"province or capital city", itemPluralLabel:"provinces and capital city", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"Province Map"},
  Netherlands: {itemLabel:"province", itemPluralLabel:"provinces", capitalLabel:"provincial capital", capitalPluralLabel:"provincial capitals", listMapLabel:"Province Map"},
  Pakistan: {itemLabel:"province or territory", itemPluralLabel:"provinces and territories", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"Province/Territory Map"},
  Paraguay: {itemLabel:"department or capital district", itemPluralLabel:"departments and capital district", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"Department Map"},
  Russia: {itemLabel:"federal subject", itemPluralLabel:"federal subjects", capitalLabel:"administrative centre", capitalPluralLabel:"administrative centres", listMapLabel:"Federal Subject Map"},
  SolomonIslands: {itemLabel:"province or capital territory", itemPluralLabel:"provinces and capital territory", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"Province Map"},
  SouthAfrica: {itemLabel:"province", itemPluralLabel:"provinces", capitalLabel:"provincial capital", capitalPluralLabel:"provincial capitals", listMapLabel:"Province Map"},
  Spain: {itemLabel:"autonomous community", itemPluralLabel:"autonomous communities", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"Autonomous Community Map"},
  Switzerland: {itemLabel:"canton", itemPluralLabel:"cantons", capitalLabel:"cantonal capital", capitalPluralLabel:"cantonal capitals", listMapLabel:"Canton Map"},
  Ukraine: {itemLabel:"oblast or city", itemPluralLabel:"oblasts and cities", capitalLabel:"administrative centre", capitalPluralLabel:"administrative centres", listMapLabel:"Oblast Map"},
  Peru: {itemLabel:"department or province", itemPluralLabel:"departments and province", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"Department Map"},
  UnitedKingdom: {itemLabel:"country", itemPluralLabel:"countries", capitalLabel:"capital", capitalPluralLabel:"capitals", listMapLabel:"Country Map"}
};

function parseArgs(args){
  const options = {
    cache:true,
    cacheDir:DEFAULT_CACHE_PATH,
    country:null,
    delayMs:1500,
    isoDelayMs:600,
    commonsSearchLimit:Infinity,
    maxCountries:Infinity,
    maxRequests:Infinity,
    reportOnly:false,
    writePartial:false,
    commonsFlagFallback:true,
    generatedFlagFallback:true,
    wikidataAdminFallback:false,
    showHelp:false,
    showLimits:false
  };
  for(let index=0;index<args.length;index++){
    const arg = args[index];
    const next = ()=>args[++index];
    if(arg === "--help" || arg === "-h"){
      options.showHelp = true;
    }else if(arg === "--limits"){
      options.showLimits = true;
    }else if(arg === "--no-cache"){
      options.cache = false;
    }else if(arg === "--report-only"){
      options.reportOnly = true;
    }else if(arg === "--write-partial"){
      options.writePartial = true;
    }else if(arg === "--wikidata-admin-fallback"){
      options.wikidataAdminFallback = true;
    }else if(arg === "--no-wikidata-admin-fallback"){
      options.wikidataAdminFallback = false;
    }else if(arg === "--no-commons-flag-fallback"){
      options.commonsFlagFallback = false;
    }else if(arg === "--no-generated-flag-fallback"){
      options.generatedFlagFallback = false;
    }else if(arg === "--commons-search-limit"){
      options.commonsSearchLimit = parsePositiveInteger(next(), "commons-search-limit");
    }else if(arg.startsWith("--commons-search-limit=")){
      options.commonsSearchLimit = parsePositiveInteger(arg.slice("--commons-search-limit=".length), "commons-search-limit");
    }else if(arg === "--country"){
      options.country = next();
    }else if(arg.startsWith("--country=")){
      options.country = arg.slice("--country=".length);
    }else if(arg === "--cache-dir"){
      options.cacheDir = path.resolve(ROOT, next());
    }else if(arg.startsWith("--cache-dir=")){
      options.cacheDir = path.resolve(ROOT, arg.slice("--cache-dir=".length));
    }else if(arg === "--delay-ms"){
      options.delayMs = parsePositiveInteger(next(), "delay-ms");
    }else if(arg.startsWith("--delay-ms=")){
      options.delayMs = parsePositiveInteger(arg.slice("--delay-ms=".length), "delay-ms");
    }else if(arg === "--iso-delay-ms"){
      options.isoDelayMs = parsePositiveInteger(next(), "iso-delay-ms");
    }else if(arg.startsWith("--iso-delay-ms=")){
      options.isoDelayMs = parsePositiveInteger(arg.slice("--iso-delay-ms=".length), "iso-delay-ms");
    }else if(arg === "--max-countries"){
      options.maxCountries = parsePositiveInteger(next(), "max-countries");
    }else if(arg.startsWith("--max-countries=")){
      options.maxCountries = parsePositiveInteger(arg.slice("--max-countries=".length), "max-countries");
    }else if(arg === "--max-requests"){
      options.maxRequests = parsePositiveInteger(next(), "max-requests");
    }else if(arg.startsWith("--max-requests=")){
      options.maxRequests = parsePositiveInteger(arg.slice("--max-requests=".length), "max-requests");
    }else{
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

function parsePositiveInteger(value, label){
  const parsed = Number.parseInt(value, 10);
  if(!Number.isFinite(parsed) || parsed < 1) throw new Error(`--${label} must be a positive integer.`);
  return parsed;
}

function printHelp(){
  console.log([
    "Usage: node scripts\\build-region-groups.js [options]",
    "",
    "Options:",
    "  --report-only          Fetch, cache and report without updating regions-generated-data.js.",
    "  --max-requests N       Stop before making more than N uncached network requests.",
    "  --max-countries N      Process only the first N quiz countries after filtering.",
    "  --country NAME         Process one country name. Safe with --report-only unless --write-partial is set.",
    "  --delay-ms N           Delay between batched Wikidata queries. Default: 1500.",
    "  --iso-delay-ms N       Delay after per-country Wikidata fallback queries. Default: 600.",
    "  --cache-dir PATH       Cache successful JSON responses. Default: .region-cache.",
    "  --no-cache             Do not read or write cached responses.",
    "  --write-partial        Allow regions-generated-data.js to be written after a limited/partial run.",
    "  --wikidata-admin-fallback",
    "                         Try slower per-country Wikidata label fallback queries for boundary names. Default off.",
    "  --no-wikidata-admin-fallback",
    "                         Skip the per-country Wikidata label fallback queries.",
    "  --no-commons-flag-fallback",
    "                         Skip Commons filename/search fallback for missing regional flags.",
    "  --commons-search-limit N",
    "                         Limit per-region Commons searches after exact filename checks.",
    "  --no-generated-flag-fallback",
    "                         Leave regions without verified flags unfilled instead of generating training flags.",
    "  --limits               Print source-service rate-limit notes and exit.",
    "  --help                 Print this help and exit."
  ].join("\n"));
}

function printServiceLimits(){
  console.log("Known source-service limits for this generator:");
  for(const [service, detail] of Object.entries(SERVICE_LIMITS)){
    console.log(`- ${service}: ${detail.endpoint}`);
    for(const limit of detail.limits) console.log(`  - ${limit}`);
  }
  console.log(`Generator defaults: ${RUN_OPTIONS.delayMs}ms between batched Wikidata calls, ${RUN_OPTIONS.isoDelayMs}ms after ISO fallback calls, sequential GeoBoundaries requests, cache ${RUN_OPTIONS.cache ? "enabled" : "disabled"}.`);
}

function loadCountryData(){
  const source = fs.readFileSync(DATA_PATH, "utf8");
  return vm.runInNewContext(`${source}\n;({countryContinent,alpha2Overrides,countries});`, {}, {filename:"data.js"});
}

function normalise(value){
  return repairMojibake(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " and ")
    .replace(/\b(an|the|of|de|del|da|do|dos|das|la|le|el|autonomous|federal|administrative|special|capital|city|cities|district|districts|municipality|municipalities|province|provinces|provincia|region|regions|regiao|estado|state|states|territory|territories|prefecture|prefectures|governorate|governorates|oblast|oblasts|county|counties|department|departments|canton|cantons|maakond|republic|republics|voivodeship|voivodeships|subject|subjects)\b/g, " ")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactKey(value){
  return normalise(value).replace(/\s+/g, "");
}

function repairMojibake(value){
  const text = String(value || "");
  if(!/[ÃÂâ]/.test(text)) return text;
  try{
    return Buffer.from(text, "latin1").toString("utf8");
  }catch{
    return text;
  }
}

function safeIdentifier(value){
  return String(value || "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .replace(/\s+(.)/g, (_, chr)=>chr.toUpperCase())
    .replace(/^(.)/, (_, chr)=>chr.toUpperCase());
}

function escapeRegExp(value){
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class RequestBudgetError extends Error{
  constructor(message){
    super(message);
    this.name = "RequestBudgetError";
  }
}

class RateLimitError extends Error{
  constructor(message){
    super(message);
    this.name = "RateLimitError";
  }
}

async function fetchJson(url, options={}, cacheLabel=""){
  const text = await fetchText(url, options, cacheLabel);
  return parseJsonResponse(text, url);
}

async function fetchText(url, options={}, cacheLabel=""){
  const cachePath = RUN_OPTIONS.cache ? getCachePath(url, options, cacheLabel) : null;
  if(cachePath && fs.existsSync(cachePath)){
    try{
      RUN_STATE.fromCache++;
      return fs.readFileSync(cachePath, "utf8");
    }catch{
      fs.rmSync(cachePath, {force:true});
    }
  }

  let lastError = null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      if(RUN_STATE.networkRequests >= RUN_OPTIONS.maxRequests){
        throw new RequestBudgetError(`Stopped before request ${RUN_STATE.networkRequests + 1}; --max-requests is ${RUN_OPTIONS.maxRequests}.`);
      }
      RUN_STATE.networkRequests++;
      recordRequest(url);
      const response = await fetch(url, {
        ...options,
        headers: {
          "Accept":"application/json",
          "User-Agent":DEFAULT_USER_AGENT,
          ...(options.headers || {})
        }
      });
      recordRateLimitHeaders(url, response);
      if(response.status === 429 || response.status === 502 || response.status === 503){
        lastError = new Error(`${response.status} ${response.statusText} for ${url}`);
        if(response.status === 429) recordRateLimitEvent(url, response);
        await delay(getRetryDelay(response, attempt));
        continue;
      }
      if(!response.ok){
        throw new Error(`${response.status} ${response.statusText} for ${url}`);
      }
      const text = await response.text();
      if(cachePath){
        fs.mkdirSync(path.dirname(cachePath), {recursive:true});
        fs.writeFileSync(cachePath, text, "utf8");
        RUN_STATE.cacheWrites++;
      }
      return text;
    }catch(error){
      lastError = error;
      if(error instanceof RequestBudgetError || error instanceof RateLimitError) throw error;
      await delay(400 * attempt);
    }
  }
  if(lastError && /429/.test(lastError.message || "")){
    throw new RateLimitError(lastError.message);
  }
  throw lastError;
}

async function fetchBuffer(url, options={}, cacheLabel=""){
  const cachePath = RUN_OPTIONS.cache ? getCachePath(url, options, cacheLabel) : null;
  if(cachePath && fs.existsSync(cachePath)){
    try{
      RUN_STATE.fromCache++;
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      return Buffer.from(cached.base64, "base64");
    }catch{
      fs.rmSync(cachePath, {force:true});
    }
  }

  let lastError = null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      if(RUN_STATE.networkRequests >= RUN_OPTIONS.maxRequests){
        throw new RequestBudgetError(`Stopped before request ${RUN_STATE.networkRequests + 1}; --max-requests is ${RUN_OPTIONS.maxRequests}.`);
      }
      RUN_STATE.networkRequests++;
      recordRequest(url);
      const response = await fetch(url, {
        ...options,
        headers: {
          "Accept":"application/octet-stream, */*",
          "User-Agent":DEFAULT_USER_AGENT,
          ...(options.headers || {})
        }
      });
      recordRateLimitHeaders(url, response);
      if(response.status === 429 || response.status === 502 || response.status === 503){
        lastError = new Error(`${response.status} ${response.statusText} for ${url}`);
        if(response.status === 429) recordRateLimitEvent(url, response);
        await delay(getRetryDelay(response, attempt));
        continue;
      }
      if(!response.ok){
        throw new Error(`${response.status} ${response.statusText} for ${url}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if(cachePath){
        fs.mkdirSync(path.dirname(cachePath), {recursive:true});
        fs.writeFileSync(cachePath, `${JSON.stringify({base64:buffer.toString("base64")})}\n`, "utf8");
        RUN_STATE.cacheWrites++;
      }
      return buffer;
    }catch(error){
      lastError = error;
      if(error instanceof RequestBudgetError || error instanceof RateLimitError) throw error;
      await delay(400 * attempt);
    }
  }
  if(lastError && /429/.test(lastError.message || "")){
    throw new RateLimitError(lastError.message);
  }
  throw lastError;
}

function delay(ms){
  return new Promise(resolve=>setTimeout(resolve, ms));
}

function getRetryDelay(response, attempt){
  const retryAfter = Number.parseInt(response.headers.get("retry-after") || "", 10);
  if(Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return (response.status === 429 ? 8000 : 2500) * attempt;
}

function parseJsonResponse(text, url){
  try{
    return JSON.parse(text);
  }catch(error){
    const preview = String(text || "").slice(0, 90).replace(/\s+/g, " ");
    if(/^version https:\/\/git-lfs\.github\.com\/spec/i.test(text)){
      throw new Error(`Git LFS pointer received instead of JSON for ${url}. Use media.githubusercontent.com/raw file URLs.`);
    }
    if(/^</.test(String(text || "").trim())){
      throw new Error(`HTML received instead of JSON for ${url}: ${preview}`);
    }
    throw new Error(`Non-JSON response for ${url}: ${preview}`);
  }
}

function getCachePath(url, options, label){
  const prefix = label || new URL(url).hostname;
  const hash = crypto
    .createHash("sha256")
    .update(`${String(options.method || "GET").toUpperCase()}\n${url}\n${getRequestBodyKey(options.body)}`)
    .digest("hex")
    .slice(0, 24);
  return path.join(RUN_OPTIONS.cacheDir, `${safeCacheFileName(prefix)}-${hash}.json`);
}

function getRequestBodyKey(body){
  if(!body) return "";
  if(typeof body === "string") return body;
  if(typeof body.toString === "function") return body.toString();
  return JSON.stringify(body);
}

function safeCacheFileName(value){
  return String(value || "request")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "request";
}

function recordRequest(url){
  const host = getHost(url);
  RUN_STATE.requestsByHost[host] = (RUN_STATE.requestsByHost[host] || 0) + 1;
}

function recordRateLimitEvent(url, response){
  RUN_STATE.rateLimitEvents.push({
    url,
    status:response.status,
    retryAfter:response.headers.get("retry-after") || null,
    reset:response.headers.get("x-ratelimit-reset") || null,
    at:new Date().toISOString()
  });
}

function recordRateLimitHeaders(url, response){
  const headerNames = ["x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset", "retry-after"];
  const headers = {};
  for(const name of headerNames){
    const value = response.headers.get(name);
    if(value) headers[name] = value;
  }
  if(Object.keys(headers).length){
    RUN_STATE.responseLimitHeaders.push({
      host:getHost(url),
      status:response.status,
      headers,
      at:new Date().toISOString()
    });
  }
}

function getHost(url){
  try{
    return new URL(url).hostname;
  }catch{
    return "unknown";
  }
}

async function fetchWikidataRows(alpha2Codes){
  const chunks = [];
  for(let index=0;index<alpha2Codes.length;index+=12){
    chunks.push(alpha2Codes.slice(index, index + 12));
  }
  const rows = [];
  for(const chunk of chunks){
    rows.push(...await fetchWikidataRowsChunk(chunk));
    await delay(RUN_OPTIONS.delayMs);
  }
  return rows;
}

async function fetchCountryCodeRows(alpha2Codes){
  const values = alpha2Codes.map(code=>`"${code.toUpperCase()}"`).join(" ");
  const query = `
SELECT ?country ?countryLabel ?alpha2 ?alpha3 WHERE {
  VALUES ?alpha2 { ${values} }
  ?country wdt:P297 ?alpha2;
           wdt:P298 ?alpha3.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${LABEL_LANGUAGES}". }
}
ORDER BY ?countryLabel
`;
  const body = new URLSearchParams({query, format:"json"});
  const data = await fetchJson("https://query.wikidata.org/sparql", {
    method:"POST",
    headers: {
      "Content-Type":"application/x-www-form-urlencoded",
      "Accept":"application/sparql-results+json",
      "User-Agent":DEFAULT_USER_AGENT
    },
    body
  }, `wikidata-country-codes-${crypto.createHash("sha1").update(alpha2Codes.join("|")).digest("hex").slice(0, 12)}`);
  const codes = new Map();
  for(const row of data.results.bindings){
    if(row.alpha2 && row.alpha3) codes.set(row.alpha2.value.toUpperCase(), row.alpha3.value.toUpperCase());
  }
  return codes;
}

async function fetchWikidataRowsChunk(alpha2Codes){
  const values = alpha2Codes.map(code=>`"${code.toUpperCase()}"`).join(" ");
  const query = `
SELECT ?country ?countryLabel ?alpha2 ?alpha3 ?sub ?subLabel ?capital ?capitalLabel ?flag ?isoCode WHERE {
  VALUES ?alpha2 { ${values} }
  ?country wdt:P297 ?alpha2;
           wdt:P298 ?alpha3;
           wdt:P150 ?sub.
  ?sub wdt:P41 ?flag.
  OPTIONAL { ?sub wdt:P36 ?capitalDirect. }
  OPTIONAL { ?capitalInverse wdt:P1376 ?sub. }
  BIND(COALESCE(?capitalDirect, ?capitalInverse) AS ?capital)
  OPTIONAL { ?sub wdt:P300 ?isoCode. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${LABEL_LANGUAGES}". }
}
ORDER BY ?countryLabel ?subLabel
`;
  const body = new URLSearchParams({query, format:"json"});
  const data = await fetchJson("https://query.wikidata.org/sparql", {
    method:"POST",
    headers: {
      "Content-Type":"application/x-www-form-urlencoded",
      "Accept":"application/sparql-results+json",
      "User-Agent":DEFAULT_USER_AGENT
    },
    body
  }, `wikidata-subdivisions-${alpha2Codes.join("-")}`);
  return data.results.bindings;
}

async function fetchWikidataIsoRows(alpha2){
  const code = alpha2.toUpperCase();
  const query = `
SELECT ?country ?countryLabel ?alpha2 ?alpha3 ?sub ?subLabel ?capital ?capitalLabel ?flag ?isoCode WHERE {
  VALUES ?alpha2 { "${code}" }
  ?country wdt:P297 ?alpha2;
           wdt:P298 ?alpha3.
  ?sub wdt:P300 ?isoCode;
       wdt:P41 ?flag.
  OPTIONAL { ?sub wdt:P36 ?capitalDirect. }
  OPTIONAL { ?capitalInverse wdt:P1376 ?sub. }
  BIND(COALESCE(?capitalDirect, ?capitalInverse) AS ?capital)
  FILTER(STRSTARTS(STR(?isoCode), CONCAT(?alpha2, "-")))
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${LABEL_LANGUAGES}". }
}
ORDER BY ?subLabel
`;
  const body = new URLSearchParams({query, format:"json"});
  const data = await fetchJson("https://query.wikidata.org/sparql", {
    method:"POST",
    headers: {
      "Content-Type":"application/x-www-form-urlencoded",
      "Accept":"application/sparql-results+json",
      "User-Agent":DEFAULT_USER_AGENT
    },
    body
  }, `wikidata-iso-${code}`);
  return data.results.bindings;
}

async function fetchWikidataAdminRows(alpha2, names=[]){
  const code = alpha2.toUpperCase();
  const wantedNames = Array.from(new Set(names.map(name=>repairMojibake(name)).filter(Boolean))).slice(0, MAX_GROUP_SIZE);
  if(!wantedNames.length) return [];
  const chunks = [];
  for(let index=0;index<wantedNames.length;index+=35){
    chunks.push(wantedNames.slice(index, index + 35));
  }
  const rows = [];
  for(const chunk of chunks){
    rows.push(...await fetchWikidataAdminRowsChunk(code, chunk));
    await delay(RUN_OPTIONS.isoDelayMs);
  }
  return rows;
}

async function fetchWikidataAdminRowsChunk(code, names){
  const values = names.map(name=>quoteSparqlString(name)).join(" ");
  const query = `
SELECT ?country ?countryLabel ?alpha2 ?alpha3 ?sub ?subLabel ?capital ?capitalLabel ?flag ?isoCode WHERE {
  VALUES ?alpha2 { "${code}" }
  VALUES ?wantedName { ${values} }
  ?country wdt:P297 ?alpha2;
           wdt:P298 ?alpha3.
  ?sub wdt:P131+ ?country;
       wdt:P41 ?flag;
       wdt:P31/wdt:P279* wd:Q56061.
  ?sub rdfs:label ?rawLabel.
  FILTER(LANG(?rawLabel) IN ("en", "es", "fr", "de", "it", "pt", "nl", "ru", "uk", "pl", "sv", "da", "hu", "ga", ""))
  FILTER(CONTAINS(LCASE(STR(?rawLabel)), LCASE(?wantedName)) || CONTAINS(LCASE(?wantedName), LCASE(STR(?rawLabel))))
  OPTIONAL { ?sub wdt:P36 ?capitalDirect. }
  OPTIONAL { ?capitalInverse wdt:P1376 ?sub. }
  BIND(COALESCE(?capitalDirect, ?capitalInverse) AS ?capital)
  OPTIONAL { ?sub wdt:P300 ?isoCode. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${LABEL_LANGUAGES}". }
}
ORDER BY ?subLabel
LIMIT 400
`;
  const body = new URLSearchParams({query, format:"json"});
  const data = await fetchJson("https://query.wikidata.org/sparql", {
    method:"POST",
    headers: {
      "Content-Type":"application/x-www-form-urlencoded",
      "Accept":"application/sparql-results+json",
      "User-Agent":DEFAULT_USER_AGENT
    },
    body
  }, `wikidata-admin-${code}-${crypto.createHash("sha1").update(names.join("|")).digest("hex").slice(0, 12)}`);
  return data.results.bindings;
}

function quoteSparqlString(value){
  return `"${String(value || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}

function makeIsoRowsFetcher(){
  const cache = new Map();
  return async function getIsoRows(alpha2){
    const code = String(alpha2 || "").toUpperCase();
    if(!code) return [];
    if(cache.has(code)) return cache.get(code);
    const promise = fetchWikidataIsoRows(code).catch(error=>{
      cache.delete(code);
      throw error;
    });
    cache.set(code, promise);
    const rows = await promise;
    await delay(RUN_OPTIONS.isoDelayMs);
    return rows;
  };
}

function makeAdminRowsFetcher(){
  const cache = new Map();
  return async function getAdminRows(alpha2, names=[]){
    if(!RUN_OPTIONS.wikidataAdminFallback) return [];
    const code = String(alpha2 || "").toUpperCase();
    if(!code) return [];
    const nameKey = Array.from(new Set(names.map(name=>repairMojibake(name)).filter(Boolean))).sort().join("|");
    if(!nameKey) return [];
    const key = `${code}:${crypto.createHash("sha1").update(nameKey).digest("hex").slice(0, 12)}`;
    if(cache.has(key)) return cache.get(key);
    const promise = fetchWikidataAdminRows(code, names).catch(error=>{
      cache.delete(key);
      throw error;
    });
    cache.set(key, promise);
    const rows = await promise;
    return rows;
  };
}

function groupWikidataRows(rows){
  const groups = new Map();
  for(const row of rows){
    const alpha2 = row.alpha2.value.toUpperCase();
    const group = groups.get(alpha2) || makeEmptyWikidataGroup(row);
    mergeWikidataRow(group, row);
    groups.set(alpha2, group);
  }
  return groups;
}

function makeEmptyWikidataGroup(row){
  return {
    alpha2:row.alpha2.value.toUpperCase(),
    alpha3:row.alpha3.value.toUpperCase(),
    countryLabel:row.countryLabel.value,
    itemsById:new Map()
  };
}

function mergeWikidataRows(group, rows){
  for(const row of rows) mergeWikidataRow(group, row);
}

function mergeWikidataRow(group, row){
  const id = row.sub.value;
  const capital = getCapitalForRow(row);
  const capitalCoordinates = getCapitalCoordinatesForRow(row);
  const item = group.itemsById.get(id) || {
    wikidataId:id,
    name:row.subLabel.value,
    capital:capital || "",
    flagUrl:row.flag.value,
    capitalCoordinates:capitalCoordinates || null,
    isoCodes:new Set()
  };
  if(capital && !item.capital) item.capital = capital;
  if(capitalCoordinates && !item.capitalCoordinates) item.capitalCoordinates = capitalCoordinates;
  if(row.isoCode && row.isoCode.value) item.isoCodes.add(row.isoCode.value.toUpperCase());
  group.itemsById.set(id, item);
}

function getCapitalForRow(row){
  if(row.capitalLabel && row.capitalLabel.value) return row.capitalLabel.value;
  const subdivisionName = row.subLabel && row.subLabel.value ? row.subLabel.value : "";
  return SELF_CAPITAL_SUBDIVISION_NAMES[normalise(subdivisionName)] || "";
}

function getCapitalCoordinatesForRow(row){
  if(!row.capitalCoord || !row.capitalCoord.value) return null;
  const match = String(row.capitalCoord.value).match(/Point\(([-0-9.]+)\s+([-0-9.]+)\)/i);
  if(!match) return null;
  const lon = Number(match[1]);
  const lat = Number(match[2]);
  return isValidCapitalCoordinates([lon, lat]) ? [lon, lat] : null;
}

function makeGeoNamesFetcher(){
  let promise = null;
  return async function getGeoNamesData(){
    if(!promise){
      promise = loadGeoNamesData().catch(error=>{
        promise = null;
        throw error;
      });
    }
    return promise;
  };
}

async function loadGeoNamesData(){
  const [adminText, citiesZip] = await Promise.all([
    fetchText(GEONAMES_ADMIN1_URL, {}, "geonames-admin1"),
    fetchBuffer(GEONAMES_CITIES500_URL, {}, "geonames-cities500")
  ]);
  const entriesByCode = new Map();
  const entriesByCountry = new Map();

  for(const line of adminText.split(/\r?\n/)){
    if(!line.trim()) continue;
    const [code, name, asciiName, geonameId] = line.split("\t");
    const [alpha2, admin1Code] = String(code || "").split(".");
    if(!alpha2 || !admin1Code || !name) continue;
    const entry = {
      alpha2:alpha2.toUpperCase(),
      admin1Code,
      code,
      name,
      asciiName:asciiName || name,
      geonameId,
      capital:"",
      capitalAscii:"",
      capitalCoordinates:null,
      population:0
    };
    entriesByCode.set(code, entry);
    if(!entriesByCountry.has(entry.alpha2)) entriesByCountry.set(entry.alpha2, []);
    entriesByCountry.get(entry.alpha2).push(entry);
  }

  const citiesText = unzipTextFile(citiesZip, "cities500.txt");
  for(const line of citiesText.split(/\r?\n/)){
    if(!line.trim()) continue;
    const fields = line.split("\t");
    const featureClass = fields[6];
    const featureCode = fields[7];
    if(featureClass !== "P" || featureCode !== "PPLA") continue;
    const countryCode = fields[8];
    const admin1Code = fields[10];
    const entry = entriesByCode.get(`${countryCode}.${admin1Code}`);
    if(!entry) continue;
    const population = Number.parseInt(fields[14] || "0", 10) || 0;
    if(entry.capital && population <= entry.population) continue;
    const latitude = Number(fields[4]);
    const longitude = Number(fields[5]);
    entry.capital = fields[1] || fields[2] || "";
    entry.capitalAscii = fields[2] || entry.capital;
    entry.capitalCoordinates = isValidCapitalCoordinates([longitude, latitude]) ? [longitude, latitude] : null;
    entry.population = population;
  }

  return entriesByCountry;
}

function unzipTextFile(zipBuffer, wantedName){
  const eocdOffset = findEndOfCentralDirectory(zipBuffer);
  if(eocdOffset < 0) throw new Error("GeoNames ZIP did not contain a central directory.");
  const centralDirectoryOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  let offset = centralDirectoryOffset;

  for(let index=0;index<totalEntries;index++){
    if(zipBuffer.readUInt32LE(offset) !== 0x02014b50) break;
    const compressionMethod = zipBuffer.readUInt16LE(offset + 10);
    const compressedSize = zipBuffer.readUInt32LE(offset + 20);
    const fileNameLength = zipBuffer.readUInt16LE(offset + 28);
    const extraLength = zipBuffer.readUInt16LE(offset + 30);
    const commentLength = zipBuffer.readUInt16LE(offset + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(offset + 42);
    const fileName = zipBuffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);
    if(fileName === wantedName || (!wantedName && /\.txt$/i.test(fileName))){
      const localNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = zipBuffer.subarray(dataStart, dataStart + compressedSize);
      if(compressionMethod === 0) return compressed.toString("utf8");
      if(compressionMethod === 8) return zlib.inflateRawSync(compressed).toString("utf8");
      throw new Error(`Unsupported ZIP compression method ${compressionMethod} for ${fileName}.`);
    }
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  throw new Error(`GeoNames ZIP did not contain ${wantedName}.`);
}

function findEndOfCentralDirectory(buffer){
  for(let offset=buffer.length - 22;offset>=0 && offset>=buffer.length - 66000;offset--){
    if(buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

async function fillGeoNamesCapitals(group, getGeoNamesData){
  const entriesByCountry = await getGeoNamesData();
  const entries = entriesByCountry.get(group.alpha2) || [];
  if(!entries.length) return 0;
  let filled = 0;
  for(const item of group.itemsById.values()){
    const entry = findGeoNamesEntryForItem(item, group.alpha2, entries);
    if(!entry) continue;
    if(!item.capital && entry.capital){
      item.capital = entry.capital;
      filled++;
    }
    if(entry.capitalCoordinates && !item.capitalCoordinates){
      item.capitalCoordinates = entry.capitalCoordinates;
    }
  }
  return filled;
}

function findGeoNamesEntryForItem(item, alpha2, entries){
  const itemKeys = new Set(makeCandidateNames(item).flatMap(name=>[normalise(name), compactKey(name)]).filter(Boolean));
  const exactMatches = entries.filter(entry=>getGeoNamesEntryKeys(entry).some(key=>itemKeys.has(key)));
  const exact = exactMatches.find(entry=>entry.capital) || (exactMatches.length === 1 ? exactMatches[0] : null);
  if(exact) return exact;

  const containMatches = entries.filter(entry=>
    getGeoNamesEntryKeys(entry).some(entryKey=>
      Array.from(itemKeys).some(itemKey=>
        itemKey.length >= 4
        && entryKey.length >= 4
        && (entryKey.includes(itemKey) || itemKey.includes(entryKey))
      )
    )
  );
  return containMatches.length === 1 ? containMatches[0] : null;
}

function getGeoNamesEntryKeys(entry){
  return [
    entry.name,
    entry.asciiName,
    String(entry.name || "").replace(/\s*\([^)]*\)\s*/g, " "),
    String(entry.asciiName || "").replace(/\s*\([^)]*\)\s*/g, " ")
  ].flatMap(name=>[normalise(name), compactKey(name)]).filter(Boolean);
}

async function loadGeoBoundary(alpha3, release="gbOpen"){
  const meta = await fetchJson(`https://www.geoboundaries.org/api/current/${release}/${alpha3}/ADM1/`, {}, `geoboundaries-meta-${release}-${alpha3}`);
  const mapUrl = meta.simplifiedGeometryGeoJSON || meta.gjDownloadURL;
  if(!meta || !mapUrl) throw new Error("missing GeoJSON download URL");
  const geojson = await fetchJson(mapUrl, {}, `geoboundaries-map-${release}-${alpha3}`);
  const features = Array.isArray(geojson.features) ? geojson.features : [];
  return {meta:{...meta, releaseType:release, quizMapUrl:mapUrl}, features};
}

async function loadBestGeoBoundary(alpha3, items, countryName){
  let best = null;
  let firstError = null;
  for(const release of BOUNDARY_RELEASES){
    try{
      const boundary = await loadGeoBoundary(alpha3, release);
      const score = scoreBoundaryMatch(items, boundary.features, countryName);
      if(!best || score.value < best.score.value) best = {boundary, score};
      if(score.value === 0) break;
    }catch(error){
      firstError = firstError || error;
    }
  }
  if(best) return best.boundary;
  throw firstError || new Error("no usable GeoBoundaries release found");
}

function scoreBoundaryMatch(items, features, countryName){
  const countDifference = Math.abs(features.length - items.length);
  if(countDifference){
    return {value:countDifference * 1000, countDifference};
  }
  const match = matchItemsToFeatures(items, features, countryName);
  const unmatched = match.unmatchedItems.length + match.unmatchedFeatures.length;
  return {value:unmatched, countDifference:0, unmatched};
}

function getFeatureName(feature){
  const props = feature && feature.properties ? feature.properties : {};
  for(const field of NAME_FIELDS){
    if(props[field]) return String(props[field]).trim();
  }
  return "";
}

function getFeatureIso(feature){
  const props = feature && feature.properties ? feature.properties : {};
  return repairMojibake(props.shapeISO || props.ISO_3166_2 || props.HASC_1 || "").toUpperCase().trim();
}

function getFeatureIsoCodes(features){
  return new Set(features.map(getFeatureIso).filter(Boolean));
}

function itemHasFeatureIso(item, featureIsoCodes){
  if(!featureIsoCodes.size) return false;
  for(const code of item.isoCodes || []){
    if(featureIsoCodes.has(String(code || "").toUpperCase())) return true;
  }
  return false;
}

function filterItemsToBoundaryIsoCodes(items, features){
  const featureIsoCodes = getFeatureIsoCodes(features);
  if(!featureIsoCodes.size || items.length <= features.length) return items;
  const matched = items.filter(item=>itemHasFeatureIso(item, featureIsoCodes));
  return matched.length === features.length ? matched : items;
}

function filterItemsToMatchedBoundaryFeatures(items, features, countryName){
  if(items.length <= features.length) return items;
  const match = matchItemsToFeatures(items, features, countryName);
  if(match.unmatchedFeatures.length) return items;
  const matchedItemNames = new Set(match.matches.keys());
  const matchedItems = items.filter(item=>matchedItemNames.has(item.name));
  return matchedItems.length === features.length ? matchedItems : items;
}

function makeCandidateNames(item){
  return [
    item.name,
    repairMojibake(item.name).replace(/\s*\([^)]*\)\s*/g, " "),
    item.name.replace(/^Province of\s+/i, ""),
    item.name.replace(/^State of\s+/i, ""),
    item.name.replace(/\s+(Province|State|Region|Prefecture|Governorate|Oblast|Department|Canton)$/i, "")
  ].filter(Boolean);
}

function matchItemsToFeatures(items, features, countryName=""){
  const matches = new Map();
  const usedFeatures = new Set();
  const aliases = {};
  const extraAliases = EXTRA_NORMALISED_FEATURE_ALIASES[countryName] || {};

  const featuresWithNames = features.map((feature, index)=>({
    index,
    name:getFeatureName(feature),
    iso:getFeatureIso(feature),
    normalised:normalise(getFeatureName(feature)),
    compact:compactKey(getFeatureName(feature))
  })).filter(feature=>feature.name);
  const featureIsoCounts = featuresWithNames.reduce((acc, feature)=>{
    if(feature.iso) acc[feature.iso] = (acc[feature.iso] || 0) + 1;
    return acc;
  }, {});

  for(const item of items){
    const isoCodes = Array.from(item.isoCodes || []);
    const byIso = isoCodes.length
      ? featuresWithNames.find(feature=>
        feature.iso
        && featureIsoCounts[feature.iso] === 1
        && isoCodes.includes(feature.iso)
        && !usedFeatures.has(feature.index)
      )
      : null;
    if(byIso){
      matches.set(item.name, byIso);
      usedFeatures.add(byIso.index);
      if(normalise(byIso.name) !== normalise(item.name)) aliases[byIso.name] = item.name;
      continue;
    }

    const candidateKeys = new Set(makeCandidateNames(item).flatMap(name=>[normalise(name), compactKey(name)]).filter(Boolean));
    const exact = featuresWithNames.find(feature=>
      !usedFeatures.has(feature.index)
      && (candidateKeys.has(feature.normalised) || candidateKeys.has(feature.compact))
    );
    if(exact){
      matches.set(item.name, exact);
      usedFeatures.add(exact.index);
      if(normalise(exact.name) !== normalise(item.name)) aliases[exact.name] = item.name;
      continue;
    }

    const extraAlias = featuresWithNames.find(feature=>
      !usedFeatures.has(feature.index)
      && extraAliases[feature.normalised] === item.name
    );
    if(extraAlias){
      matches.set(item.name, extraAlias);
      usedFeatures.add(extraAlias.index);
      aliases[extraAlias.name] = item.name;
      continue;
    }

    const containMatches = featuresWithNames.filter(feature=>{
      if(usedFeatures.has(feature.index)) return false;
      return Array.from(candidateKeys).some(key=>
        key.length >= 4
        && (feature.normalised.includes(key) || feature.compact.includes(key) || key.includes(feature.normalised) || key.includes(feature.compact))
      );
    });
    if(containMatches.length === 1){
      const contain = containMatches[0];
      matches.set(item.name, contain);
      usedFeatures.add(contain.index);
      if(normalise(contain.name) !== normalise(item.name)) aliases[contain.name] = item.name;
    }
  }

  return {
    matches,
    aliases,
    unmatchedItems: items.filter(item=>!matches.has(item.name)).map(item=>item.name),
    unmatchedFeatures: featuresWithNames.filter(feature=>!usedFeatures.has(feature.index)).map(feature=>feature.name)
  };
}

function replaceMissingLabelsWithBoundaryNames(items, matches){
  let changed = false;
  for(const item of items){
    if(!/^Q\d+$/i.test(item.name)) continue;
    const feature = matches.get(item.name);
    if(!feature || !feature.name) continue;
    item.name = repairMojibake(feature.name);
    changed = true;
  }
  return changed;
}

function makeGroup(countryName, alpha3, meta, items, aliases, options={}){
  const overrides = GROUP_LABEL_OVERRIDES[safeIdentifier(countryName)] || {};
  const itemLabel = overrides.itemLabel || "region";
  const itemPluralLabel = overrides.itemPluralLabel || `${itemLabel}s`;
  const capitalLabel = overrides.capitalLabel || "regional capital";
  const capitalPluralLabel = overrides.capitalPluralLabel || `${capitalLabel}s`;
  const flagCount = items.filter(item=>itemHasFlag(item)).length;
  const verifiedFlagCount = items.filter(item=>item.flagUrl || item.flagFile).length;
  const generatedFlagCount = items.filter(item=>item.generatedFlag).length;
  return {
    key:countryName,
    label:countryName,
    itemLabel,
    itemPluralLabel,
    capitalLabel,
    capitalPluralLabel,
    listMapLabel:overrides.listMapLabel || "Region Map",
    mapLabel:`${countryName} ${itemPluralLabel}`,
    flagLabel:`${itemLabel} flags`,
    aliases:[],
    source:options.source || "generated from Wikidata P150/P300/P131/P41 with P36, GeoNames ADM1/PPLA, or narrow self-capital fallbacks, matched to GeoBoundaries ADM1",
    flagCoverage: {
      available:flagCount,
      total:items.length,
      verified:verifiedFlagCount,
      generated:generatedFlagCount
    },
    map:{
      source:"geojson",
      url:toBrowserMapUrl(meta.quizMapUrl || meta.simplifiedGeometryGeoJSON || meta.gjDownloadURL),
      fallbackUrls:toBrowserMapFallbackUrls(meta.quizMapUrl || meta.simplifiedGeometryGeoJSON || meta.gjDownloadURL),
      nameFields:NAME_FIELDS,
      yDirection:"up",
      featureAliases:aliases
    },
    items:items.map(item=>({
      name:item.name,
      capital:item.capital,
      ...(isValidCapitalCoordinates(item.capitalCoordinates) ? {capitalCoordinates:item.capitalCoordinates} : {}),
      ...(item.flagUrl ? {flagUrl:toHttps(item.flagUrl)} : {}),
      ...(item.flagFile ? {flagFile:item.flagFile} : {}),
      ...(Array.isArray(item.colours) && item.colours.length ? {colours:item.colours} : {}),
      ...(item.generatedFlag ? {generatedFlag:true} : {}),
      isoCodes:Array.from(item.isoCodes).sort()
    }))
  };
}

function itemHasFlag(item){
  return !!(
    item
    && (
      item.flagUrl
      || item.flagFile
      || (Array.isArray(item.colours) && item.colours.length)
    )
  );
}

function isValidCapitalCoordinates(value){
  return Array.isArray(value)
    && value.length === 2
    && value.every(Number.isFinite)
    && Math.abs(value[0]) <= 180
    && Math.abs(value[1]) <= 90;
}

async function fillOutputGroupFlagGaps(outputGroups){
  const stats = {
    groups:Object.keys(outputGroups).length,
    items:0,
    missingBefore:0,
    commonsExact:0,
    commonsSearch:0,
    generated:0,
    missingAfter:0,
    exactCandidates:0,
    exactFilesChecked:0,
    searchRequests:0
  };
  for(const group of Object.values(outputGroups)) stats.items += Array.isArray(group.items) ? group.items.length : 0;

  let missing = collectMissingFlagItems(outputGroups);
  stats.missingBefore = missing.length;
  if(RUN_OPTIONS.commonsFlagFallback && missing.length){
    const exactStats = await fillCommonsExactFlagFiles(missing);
    stats.commonsExact = exactStats.assigned;
    stats.exactCandidates = exactStats.candidates;
    stats.exactFilesChecked = exactStats.checked;
  }

  missing = collectMissingFlagItems(outputGroups);
  if(RUN_OPTIONS.commonsFlagFallback && missing.length && RUN_OPTIONS.commonsSearchLimit !== 0){
    const limit = Number.isFinite(RUN_OPTIONS.commonsSearchLimit)
      ? Math.min(RUN_OPTIONS.commonsSearchLimit, missing.length)
      : missing.length;
    for(const record of missing.slice(0, limit)){
      const file = await findCommonsSearchFlagFile(record.group, record.item);
      stats.searchRequests++;
      if(file && !itemHasFlag(record.item)){
        record.item.flagFile = file;
        stats.commonsSearch++;
      }
      if(stats.searchRequests % 100 === 0){
        console.log(`Commons flag search: ${stats.searchRequests}/${limit} checked, ${stats.commonsSearch} found.`);
      }
      await delay(120);
    }
  }

  missing = collectMissingFlagItems(outputGroups);
  if(RUN_OPTIONS.generatedFlagFallback && missing.length){
    for(const record of missing){
      record.item.colours = makeGeneratedRegionFlagColours(record.group.key, record.item.name);
      record.item.generatedFlag = true;
      stats.generated++;
    }
  }

  updateOutputGroupFlagCoverage(outputGroups);
  stats.missingAfter = collectMissingFlagItems(outputGroups).length;
  stats.coverage = summariseOutputGroupFlagCoverage(outputGroups);
  return stats;
}

function collectMissingFlagItems(outputGroups){
  const records = [];
  for(const group of Object.values(outputGroups)){
    for(const item of group.items || []){
      if(!itemHasFlag(item)) records.push({group, item});
    }
  }
  return records;
}

async function fillCommonsExactFlagFiles(records){
  const candidateLists = records.map(record=>({
    record,
    candidates:makeCommonsFlagFileTitleCandidates(record.group, record.item)
  }));
  const allTitles = Array.from(new Set(candidateLists.flatMap(entry=>entry.candidates)));
  const existing = await fetchCommonsExistingFileTitles(allTitles);
  let assigned = 0;
  for(const entry of candidateLists){
    for(const title of entry.candidates){
      const file = existing.get(normaliseCommonsTitle(title));
      if(!file) continue;
      entry.record.item.flagFile = file;
      assigned++;
      break;
    }
  }
  return {assigned, candidates:allTitles.length, checked:existing.size};
}

async function fetchCommonsExistingFileTitles(titles){
  const existing = new Map();
  const uniqueTitles = Array.from(new Set(titles.map(title=>normaliseCommonsTitle(title)).filter(Boolean)));
  for(let index=0;index<uniqueTitles.length;index+=45){
    const chunk = uniqueTitles.slice(index, index + 45);
    const params = new URLSearchParams({
      action:"query",
      format:"json",
      formatversion:"2",
      redirects:"1",
      prop:"imageinfo",
      iiprop:"mime|mediatype",
      titles:chunk.join("|")
    });
    const cacheKey = crypto.createHash("sha1").update(chunk.join("|")).digest("hex").slice(0, 16);
    const data = await fetchJson(`${COMMONS_API_URL}?${params}`, {}, `commons-files-${cacheKey}`);
    for(const page of (data.query && data.query.pages) || []){
      if(page.missing || page.invalid || page.ns !== 6 || !isUsableCommonsImage(page)) continue;
      const title = normaliseCommonsTitle(page.title);
      existing.set(title, stripCommonsFilePrefix(page.title));
    }
    await delay(80);
  }
  return existing;
}

async function findCommonsSearchFlagFile(group, item){
  const queries = makeCommonsFlagSearchQueries(group, item);
  for(const query of queries){
    const params = new URLSearchParams({
      action:"query",
      format:"json",
      formatversion:"2",
      list:"search",
      srnamespace:"6",
      srlimit:"12",
      srsearch:query
    });
    const cacheKey = crypto.createHash("sha1").update(`${group.key}|${item.name}|${query}`).digest("hex").slice(0, 16);
    const data = await fetchJson(`${COMMONS_API_URL}?${params}`, {}, `commons-search-${cacheKey}`);
    const titles = ((data.query && data.query.search) || []).map(result=>result.title).filter(Boolean);
    const best = pickBestCommonsFlagTitle(titles, group, item);
    if(best) return stripCommonsFilePrefix(best);
  }
  return "";
}

function isUsableCommonsImage(page){
  const info = page.imageinfo && page.imageinfo[0];
  if(!info) return false;
  const mime = String(info.mime || "").toLowerCase();
  return /^(image\/svg\+xml|image\/png)$/.test(mime);
}

function makeCommonsFlagFileTitleCandidates(group, item){
  const baseNames = makeRegionFileNameBases(group, item);
  const terms = makeRegionTypeTerms(group).slice(0, 3);
  const titles = [];
  for(const base of baseNames.slice(0, 3)){
    pushCommonsTitle(titles, `Flag of ${base}.svg`);
    pushCommonsTitle(titles, `Flag of ${base}.png`);
    pushCommonsTitle(titles, `Flag of ${base}, ${group.key}.svg`);
    pushCommonsTitle(titles, `Flag of ${base} (${group.key}).svg`);
    pushCommonsTitle(titles, `Bandera de ${base}.svg`);
    pushCommonsTitle(titles, `Bandeira de ${base}.svg`);
    pushCommonsTitle(titles, `Drapeau de ${base}.svg`);
    for(const term of terms){
      if(!term || normalise(base).includes(normalise(term))) continue;
      pushCommonsTitle(titles, `Flag of ${base} ${term}.svg`);
      pushCommonsTitle(titles, `Flag of ${term} of ${base}.svg`);
    }
  }
  return titles;
}

function makeCommonsFlagSearchQueries(group, item){
  const base = makeRegionFileNameBases(group, item)[0] || item.name;
  return [
    `intitle:"Flag of ${base}"`,
    `"${base}" "flag" "${group.key}"`,
    `"${base}" "bandera"`,
    `"${base}" "bandeira"`,
    `"${base}" "drapeau"`
  ];
}

function makeRegionFileNameBases(group, item){
  const values = [];
  for(const name of makeCandidateNames(item)){
    const repaired = repairMojibake(name).replace(/\s+/g, " ").trim();
    if(!repaired) continue;
    values.push(repaired);
    for(const term of makeRegionTypeTerms(group)){
      const suffix = new RegExp(`\\s+${escapeRegExp(term)}$`, "i");
      if(suffix.test(repaired)) values.push(repaired.replace(suffix, "").trim());
    }
  }
  return Array.from(new Set(values.filter(Boolean)));
}

function makeRegionTypeTerms(group){
  return [
    group.itemLabel,
    ...(String(group.itemLabel || "").split(/\s+or\s+|\s+and\s+/i)),
    "province",
    "state",
    "region",
    "district",
    "department",
    "governorate",
    "county",
    "prefecture",
    "canton",
    "oblast"
  ].map(value=>String(value || "").trim()).filter(Boolean);
}

function pickBestCommonsFlagTitle(titles, group, item){
  let best = null;
  let bestScore = -Infinity;
  for(const title of titles){
    const score = scoreCommonsFlagTitle(title, group, item);
    if(score > bestScore){
      best = title;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : "";
}

function scoreCommonsFlagTitle(title, group, item){
  const file = stripCommonsFilePrefix(title);
  const lower = file.toLowerCase();
  if(!/\.(svg|png)$/i.test(file)) return -Infinity;
  if(/\b(prayer|locator|location|map|blank|icon|logo|seal|emblem|coat|arms|historical|proposed|animated|variant|hoisting|summit|witnessed|traditional|ceremony)\b/i.test(file)) return -Infinity;
  if(!/\b(flag|flags|bandera|bandeira|drapeau|flagge|bandiera|vlag|flaga|bayrak)\b/i.test(file)) return -Infinity;
  const titleKey = compactKey(file.replace(/\.[a-z0-9]+$/i, ""));
  const itemKeys = makeRegionFileNameBases(group, item).map(value=>compactKey(value)).filter(key=>key.length >= 3);
  if(!itemKeys.some(key=>titleKey.includes(key) || key.includes(titleKey))) return -Infinity;
  let score = 20;
  if(/^flag of /i.test(file)) score += 12;
  if(/\.(svg)$/i.test(file)) score += 8;
  if(titleKey.includes(compactKey(group.key))) score += 4;
  if(lower.includes("current")) score += 2;
  if(/[()]/.test(file)) score -= 3;
  return score;
}

function pushCommonsTitle(titles, file){
  const cleaned = String(file || "").replace(/\s+/g, " ").trim();
  if(!cleaned) return;
  titles.push(normaliseCommonsTitle(`File:${cleaned}`));
}

function normaliseCommonsTitle(title){
  const cleaned = String(title || "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if(!cleaned) return "";
  return /^File:/i.test(cleaned) ? `File:${cleaned.replace(/^File:/i, "").trim()}` : `File:${cleaned}`;
}

function stripCommonsFilePrefix(title){
  return normaliseCommonsTitle(title).replace(/^File:/i, "");
}

function makeGeneratedRegionFlagColours(countryName, itemName){
  const hash = crypto.createHash("sha256").update(`${countryName}|${itemName}`).digest();
  return [
    hslToHex(hash[0] % 360, 68 + (hash[1] % 16), 32 + (hash[2] % 12)),
    hslToHex((hash[3] + 118) % 360, 62 + (hash[4] % 18), 52 + (hash[5] % 14)),
    hslToHex((hash[6] + 236) % 360, 58 + (hash[7] % 20), 38 + (hash[8] % 16))
  ];
}

function hslToHex(h, s, l){
  const hue = (((h % 360) + 360) % 360) / 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const toRgb = t=>{
    let value = t;
    if(value < 0) value += 1;
    if(value > 1) value -= 1;
    if(value < 1 / 6) return p + (q - p) * 6 * value;
    if(value < 1 / 2) return q;
    if(value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  const rgb = [toRgb(hue + 1 / 3), toRgb(hue), toRgb(hue - 1 / 3)]
    .map(value=>Math.round(value * 255).toString(16).padStart(2, "0"));
  return `#${rgb.join("")}`;
}

function updateOutputGroupFlagCoverage(outputGroups){
  for(const group of Object.values(outputGroups)){
    const items = group.items || [];
    const available = items.filter(item=>itemHasFlag(item)).length;
    const verified = items.filter(item=>item.flagUrl || item.flagFile).length;
    const generated = items.filter(item=>item.generatedFlag).length;
    group.flagCoverage = {
      available,
      total:items.length,
      verified,
      generated
    };
  }
}

function summariseOutputGroupFlagCoverage(outputGroups){
  const summary = {
    groups:0,
    items:0,
    available:0,
    verified:0,
    generated:0,
    missing:0
  };
  for(const group of Object.values(outputGroups)){
    const coverage = group.flagCoverage || {};
    summary.groups++;
    summary.items += coverage.total || 0;
    summary.available += coverage.available || 0;
    summary.verified += coverage.verified || 0;
    summary.generated += coverage.generated || 0;
  }
  summary.missing = summary.items - summary.available;
  return summary;
}

function syncReportFlagCounts(report, outputGroups){
  const byCountry = new Map(report.included.map(entry=>[entry.country, entry]));
  for(const group of Object.values(outputGroups)){
    const entry = byCountry.get(group.key);
    if(!entry) continue;
    const coverage = group.flagCoverage || {};
    entry.flags = coverage.available || 0;
    entry.verifiedFlags = coverage.verified || 0;
    entry.generatedFlags = coverage.generated || 0;
  }
}

async function tryBuildBoundaryFallbackGroup({countryName, alpha2, alpha3, wikidataGroup, boundary, getGeoNamesData, outputGroups, report, originalSkipped}){
  if(!alpha3){
    originalSkipped.fallbackError = "missing alpha-3 country code";
    report.skipped.push(originalSkipped);
    return originalSkipped;
  }

  let selectedBoundary = boundary;
  try{
    if(!selectedBoundary){
      const metadataItems = getMetadataItemsForFallback(countryName, wikidataGroup);
      selectedBoundary = await loadBestGeoBoundary(alpha3, metadataItems, countryName);
    }
  }catch(error){
    originalSkipped.fallbackError = error.message || String(error);
    report.skipped.push(originalSkipped);
    return originalSkipped;
  }

  const features = (selectedBoundary.features || []).filter(feature=>getFeatureName(feature));
  if(features.length < MIN_GROUP_SIZE){
    originalSkipped.fallbackError = `only ${features.length} boundary features`;
    report.skipped.push(originalSkipped);
    return originalSkipped;
  }
  if(features.length > MAX_GROUP_SIZE){
    originalSkipped.fallbackError = `${features.length} boundary features exceeds current UI limit ${MAX_GROUP_SIZE}`;
    report.skipped.push(originalSkipped);
    return originalSkipped;
  }

  const entriesByCountry = await getGeoNamesData();
  const geoNamesEntries = entriesByCountry.get(alpha2) || [];
  const metadataItems = getMetadataItemsForFallback(countryName, wikidataGroup);
  const flagItems = metadataItems.filter(item=>item.flagUrl);
  const flagMatches = matchItemsToFeatures(flagItems, features, countryName);
  const flagsByFeatureIndex = new Map();
  for(const [itemName, feature] of flagMatches.matches){
    const item = flagItems.find(candidate=>candidate.name === itemName);
    if(item && feature) flagsByFeatureIndex.set(feature.index, item);
  }

  let capitalFallbackCount = 0;
  const aliases = {};
  const items = features.map((feature, index)=>{
    const featureName = repairMojibake(getFeatureName(feature));
    const patch = getBoundaryFallbackItemPatch(countryName, featureName);
    const name = patch && patch.name ? patch.name : featureName;
    if(name !== featureName) aliases[featureName] = name;
    const iso = getFeatureIso(feature);
    const item = {
      name,
      capital:"",
      flagUrl:"",
      capitalCoordinates:null,
      isoCodes:new Set(iso ? [iso] : [])
    };
    const geoNamesEntry = findGeoNamesEntryForItem(item, alpha2, geoNamesEntries);
    if(geoNamesEntry && geoNamesEntry.capitalCoordinates){
      item.capitalCoordinates = geoNamesEntry.capitalCoordinates;
    }
    if(patch && patch.capital){
      item.capital = patch.capital;
    }else if(geoNamesEntry && geoNamesEntry.capital){
      item.capital = geoNamesEntry.capital;
    }else{
      item.capital = SELF_CAPITAL_SUBDIVISION_NAMES[normalise(name)] || name;
      capitalFallbackCount++;
    }
    const flagItem = flagsByFeatureIndex.get(index);
    if(flagItem && flagItem.flagUrl) item.flagUrl = flagItem.flagUrl;
    return item;
  }).sort((a, b)=>a.name.localeCompare(b.name));

  outputGroups[countryName] = makeGroup(countryName, alpha3, selectedBoundary.meta, items, aliases, {
    source:BOUNDARY_FALLBACK_SOURCE
  });
  const flagCount = items.filter(item=>item.flagUrl).length;
  const included = {
    country:countryName,
    items:items.length,
    alpha3,
    fallback:true,
    fallbackFrom:originalSkipped.reason,
    flags:flagCount,
    capitalFallbacks:capitalFallbackCount
  };
  report.included.push(included);
  return {...included, reason:"included"};
}

function getMetadataItemsForFallback(countryName, group){
  const items = group && group.itemsById ? Array.from(group.itemsById.values()) : [];
  return applyManualItemPatches(countryName, items)
    .filter(item=>item && item.name)
    .map(item=>({
      ...item,
      capital:item.capital || "",
      flagUrl:item.flagUrl || "",
      capitalCoordinates:isValidCapitalCoordinates(item.capitalCoordinates) ? item.capitalCoordinates : null,
      isoCodes:item.isoCodes instanceof Set ? item.isoCodes : new Set(item.isoCodes || [])
    }));
}

function getBoundaryFallbackItemPatch(countryName, name){
  const patches = BOUNDARY_FALLBACK_ITEM_PATCHES[countryName] || {};
  return patches[normalise(name)] || null;
}

function toHttps(value){
  return String(value || "").replace(/^http:\/\//i, "https://");
}

function toBrowserMapUrl(value){
  const url = toHttps(value);
  const match = url.match(/^https:\/\/github\.com\/wmgeolab\/geoBoundaries\/raw\/([^/]+)\/(.+)$/i);
  if(match) return `https://raw.githubusercontent.com/wmgeolab/geoBoundaries/${match[1]}/${match[2]}`;
  return url;
}

function toBrowserMapFallbackUrls(value){
  const url = toHttps(value);
  const urls = [];
  const browserUrl = toBrowserMapUrl(url);
  const rawMatch = browserUrl.match(/^https:\/\/raw\.githubusercontent\.com\/wmgeolab\/geoBoundaries\/([^/]+)\/(.+)$/i);
  if(rawMatch) urls.push(`https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/${rawMatch[1]}/${rawMatch[2]}`);
  if(browserUrl !== url) urls.push(url);
  return Array.from(new Set(urls));
}

function getCompleteItems(group){
  return Array.from(group.itemsById.values())
    .filter(item=>item.name && item.capital && item.flagUrl)
    .sort((a, b)=>a.name.localeCompare(b.name));
}

function applyManualItemPatches(countryName, items){
  const patches = MANUAL_ITEM_PATCHES[safeIdentifier(countryName)] || [];
  if(!patches.length) return items;
  const byIso = new Set(items.flatMap(item=>Array.from(item.isoCodes || [])));
  const byName = new Set(items.map(item=>patchIdentityKey(item.name)));
  const patched = [...items];
  for(const patch of patches){
    if(byName.has(patchIdentityKey(patch.name)) || patch.isoCodes.some(code=>byIso.has(code))) continue;
    patched.push({
      ...patch,
      isoCodes:new Set(patch.isoCodes || [])
    });
  }
  return patched.sort((a, b)=>a.name.localeCompare(b.name));
}

function patchIdentityKey(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function serialiseJs(value){
  return JSON.stringify(value, null, 2)
    .replace(/"([A-Za-z_$][A-Za-z0-9_$]*)":/g, "$1:")
    .replace(/</g, "\\u003c");
}

function selectCountries(countries){
  let selected = countries.filter(country=>!MANUAL_GROUPS.has(country));
  if(RUN_OPTIONS.country){
    const target = normalise(RUN_OPTIONS.country);
    selected = selected.filter(country=>normalise(country) === target);
    if(!selected.length) throw new Error(`No quiz country matched --country "${RUN_OPTIONS.country}".`);
  }
  if(Number.isFinite(RUN_OPTIONS.maxCountries)){
    selected = selected.slice(0, RUN_OPTIONS.maxCountries);
  }
  return selected;
}

async function buildCountryGroup(countryName, alpha2Overrides, alpha3ByAlpha2, wikidataGroups, getIsoRows, getAdminRows, getGeoNamesData, outputGroups, report){
  const alpha2 = String(alpha2Overrides[countryName] || "").toUpperCase();
  const boundaryAlpha3 = BOUNDARY_ALPHA3_OVERRIDES[countryName] || alpha3ByAlpha2.get(alpha2);
  let group = wikidataGroups.get(alpha2);
  if(!group){
    const isoGroups = groupWikidataRows(await getIsoRows(alpha2));
    group = isoGroups.get(alpha2);
    if(!group){
      const adminGroups = groupWikidataRows(await getAdminRows(alpha2, []));
      group = adminGroups.get(alpha2);
    }
    if(!group){
      const skipped = {country:countryName, reason:"wikidata-no-complete-subdivision-rows"};
      return tryBuildBoundaryFallbackGroup({
        countryName,
        alpha2,
        alpha3:boundaryAlpha3,
        wikidataGroup:null,
        getGeoNamesData,
        outputGroups,
        report,
        originalSkipped:skipped
      });
    }
  }
  await fillGeoNamesCapitals(group, getGeoNamesData);
  let items = applyManualItemPatches(countryName, getCompleteItems(group));
  if(items.length < MIN_GROUP_SIZE){
    mergeWikidataRows(group, await getIsoRows(alpha2));
    mergeWikidataRows(group, await getAdminRows(alpha2, []));
    await fillGeoNamesCapitals(group, getGeoNamesData);
    items = applyManualItemPatches(countryName, getCompleteItems(group));
    if(items.length < MIN_GROUP_SIZE){
      const skipped = {country:countryName, reason:"fewer-than-two-complete-items", count:items.length};
      return tryBuildBoundaryFallbackGroup({
        countryName,
        alpha2,
        alpha3:BOUNDARY_ALPHA3_OVERRIDES[countryName] || group.alpha3 || boundaryAlpha3,
        wikidataGroup:group,
        getGeoNamesData,
        outputGroups,
        report,
        originalSkipped:skipped
      });
    }
  }
  if(items.length > MAX_GROUP_SIZE){
    const skipped = {country:countryName, reason:"too-many-items-for-current-ui", count:items.length};
    report.skipped.push(skipped);
    return skipped;
  }

  try{
    const {meta, features} = await loadBestGeoBoundary(BOUNDARY_ALPHA3_OVERRIDES[countryName] || group.alpha3, items, countryName);
    items = filterItemsToBoundaryIsoCodes(items, features);
    items = filterItemsToMatchedBoundaryFeatures(items, features, countryName);
    if(features.length !== items.length){
      const isoRows = await getIsoRows(alpha2);
      const adminRows = await getAdminRows(alpha2, features.map(getFeatureName).filter(Boolean));
      if(isoRows.length){
        const featureIsoCodes = new Set(features.map(getFeatureIso).filter(Boolean));
        const matchingIsoRows = isoRows.filter(row=>
          row.isoCode && featureIsoCodes.has(row.isoCode.value.toUpperCase())
        );
        mergeWikidataRows(group, matchingIsoRows);
      }
      if(adminRows.length) mergeWikidataRows(group, adminRows);
      await fillGeoNamesCapitals(group, getGeoNamesData);
      items = filterItemsToBoundaryIsoCodes(applyManualItemPatches(countryName, getCompleteItems(group)), features);
      items = filterItemsToMatchedBoundaryFeatures(items, features, countryName);
      await delay(RUN_OPTIONS.isoDelayMs);
    }
    if(features.length !== items.length){
      const skipped = {
        country:countryName,
        reason:"boundary-count-mismatch",
        items:items.length,
        features:features.length,
        missingFeatureNames:getMissingFeatureNames(items, features, countryName),
        unmatchedItemNames:getUnmatchedItemNames(items, features, countryName),
        itemNames:items.length <= MAX_GROUP_SIZE ? items.map(item=>item.name) : undefined,
        featureNames:features.length <= MAX_GROUP_SIZE ? features.map(getFeatureName).filter(Boolean) : undefined
      };
      return tryBuildBoundaryFallbackGroup({
        countryName,
        alpha2,
        alpha3:BOUNDARY_ALPHA3_OVERRIDES[countryName] || group.alpha3 || boundaryAlpha3,
        wikidataGroup:group,
        boundary:{meta, features},
        getGeoNamesData,
        outputGroups,
        report,
        originalSkipped:skipped
      });
    }
    let match = matchItemsToFeatures(items, features, countryName);
    if(replaceMissingLabelsWithBoundaryNames(items, match.matches)){
      match = matchItemsToFeatures(items, features, countryName);
    }
    if(match.unmatchedItems.length || match.unmatchedFeatures.length){
      const skipped = {
        country:countryName,
        reason:"boundary-name-mismatch",
        items:items.length,
        features:features.length,
        unmatchedItems:match.unmatchedItems.slice(0, 8),
        unmatchedFeatures:match.unmatchedFeatures.slice(0, 8)
      };
      return tryBuildBoundaryFallbackGroup({
        countryName,
        alpha2,
        alpha3:BOUNDARY_ALPHA3_OVERRIDES[countryName] || group.alpha3 || boundaryAlpha3,
        wikidataGroup:group,
        boundary:{meta, features},
        getGeoNamesData,
        outputGroups,
        report,
        originalSkipped:skipped
      });
    }
    outputGroups[countryName] = makeGroup(countryName, group.alpha3, meta, items, match.aliases);
    const included = {country:countryName, items:items.length, alpha3:group.alpha3};
    report.included.push(included);
    return {...included, reason:"included"};
  }catch(error){
    if(error instanceof RequestBudgetError || error instanceof RateLimitError) throw error;
    const skipped = {country:countryName, reason:"geoboundaries-error", error:error.message};
    report.skipped.push(skipped);
    return skipped;
  }
}

function getMissingFeatureNames(items, features, countryName){
  if(!Array.isArray(features) || features.length > MAX_GROUP_SIZE) return undefined;
  const match = matchItemsToFeatures(items, features, countryName);
  return match.unmatchedFeatures.slice(0, 12);
}

function getUnmatchedItemNames(items, features, countryName){
  if(!Array.isArray(items) || items.length > MAX_GROUP_SIZE) return undefined;
  const match = matchItemsToFeatures(items, features, countryName);
  return match.unmatchedItems.slice(0, 12);
}

function logProgress(done, total, countryName, outcome){
  const elapsedMs = Date.now() - RUN_STATE.startedAt;
  const etaMs = done > 0 ? (elapsedMs / done) * (total - done) : 0;
  const reason = outcome.reason === "included" ? `included ${outcome.items}` : `skipped ${outcome.reason}`;
  console.log(`[${done}/${total}] ${countryName}: ${reason}. Elapsed ${formatDuration(elapsedMs)}, ETA ${formatDuration(etaMs)}.`);
}

function makeReportOptions(){
  return {
    cache:RUN_OPTIONS.cache,
    cacheDir:path.relative(ROOT, RUN_OPTIONS.cacheDir) || ".",
    country:RUN_OPTIONS.country,
    delayMs:RUN_OPTIONS.delayMs,
    isoDelayMs:RUN_OPTIONS.isoDelayMs,
    commonsFlagFallback:RUN_OPTIONS.commonsFlagFallback,
    commonsSearchLimit:Number.isFinite(RUN_OPTIONS.commonsSearchLimit) ? RUN_OPTIONS.commonsSearchLimit : null,
    generatedFlagFallback:RUN_OPTIONS.generatedFlagFallback,
    maxCountries:Number.isFinite(RUN_OPTIONS.maxCountries) ? RUN_OPTIONS.maxCountries : null,
    maxRequests:Number.isFinite(RUN_OPTIONS.maxRequests) ? RUN_OPTIONS.maxRequests : null,
    reportOnly:RUN_OPTIONS.reportOnly,
    writePartial:RUN_OPTIONS.writePartial,
    wikidataAdminFallback:RUN_OPTIONS.wikidataAdminFallback
  };
}

function finaliseReport(report, countryList){
  const elapsedMs = Date.now() - RUN_STATE.startedAt;
  report.finishedAt = new Date().toISOString();
  report.elapsedMs = elapsedMs;
  report.elapsed = formatDuration(elapsedMs);
  report.includedCount = report.included.length;
  report.skippedCount = report.skipped.length;
  report.pendingCount = report.pending.length;
  report.processedCount = report.included.length + report.skipped.length;
  report.targetCountryCount = countryList.length;
  report.totalCountries = report.included.length + report.skipped.length + report.pending.length + MANUAL_GROUPS.size;
  report.stoppedReason = RUN_STATE.stoppedReason;
  report.fetchStats = {
    networkRequests:RUN_STATE.networkRequests,
    fromCache:RUN_STATE.fromCache,
    cacheWrites:RUN_STATE.cacheWrites,
    requestsByHost:RUN_STATE.requestsByHost,
    rateLimitEvents:RUN_STATE.rateLimitEvents,
    responseLimitHeaders:RUN_STATE.responseLimitHeaders.slice(-20)
  };
  report.skipReasonCounts = countBy(report.skipped, "reason");
}

function countBy(items, key){
  return items.reduce((acc, item)=>{
    const value = item[key] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function shouldWriteGeneratedData(report){
  if(RUN_OPTIONS.reportOnly) return false;
  if(RUN_OPTIONS.country && !RUN_OPTIONS.writePartial) return false;
  if(report.completed) return true;
  return RUN_OPTIONS.writePartial;
}

function makeGeneratedDataBody(outputGroups){
  return [
    "/* Auto-generated by scripts/build-region-groups.js.",
    "   Source policy: Wikidata P150/P300/P131 subdivisions with P41 flags and P36, GeoNames ADM1/PPLA, Commons flag files where verified, or generated regional training flags where no public flag asset is available, matched to GeoBoundaries ADM1. */",
    `var GENERATED_REGION_GAME_GROUPS = ${serialiseJs(outputGroups)};`,
    ""
  ].join("\n");
}

function formatDuration(ms){
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if(hours) return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  if(minutes) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

async function main(){
  if(RUN_OPTIONS.showHelp){
    printHelp();
    return;
  }
  if(RUN_OPTIONS.showLimits){
    printServiceLimits();
    return;
  }
  if(RUN_OPTIONS.cache) fs.mkdirSync(RUN_OPTIONS.cacheDir, {recursive:true});

  const {alpha2Overrides, countries} = loadCountryData();
  const outputGroups = {};
  const report = {
    generatedAt:new Date().toISOString(),
    completed:false,
    included:[],
    skipped:[],
    pending:[],
    options:makeReportOptions(),
    serviceLimits:SERVICE_LIMITS
  };
  let countryList = selectCountries(countries);
  let processedIndex = 0;

  try{
    const alpha2Codes = countryList
      .map(country=>alpha2Overrides[country])
      .filter(Boolean)
      .map(code=>code.toUpperCase());
    const alpha3ByAlpha2 = await fetchCountryCodeRows(alpha2Codes);
    const rows = await fetchWikidataRows(alpha2Codes);
    const wikidataGroups = groupWikidataRows(rows);
    const getIsoRows = makeIsoRowsFetcher();
    const getAdminRows = makeAdminRowsFetcher();
    const getGeoNamesData = makeGeoNamesFetcher();

    for(let index=0;index<countryList.length;index++){
      const countryName = countryList[index];
      processedIndex = index;
      const outcome = await buildCountryGroup(countryName, alpha2Overrides, alpha3ByAlpha2, wikidataGroups, getIsoRows, getAdminRows, getGeoNamesData, outputGroups, report);
      processedIndex = index + 1;
      logProgress(processedIndex, countryList.length, countryName, outcome);
    }
    report.flagFillStats = await fillOutputGroupFlagGaps(outputGroups);
    syncReportFlagCounts(report, outputGroups);
    RUN_STATE.completed = true;
    report.completed = true;
  }catch(error){
    RUN_STATE.stoppedReason = {
      name:error.name || "Error",
      message:error.message || String(error)
    };
    report.pending = countryList.slice(processedIndex).map(country=>({country, reason:"not-processed"}));
    if(!(error instanceof RequestBudgetError || error instanceof RateLimitError)){
      throw error;
    }
    console.warn(`Stopped early: ${RUN_STATE.stoppedReason.message}`);
  }finally{
    finaliseReport(report, countryList);
    fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    if(shouldWriteGeneratedData(report)){
      fs.writeFileSync(OUTPUT_PATH, makeGeneratedDataBody(outputGroups), "utf8");
    }else{
      console.log("Skipped regions-generated-data.js update because this was a report-only or incomplete run.");
    }
  }

  console.log(`Generated ${Object.keys(outputGroups).length} regional groups in ${formatDuration(Date.now() - RUN_STATE.startedAt)}.`);
  for(const entry of report.included){
    console.log(`- ${entry.country}: ${entry.items}`);
  }
  console.log(`Report written to ${path.relative(ROOT, REPORT_PATH)}.`);
}

main().catch(error=>{
  console.error(error);
  process.exit(1);
});
