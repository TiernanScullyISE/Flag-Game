/* Regional quiz data for counties, states, and similar subnational sets. */

const IRELAND_COUNTY_ITEMS = [
  {name:"Antrim", capital:"Antrim", flagFile:"Flag of county Antrim.svg", aliases:["County Antrim"]},
  {name:"Armagh", capital:"Armagh", flagFile:"Flag of county Armagh.svg", aliases:["County Armagh"]},
  {name:"Carlow", capital:"Carlow", flagFile:"Flag of county Carlow.svg", aliases:["County Carlow"]},
  {name:"Cavan", capital:"Cavan", flagFile:"Flag of the counties of Cavan and Laois.svg", aliases:["County Cavan"]},
  {name:"Clare", capital:"Ennis", flagFile:"Flag of county Clare.svg", aliases:["County Clare"]},
  {name:"Cork", capital:"Cork", flagFile:"Flag of County Cork.svg", aliases:["County Cork"]},
  {name:"Derry", capital:"Coleraine", flagFile:"Flag of the counties of Derry and Tyrone.svg", aliases:["County Derry", "Londonderry", "County Londonderry"]},
  {name:"Donegal", capital:"Lifford", flagFile:"Flag of the counties of Donegal, Leitrim and Meath.svg", aliases:["County Donegal"]},
  {name:"Down", capital:"Downpatrick", flagFile:"Flag of county Down.svg", aliases:["County Down"]},
  {name:"Dublin", capital:"Dublin", flagFile:"Flag of county Dublin.svg", aliases:["County Dublin"]},
  {name:"Fermanagh", capital:"Enniskillen", flagFile:"Flag of the counties of Fermanagh and Limerick.svg", aliases:["County Fermanagh"]},
  {name:"Galway", capital:"Galway", flagFile:"Flag of the counties of Galway and Westmeath.svg", aliases:["County Galway"]},
  {name:"Kerry", capital:"Tralee", flagFile:"Flag of county Kerry.svg", aliases:["County Kerry"]},
  {name:"Kildare", capital:"Naas", flagFile:"Flag of county Kildare.svg", aliases:["County Kildare"]},
  {name:"Kilkenny", capital:"Kilkenny", flagFile:"Flag of county Kilkenny.svg", aliases:["County Kilkenny"]},
  {name:"Laois", capital:"Portlaoise", flagFile:"Flag of the counties of Cavan and Laois.svg", aliases:["County Laois", "Leix"]},
  {name:"Leitrim", capital:"Carrick-on-Shannon", flagFile:"Flag of the counties of Donegal, Leitrim and Meath.svg", aliases:["County Leitrim", "Carrick on Shannon"]},
  {name:"Limerick", capital:"Limerick", flagFile:"Flag of County Limerick.svg", aliases:["County Limerick"]},
  {name:"Longford", capital:"Longford", flagFile:"County colors of Longford and Wicklow (1x2 ratio).svg", aliases:["County Longford"]},
  {name:"Louth", capital:"Dundalk", flagFile:"Flag of the counties of Cork and Louth.svg", aliases:["County Louth"]},
  {name:"Mayo", capital:"Castlebar", flagFile:"Flag of county Mayo.svg", aliases:["County Mayo"]},
  {name:"Meath", capital:"Navan", flagFile:"Flag of the counties of Donegal, Leitrim and Meath.svg", aliases:["County Meath"]},
  {name:"Monaghan", capital:"Monaghan", flagFile:"Flag of county Monaghan.svg", aliases:["County Monaghan"]},
  {name:"Offaly", capital:"Tullamore", flagFile:"Flag of county Offaly.svg", aliases:["County Offaly"]},
  {name:"Roscommon", capital:"Roscommon", flagFile:"Flag of county Roscommon.svg", aliases:["County Roscommon"]},
  {name:"Sligo", capital:"Sligo", flagFile:"Flag of county Sligo.svg", aliases:["County Sligo"]},
  {name:"Tipperary", capital:"Clonmel", flagFile:"Flag of county Tipperary.svg", aliases:["County Tipperary"], capitalAliases:["Nenagh"]},
  {name:"Tyrone", capital:"Omagh", flagFile:"Flag of the counties of Derry and Tyrone.svg", aliases:["County Tyrone"]},
  {name:"Waterford", capital:"Dungarvan", flagFile:"Flag of County Waterford.svg", aliases:["County Waterford"]},
  {name:"Westmeath", capital:"Mullingar", flagFile:"Flag of the counties of Galway and Westmeath.svg", aliases:["County Westmeath"]},
  {name:"Wexford", capital:"Wexford", flagFile:"Flag of county Wexford.svg", aliases:["County Wexford"]},
  {name:"Wicklow", capital:"Wicklow", flagFile:"County colors of Longford and Wicklow (1x2 ratio).svg", aliases:["County Wicklow"]}
];

const IRELAND_COUNTY_GAEILGE_ITEMS = [
  {name:"Aontroim", capital:"Aontroim", flagFile:"Flag of county Antrim.svg", featureAliases:["Antrim", "County Antrim"]},
  {name:"Ard Mhacha", capital:"Ard Mhacha", flagFile:"Flag of county Armagh.svg", featureAliases:["Armagh", "County Armagh"]},
  {name:"Ceatharlach", capital:"Ceatharlach", flagFile:"Flag of county Carlow.svg", featureAliases:["Carlow", "County Carlow"]},
  {name:"An Cabhán", capital:"An Cabhán", flagFile:"Flag of the counties of Cavan and Laois.svg", featureAliases:["Cavan", "County Cavan"]},
  {name:"An Clár", capital:"Inis", flagFile:"Flag of county Clare.svg", featureAliases:["Clare", "County Clare"]},
  {name:"Corcaigh", capital:"Corcaigh", flagFile:"Flag of County Cork.svg", featureAliases:["Cork", "County Cork"]},
  {name:"Doire", capital:"Cúil Raithin", flagFile:"Flag of the counties of Derry and Tyrone.svg", featureAliases:["Derry", "County Derry", "Londonderry", "County Londonderry"]},
  {name:"Dún na nGall", capital:"Leifear", flagFile:"Flag of the counties of Donegal, Leitrim and Meath.svg", featureAliases:["Donegal", "County Donegal"]},
  {name:"An Dún", capital:"Dún Pádraig", flagFile:"Flag of county Down.svg", featureAliases:["Down", "County Down"]},
  {name:"Baile Átha Cliath", capital:"Baile Átha Cliath", flagFile:"Flag of county Dublin.svg", featureAliases:["Dublin", "County Dublin"]},
  {name:"Fear Manach", capital:"Inis Ceithleann", flagFile:"Flag of the counties of Fermanagh and Limerick.svg", featureAliases:["Fermanagh", "County Fermanagh"]},
  {name:"Gaillimh", capital:"Gaillimh", flagFile:"Flag of the counties of Galway and Westmeath.svg", featureAliases:["Galway", "County Galway"]},
  {name:"Ciarraí", capital:"Trá Lí", flagFile:"Flag of county Kerry.svg", featureAliases:["Kerry", "County Kerry"]},
  {name:"Cill Dara", capital:"An Nás", flagFile:"Flag of county Kildare.svg", featureAliases:["Kildare", "County Kildare"]},
  {name:"Cill Chainnigh", capital:"Cill Chainnigh", flagFile:"Flag of county Kilkenny.svg", featureAliases:["Kilkenny", "County Kilkenny"]},
  {name:"Laois", capital:"Port Laoise", flagFile:"Flag of the counties of Cavan and Laois.svg", featureAliases:["Laois", "County Laois", "Leix"]},
  {name:"Liatroim", capital:"Cora Droma Rúisc", flagFile:"Flag of the counties of Donegal, Leitrim and Meath.svg", featureAliases:["Leitrim", "County Leitrim", "Carrick on Shannon"]},
  {name:"Luimneach", capital:"Luimneach", flagFile:"Flag of County Limerick.svg", featureAliases:["Limerick", "County Limerick"]},
  {name:"An Longfort", capital:"An Longfort", flagFile:"County colors of Longford and Wicklow (1x2 ratio).svg", featureAliases:["Longford", "County Longford"]},
  {name:"Lú", capital:"Dún Dealgan", flagFile:"Flag of the counties of Cork and Louth.svg", featureAliases:["Louth", "County Louth"]},
  {name:"Maigh Eo", capital:"Caisleán an Bharraigh", flagFile:"Flag of county Mayo.svg", featureAliases:["Mayo", "County Mayo"]},
  {name:"An Mhí", capital:"An Uaimh", flagFile:"Flag of the counties of Donegal, Leitrim and Meath.svg", featureAliases:["Meath", "County Meath"]},
  {name:"Muineachán", capital:"Muineachán", flagFile:"Flag of county Monaghan.svg", featureAliases:["Monaghan", "County Monaghan"]},
  {name:"Uíbh Fhailí", capital:"Tulach Mhór", flagFile:"Flag of county Offaly.svg", featureAliases:["Offaly", "County Offaly"]},
  {name:"Ros Comáin", capital:"Ros Comáin", flagFile:"Flag of county Roscommon.svg", featureAliases:["Roscommon", "County Roscommon"]},
  {name:"Sligeach", capital:"Sligeach", flagFile:"Flag of county Sligo.svg", featureAliases:["Sligo", "County Sligo"]},
  {name:"Tiobraid Árann", capital:"Cluain Meala", flagFile:"Flag of county Tipperary.svg", featureAliases:["Tipperary", "County Tipperary"], capitalAliases:["Aonach Urmhumhan"]},
  {name:"Tír Eoghain", capital:"An Ómaigh", flagFile:"Flag of the counties of Derry and Tyrone.svg", featureAliases:["Tyrone", "County Tyrone"]},
  {name:"Port Láirge", capital:"Dún Garbhán", flagFile:"Flag of County Waterford.svg", featureAliases:["Waterford", "County Waterford"]},
  {name:"An Iarmhí", capital:"An Muileann gCearr", flagFile:"Flag of the counties of Galway and Westmeath.svg", featureAliases:["Westmeath", "County Westmeath"]},
  {name:"Loch Garman", capital:"Loch Garman", flagFile:"Flag of county Wexford.svg", featureAliases:["Wexford", "County Wexford"]},
  {name:"Cill Mhantáin", capital:"Cill Mhantáin", flagFile:"County colors of Longford and Wicklow (1x2 ratio).svg", featureAliases:["Wicklow", "County Wicklow"]}
];

const IRELAND_REGION_MAP = {
  source: "geojson",
  url: "https://cdn.jsdelivr.net/gh/evansd/uk-ceremonial-counties@master/source-geojson/ireland-counties.geojson",
  nameFields: ["NAME_TAG", "NAME_EN", "NAME", "ALT_NAME", "name"],
  yDirection: "up",
  featureAliases: {
    "County Derry": "Derry",
    "County Londonderry": "Derry",
    "Londonderry": "Derry"
  }
};

const IRELAND_GAEILGE_REGION_MAP = {
  ...IRELAND_REGION_MAP,
  featureAliases: {
    "County Derry": "Doire",
    "County Londonderry": "Doire",
    "Londonderry": "Doire"
  }
};

const UK_CEREMONIAL_REGION_MAP = {
  source: "geojson",
  url: "https://raw.githubusercontent.com/evansd/uk-ceremonial-counties/master/uk-ceremonial-counties.geojson",
  nameFields: ["county"],
  yDirection: "up"
};

const ENGLAND_COUNTY_ITEMS = [
  {name:"Bedfordshire", capital:"Bedford"},
  {name:"Berkshire", capital:"Reading"},
  {name:"Bristol", capital:"Bristol"},
  {name:"Buckinghamshire", capital:"Aylesbury"},
  {name:"Cambridgeshire", capital:"Cambridge"},
  {name:"Cheshire", capital:"Chester"},
  {name:"Cornwall", capital:"Truro"},
  {name:"Cumbria", capital:"Carlisle"},
  {name:"Derbyshire", capital:"Matlock"},
  {name:"Devon", capital:"Exeter"},
  {name:"Dorset", capital:"Dorchester"},
  {name:"Durham", capital:"Durham", aliases:["County Durham"]},
  {name:"East Riding of Yorkshire", capital:"Beverley"},
  {name:"East Sussex", capital:"Lewes"},
  {name:"Essex", capital:"Chelmsford"},
  {name:"Gloucestershire", capital:"Gloucester"},
  {name:"Greater London", capital:"London"},
  {name:"Greater Manchester", capital:"Manchester"},
  {name:"Hampshire", capital:"Winchester"},
  {name:"Herefordshire", capital:"Hereford"},
  {name:"Hertfordshire", capital:"Hertford"},
  {name:"Isle of Wight", capital:"Newport"},
  {name:"Kent", capital:"Maidstone"},
  {name:"Lancashire", capital:"Preston"},
  {name:"Leicestershire", capital:"Leicester"},
  {name:"Lincolnshire", capital:"Lincoln"},
  {name:"Merseyside", capital:"Liverpool"},
  {name:"Norfolk", capital:"Norwich"},
  {name:"North Yorkshire", capital:"Northallerton"},
  {name:"Northamptonshire", capital:"Northampton"},
  {name:"Northumberland", capital:"Morpeth"},
  {name:"Nottinghamshire", capital:"Nottingham"},
  {name:"Oxfordshire", capital:"Oxford"},
  {name:"Rutland", capital:"Oakham"},
  {name:"Shropshire", capital:"Shrewsbury"},
  {name:"Somerset", capital:"Taunton"},
  {name:"South Yorkshire", capital:"Barnsley"},
  {name:"Staffordshire", capital:"Stafford"},
  {name:"Suffolk", capital:"Ipswich"},
  {name:"Surrey", capital:"Guildford"},
  {name:"Tyne and Wear", capital:"Newcastle upon Tyne"},
  {name:"Warwickshire", capital:"Warwick"},
  {name:"West Midlands", capital:"Birmingham"},
  {name:"West Sussex", capital:"Chichester"},
  {name:"West Yorkshire", capital:"Wakefield"},
  {name:"Wiltshire", capital:"Trowbridge"},
  {name:"Worcestershire", capital:"Worcester"}
];

const SCOTLAND_REGION_ITEMS = [
  {name:"Central", capital:"Stirling"},
  {name:"Dumfries and Galloway", capital:"Dumfries"},
  {name:"Eilean Siar", capital:"Stornoway", aliases:["Western Isles", "Na h-Eileanan Siar"]},
  {name:"Fife", capital:"Glenrothes"},
  {name:"Grampian", capital:"Aberdeen"},
  {name:"Highland", capital:"Inverness"},
  {name:"Lothian", capital:"Edinburgh"},
  {name:"Orkney Islands", capital:"Kirkwall"},
  {name:"Scottish Borders", capital:"Newtown St Boswells"},
  {name:"Shetland Islands", capital:"Lerwick"},
  {name:"Strathclyde", capital:"Glasgow"},
  {name:"Tayside", capital:"Dundee"}
];

const WALES_PRESERVED_COUNTY_ITEMS = [
  {name:"Clwyd", capital:"Mold"},
  {name:"Dyfed", capital:"Carmarthen"},
  {name:"Gwent", capital:"Newport"},
  {name:"Gwynedd", capital:"Caernarfon"},
  {name:"Mid Glamorgan", capital:"Merthyr Tydfil"},
  {name:"Powys", capital:"Llandrindod Wells"},
  {name:"South Glamorgan", capital:"Cardiff"},
  {name:"West Glamorgan", capital:"Swansea"}
];

const REGION_GAME_GROUPS = {
  "Ireland": {
    key: "Ireland",
    label: "Ireland",
    itemLabel: "county",
    itemPluralLabel: "counties",
    capitalLabel: "county town",
    capitalPluralLabel: "county towns",
    listMapLabel: "County Map",
    mapLabel: "Ireland counties",
    flagLabel: "county flags",
    aliases: ["ireland", "irish counties", "32 counties"],
    map: IRELAND_REGION_MAP,
    items: IRELAND_COUNTY_ITEMS
  },

  "Ireland as Gaeilge": {
    key: "Ireland as Gaeilge",
    label: "Ireland as Gaeilge",
    itemLabel: "county",
    itemPluralLabel: "counties",
    capitalLabel: "county town",
    capitalPluralLabel: "county towns",
    listMapLabel: "County Map",
    mapLabel: "Ireland counties as Gaeilge",
    flagLabel: "county flags",
    aliases: ["ireland as gaeilge", "irish counties as gaeilge", "gaelige", "gaeilge", "eire", "éire"],
    answerLanguage: "ga-IE",
    strictDiacritics: true,
    map: IRELAND_GAEILGE_REGION_MAP,
    items: IRELAND_COUNTY_GAEILGE_ITEMS
  },

  "England": {
    key: "England",
    label: "England",
    itemLabel: "county",
    itemPluralLabel: "counties",
    capitalLabel: "county town",
    capitalPluralLabel: "county towns",
    listMapLabel: "County Map",
    mapLabel: "England counties",
    flagLabel: "county flags",
    aliases: ["english counties", "england counties", "ceremonial counties of england"],
    flagFileTemplate: "Flag of {name}.svg",
    map: UK_CEREMONIAL_REGION_MAP,
    items: ENGLAND_COUNTY_ITEMS
  },

  "Scotland": {
    key: "Scotland",
    label: "Scotland",
    itemLabel: "region",
    itemPluralLabel: "regions",
    capitalLabel: "regional centre",
    capitalPluralLabel: "regional centres",
    listMapLabel: "Region Map",
    mapLabel: "Scotland regions",
    flagLabel: "regional flags",
    aliases: ["scottish regions", "scotland regions"],
    flagFileTemplate: "Flag of {name}.svg",
    map: UK_CEREMONIAL_REGION_MAP,
    items: SCOTLAND_REGION_ITEMS
  },

  "Wales": {
    key: "Wales",
    label: "Wales",
    itemLabel: "preserved county",
    itemPluralLabel: "preserved counties",
    capitalLabel: "main town",
    capitalPluralLabel: "main towns",
    listMapLabel: "Preserved County Map",
    mapLabel: "Wales preserved counties",
    flagLabel: "county flags",
    aliases: ["welsh counties", "wales counties", "preserved counties of wales"],
    flagFileTemplate: "Flag of {name}.svg",
    map: UK_CEREMONIAL_REGION_MAP,
    items: WALES_PRESERVED_COUNTY_ITEMS
  },

  "United States": {
    key: "United States",
    label: "United States",
    itemLabel: "state",
    itemPluralLabel: "states",
    capitalLabel: "state capital",
    capitalPluralLabel: "state capitals",
    listMapLabel: "State Map",
    mapLabel: "United States states",
    flagLabel: "state flags",
    aliases: ["usa", "us", "america", "united states of america", "50 states"],
    map: {
      source: "topojson",
      url: "https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json",
      objectName: "states",
      nameFields: ["name"],
      yDirection: "down"
    },
    items: [
      {name:"Alabama", capital:"Montgomery"},
      {name:"Alaska", capital:"Juneau"},
      {name:"Arizona", capital:"Phoenix"},
      {name:"Arkansas", capital:"Little Rock"},
      {name:"California", capital:"Sacramento"},
      {name:"Colorado", capital:"Denver"},
      {name:"Connecticut", capital:"Hartford"},
      {name:"Delaware", capital:"Dover"},
      {name:"Florida", capital:"Tallahassee"},
      {name:"Georgia", capital:"Atlanta", flagFile:"Flag of Georgia (U.S. state).svg"},
      {name:"Hawaii", capital:"Honolulu"},
      {name:"Idaho", capital:"Boise"},
      {name:"Illinois", capital:"Springfield"},
      {name:"Indiana", capital:"Indianapolis"},
      {name:"Iowa", capital:"Des Moines"},
      {name:"Kansas", capital:"Topeka"},
      {name:"Kentucky", capital:"Frankfort"},
      {name:"Louisiana", capital:"Baton Rouge"},
      {name:"Maine", capital:"Augusta"},
      {name:"Maryland", capital:"Annapolis"},
      {name:"Massachusetts", capital:"Boston"},
      {name:"Michigan", capital:"Lansing"},
      {name:"Minnesota", capital:"Saint Paul", capitalAliases:["St Paul", "St. Paul"]},
      {name:"Mississippi", capital:"Jackson"},
      {name:"Missouri", capital:"Jefferson City"},
      {name:"Montana", capital:"Helena"},
      {name:"Nebraska", capital:"Lincoln"},
      {name:"Nevada", capital:"Carson City"},
      {name:"New Hampshire", capital:"Concord"},
      {name:"New Jersey", capital:"Trenton"},
      {name:"New Mexico", capital:"Santa Fe"},
      {name:"New York", capital:"Albany"},
      {name:"North Carolina", capital:"Raleigh"},
      {name:"North Dakota", capital:"Bismarck"},
      {name:"Ohio", capital:"Columbus"},
      {name:"Oklahoma", capital:"Oklahoma City"},
      {name:"Oregon", capital:"Salem"},
      {name:"Pennsylvania", capital:"Harrisburg"},
      {name:"Rhode Island", capital:"Providence"},
      {name:"South Carolina", capital:"Columbia"},
      {name:"South Dakota", capital:"Pierre"},
      {name:"Tennessee", capital:"Nashville"},
      {name:"Texas", capital:"Austin"},
      {name:"Utah", capital:"Salt Lake City"},
      {name:"Vermont", capital:"Montpelier"},
      {name:"Virginia", capital:"Richmond"},
      {name:"Washington", capital:"Olympia"},
      {name:"West Virginia", capital:"Charleston"},
      {name:"Wisconsin", capital:"Madison"},
      {name:"Wyoming", capital:"Cheyenne"}
    ]
  }
};

if(typeof GENERATED_REGION_GAME_GROUPS !== "undefined" && GENERATED_REGION_GAME_GROUPS){
  Object.assign(REGION_GAME_GROUPS, GENERATED_REGION_GAME_GROUPS);
}

const REGION_GAME_GROUP_ORDER = Object.keys(REGION_GAME_GROUPS);
const DEFAULT_REGION_GAME_GROUP = REGION_GAME_GROUP_ORDER[0];
