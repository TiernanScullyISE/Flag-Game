const WORLD_MAP_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const WORLD_MAP_WIDTH = 1440;
const WORLD_MAP_HEIGHT = 760;
const WORLD_MAP_MAIN_BOUNDS = [-180, -58, 180, 84];
const WORLD_MAP_FLAG_FILL_IDLE_TIMEOUT_MS = 1000;
const WORLD_MAP_FLAG_FILL_FALLBACK_MS = 180;
const WORLD_MAP_PANELS = [
  {id:"main", label:"World", x:0, y:0, width:1440, height:492},
  {id:"europe", label:"Europe detail", x:8, y:508, width:270, height:236, bounds:[-15, 34, 45, 72]},
  {id:"caribbean", label:"Caribbean detail", x:286, y:508, width:250, height:236, bounds:[-91, 7, -58, 29]},
  {id:"westafrica", label:"West Africa detail", x:544, y:508, width:290, height:236, bounds:[-20, -6, 18, 20]},
  {id:"gulf", label:"Gulf detail", x:842, y:508, width:190, height:236, bounds:[32, 11, 60, 34]},
  {id:"seasia", label:"SE Asia detail", x:1040, y:508, width:210, height:236, bounds:[94, -12, 132, 24]},
  {id:"oceania", label:"Oceania detail", x:1258, y:508, width:174, height:236, bounds:[112, -49, 205, 16]}
];
const WORLD_MAP_CONTINENT_DETAIL_PANELS = {
  "Asia":[
    {id:"continent-asia-gulf", label:"Gulf detail", x:24, y:506, width:300, height:230, bounds:[32, 11, 60, 34], autoPlace:true}
  ],
  "North America":[
    {id:"continent-north-america-caribbean", label:"Lesser Antilles detail", x:24, y:476, width:360, height:260, bounds:[-63.8, 10.2, -59.2, 18.7], autoPlace:true, preferredCorners:["bottom-left"]}
  ]
};
const WORLD_MAP_CONTINENT_BOUNDS = {
  "Africa":[-20, -36, 55, 38],
  "Asia":[25, -12, 190, 82],
  "Europe":[-25, 34, 60, 72],
  "North America":[-170, 5, -50, 84],
  "South America":[-83, -56, -34, 14],
  "Oceania":[95, -50, 205, 25]
};
const WORLD_MAP_COUNTRY_CONTINENTS = {
  "Russia":["Europe", "Asia"]
};
const WORLD_MAP_SMALL_MARKER_COUNTRIES = new Set([
  "Andorra",
  "Antigua and Barbuda",
  "Bahrain",
  "Barbados",
  "Brunei",
  "Cabo Verde",
  "Comoros",
  "Dominica",
  "Equatorial Guinea",
  "Grenada",
  "Kiribati",
  "Liechtenstein",
  "Luxembourg",
  "Maldives",
  "Malta",
  "Marshall Islands",
  "Mauritius",
  "Micronesia",
  "Monaco",
  "Nauru",
  "Palau",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "São Tomé and Príncipe",
  "Seychelles",
  "Singapore",
  "The Gambia",
  "Tonga",
  "Tuvalu",
  "Vatican City"
]);
const WORLD_MAP_CONTINENT_ORDER = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];
const WORLD_MAP_CONTINENT_SHORT_LABELS = {
  "Africa":"Afr",
  "Asia":"Asia",
  "Europe":"Eur",
  "North America":"N Am",
  "South America":"S Am",
  "Oceania":"Oce"
};

const WORLD_MAP_ID_OVERRIDES = {
  "070":"Bosnia and Herzegovina",
  "132":"Cabo Verde",
  "140":"Central African Republic",
  "178":"Republic of the Congo",
  "180":"Democratic Republic of the Congo",
  "203":"Czechia",
  "214":"Dominican Republic",
  "226":"Equatorial Guinea",
  "336":"Vatican City",
  "384":"Ivory Coast",
  "584":"Marshall Islands",
  "659":"Saint Kitts and Nevis",
  "670":"Saint Vincent and the Grenadines",
  "678":"São Tomé and Príncipe",
  "728":"South Sudan",
  "748":"Eswatini",
  "792":"Türkiye",
  "807":"North Macedonia",
  "840":"United States"
};

const WORLD_MAP_NAME_OVERRIDES = {
  "Antigua and Barb.":"Antigua and Barbuda",
  "Bosnia and Herz.":"Bosnia and Herzegovina",
  "Cape Verde":"Cabo Verde",
  "Central African Rep.":"Central African Republic",
  "Congo":"Republic of the Congo",
  "Czech Republic":"Czechia",
  "Dem. Rep. Congo":"Democratic Republic of the Congo",
  "Dominican Rep.":"Dominican Republic",
  "Eq. Guinea":"Equatorial Guinea",
  "eSwatini":"Eswatini",
  "Gambia":"The Gambia",
  "Ivory Coast":"Ivory Coast",
  "Macedonia":"North Macedonia",
  "Marshall Is.":"Marshall Islands",
  "S. Sudan":"South Sudan",
  "Sao Tome and Principe":"São Tomé and Príncipe",
  "Solomon Is.":"Solomon Islands",
  "St. Kitts and Nevis":"Saint Kitts and Nevis",
  "St. Vin. and Gren.":"Saint Vincent and the Grenadines",
  "Turkey":"Türkiye",
  "United States of America":"United States",
  "Vatican":"Vatican City"
};

const WORLD_MAP_CONTEXT_FEATURES = {
  "304": {name:"Greenland", continent:"North America", ownerCountry:"Denmark"}
};

const WORLD_MAP_CONTEXT_NAME_OVERRIDES = {
  "Greenland": {name:"Greenland", continent:"North America", ownerCountry:"Denmark"}
};

const WORLD_COUNTRY_EXTRA_ALIASES = {
  "Bahamas":["the bahamas"],
  "Cabo Verde":["cape verde"],
  "Czechia":["czech republic"],
  "Eswatini":["swaziland"],
  "Ivory Coast":["cote d ivoire","cote divoire"],
  "Myanmar":["burma"],
  "Palestine":["palestinian territories"],
  "São Tomé and Príncipe":["sao tome","sao","sao tome and principe"],
  "Türkiye":["turkey","turkiye"]
};

const WORLD_COUNTRY_EXTRA_ALIAS_CODES = {
  bs:["the bahamas"],
  cv:["cape verde"],
  cz:["czech republic"],
  sz:["swaziland"],
  ci:["cote d ivoire","cote divoire"],
  mm:["burma"],
  ps:["palestinian territories"],
  st:["sao tome","sao","sao tome and principe"],
  tr:["turkey","turkiye"]
};
