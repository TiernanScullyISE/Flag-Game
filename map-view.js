(function(){
  const FOCUS_MAP_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-10m.json";
  const CAPITAL_COORDINATES_URL = "https://cdn.jsdelivr.net/npm/capitals-coordinates@1.2.0/index.js";
  const FOCUS_MAP_WIDTH = 1440;
  const FOCUS_MAP_HEIGHT = 760;
  const FOCUS_MAP_COUNTRY_ZOOM_THRESHOLD_RATIO = 0.10;
  const FOCUS_MAP_COUNTRY_ZOOM_PADDING_RATIO = 0.42;
  const FOCUS_MAP_COUNTRY_ZOOM_MIN_LON_SPAN = 2.2;
  const FOCUS_MAP_COUNTRY_ZOOM_MIN_LAT_SPAN = 1.6;
  const FOCUS_MAP_DETAIL_PANEL_WIDTH = 440;
  const FOCUS_MAP_DETAIL_PANEL_HEIGHT = 286;
  const FOCUS_MAP_DETAIL_PANEL_MARGIN = 26;
  const FOCUS_MAP_MAIN_BOUNDS = [-180, -58, 180, 84];
  const FOCUS_MAP_CONTINENT_BOUNDS = {
    "Africa":[-27, -36, 58, 38],
    "Asia":[25, -12, 190, 82],
    "Europe":[-25, 34, 45, 72],
    "North America":[-170, 5, -50, 84],
    "South America":[-83, -56, -34, 14],
    "Oceania":[95, -50, 205, 25]
  };
  const FOCUS_MAP_COUNTRY_CONTINENTS = {
    "Russia":["Europe", "Asia"]
  };
  const FOCUS_MAP_ID_OVERRIDES = {
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
    "678":"S\u00e3o Tom\u00e9 and Pr\u00edncipe",
    "728":"South Sudan",
    "748":"Eswatini",
    "792":"T\u00fcrkiye",
    "807":"North Macedonia",
    "840":"United States"
  };
  const FOCUS_MAP_NAME_OVERRIDES = {
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
    "Macedonia":"North Macedonia",
    "Marshall Is.":"Marshall Islands",
    "S. Sudan":"South Sudan",
    "Sao Tome and Principe":"S\u00e3o Tom\u00e9 and Pr\u00edncipe",
    "Solomon Is.":"Solomon Islands",
    "St. Kitts and Nevis":"Saint Kitts and Nevis",
    "St. Vin. and Gren.":"Saint Vincent and the Grenadines",
    "Turkey":"T\u00fcrkiye",
    "United States of America":"United States",
    "Vatican":"Vatican City"
  };
  const FOCUS_MAP_CONTEXT_FEATURES = {
    "304": {name:"Greenland", continent:"North America", ownerCountry:"Denmark"}
  };
  const FOCUS_MAP_CONTEXT_NAME_OVERRIDES = {
    "Greenland": {name:"Greenland", continent:"North America", ownerCountry:"Denmark"}
  };
  const FOCUS_MAP_SMALL_MARKER_COUNTRIES = new Set([
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
    "S\u00e3o Tom\u00e9 and Pr\u00edncipe",
    "Seychelles",
    "Singapore",
    "The Gambia",
    "Tonga",
    "Tuvalu",
    "Vatican City"
  ]);

  const FOCUS_MAP_COUNTRY_ZOOM_OVERRIDES = {
    "Bahamas": {center:[-76.17, 23.92], lonSpan:7.4, latSpan:6.4, force:true},
    "Fiji": {center:[178.44, -18.14], lonSpan:6.2, latSpan:4.6, force:true},
    "Kiribati": {center:[172.98, 1.45], lonSpan:2.2, latSpan:1.6, force:true},
    "Maldives": {center:[73.51, 4.17], lonSpan:1.35, latSpan:1.15, force:true},
    "Marshall Islands": {center:[171.38, 7.09], lonSpan:1.3, latSpan:1, force:true},
    "Micronesia": {center:[158.16, 6.92], lonSpan:1.05, latSpan:.85, force:true},
    "Monaco": {center:[7.4246, 43.7384], lonSpan:.09, latSpan:.065, force:true},
    "Nauru": {center:[166.9209, -0.5477], lonSpan:.24, latSpan:.18, force:true},
    "Palau": {center:[134.624, 7.5], lonSpan:.85, latSpan:.65, force:true},
    "Mauritius": {center:[57.50, -20.16], lonSpan:.9, latSpan:.72, force:true},
    "Philippines": {center:[122.3, 13.0], lonSpan:18.2, latSpan:20, force:true},
    "Russia": {center:[100, 61], lonSpan:190, latSpan:52, force:true},
    "Samoa": {center:[-171.77, -13.83], lonSpan:2.2, latSpan:1.6, force:true},
    "San Marino": {center:[12.45, 43.94], lonSpan:.24, latSpan:.18, force:true},
    "S\u00e3o Tom\u00e9 and Pr\u00edncipe": {center:[6.96, .86], lonSpan:1.55, latSpan:2.05, force:true},
    "Seychelles": {center:[55.45, -4.62], lonSpan:1.05, latSpan:.82, force:true},
    "Tonga": {center:[-175.2, -21.13], lonSpan:1.65, latSpan:1.2, force:true},
    "Tuvalu": {center:[179.1942, -8.5243], lonSpan:.34, latSpan:.28, force:true},
    "Vatican City": {center:[12.4534, 41.9029], lonSpan:.035, latSpan:.026, force:true}
  };

  const FOCUS_MAP_SOLID_TARGET_FILLS = {
    "Nepal": {fill:"#dc143c", stroke:"#003893", strokeWidth:2.4}
  };

  const FOCUS_MAP_FEATURE_REPLACEMENTS = {
    "Monaco": {
      type:"Feature",
      id:"replacement-monaco",
      properties:{name:"Monaco", quizCountry:"Monaco"},
      geometry:{
        type:"Polygon",
        coordinates:[[
          [7.4080, 43.7270],
          [7.4155, 43.7255],
          [7.4265, 43.7305],
          [7.4395, 43.7378],
          [7.4385, 43.7438],
          [7.4305, 43.7508],
          [7.4200, 43.7490],
          [7.4110, 43.7420],
          [7.4070, 43.7340],
          [7.4080, 43.7270]
        ]]
      }
    },
    "Vatican City": {
      type:"Feature",
      id:"replacement-vatican-city",
      properties:{name:"Vatican City", quizCountry:"Vatican City"},
      geometry:{
        type:"Polygon",
        coordinates:[[
          [12.4455, 41.9004],
          [12.4567, 41.9000],
          [12.4587, 41.9044],
          [12.4526, 41.9073],
          [12.4448, 41.9046],
          [12.4455, 41.9004]
        ]]
      }
    }
  };

  const CAPITAL_COORDINATE_OVERRIDES = {
    "Grenada":[-61.7487, 12.06],
    "Israel":[35.2137, 31.7683],
    "Kiribati":[173.0133, 1.3383],
    "Kosovo":[21.1655, 42.6629],
    "Marshall Islands":[171.374, 7.099],
    "Palestine":[35.2034, 31.9038],
    "Saint Kitts and Nevis":[-62.73, 17.2907],
    "Taiwan":[121.5654, 25.0330],
    "South Sudan":[31.5825, 4.8594],
    "South Africa":[18.4241, -33.9249],
    "Monaco":[7.4246, 43.7384],
    "Nauru":[166.9209, -0.5477],
    "North Macedonia":[21.4314, 41.9981],
    "S\u00e3o Tom\u00e9 and Pr\u00edncipe":[6.727, .337],
    "Seychelles":[55.454, -4.623],
    "The Gambia":[-16.585, 13.4467],
    "Tonga":[-175.2175, -21.135],
    "Tuvalu":[179.2022, -8.5256],
    "Vatican City":[12.4534, 41.9029]
  };

  const CAPITAL_COORDINATE_COUNTRY_ALIASES = {
    "Cape Verde":"Cabo Verde",
    "Czech Republic":"Czechia",
    "East Timor":"Timor-Leste",
    "Gambia":"The Gambia",
    "Palestinian Territory":"Palestine",
    "Sao Tome and Principe":"S\u00e3o Tom\u00e9 and Pr\u00edncipe",
    "Swaziland":"Eswatini",
    "Turkey":"T\u00fcrkiye",
    "Vatican":"Vatican City"
  };

  let featureLoadPromise = null;
  let featureCache = null;
  let countryIndexCache = null;
  let alpha2CountryCache = null;
  let capitalLoadPromise = null;
  let capitalCoordinateCache = null;
  let shellIdCounter = 0;
  const renderTokens = new WeakMap();

  async function render(target, country, options={}){
    if(!target) return;
    const token = (renderTokens.get(target) || 0) + 1;
    renderTokens.set(target, token);
    target.innerHTML = "";
    target.appendChild(createStatus("Loading map..."));

    try{
      const node = await create(country, options);
      if(renderTokens.get(target) !== token) return;
      target.replaceChildren(node);
    }catch(error){
      if(renderTokens.get(target) !== token) return;
      const message = error && error.message ? error.message : "Map could not load.";
      target.replaceChildren(createStatus(message, {
        retryLabel:"Try again",
        onRetry:()=>render(target, country, options)
      }));
    }
  }

  function cancel(target){
    if(!target) return;
    renderTokens.set(target, (renderTokens.get(target) || 0) + 1);
  }

  async function create(country, options={}){
    if(!country) return createStatus("No country selected.");
    const features = await loadFeatures();
    const continent = options.continent || getPrimaryContinent(country);
    const showCapital = options.showCapital === true;
    const targetFeature = features.find(feature=>feature.properties.quizCountry === country) || null;
    const capitalPoint = showCapital
      ? await getCapitalCoordinate(country, targetFeature, continent)
      : null;
    return createShell(features, country, {
      continent,
      showCountryName: options.showCountryName !== false,
      showCapital,
      showCapitalLabel: options.showCapitalLabel !== false,
      showCapitalUnderName: options.showCapitalUnderName === true,
      capitalPoint,
      capitalEstimated: !!(capitalPoint && capitalPoint.estimated),
      capitalName: getCapitalName(country),
      label: options.label || continent
    });
  }

  async function loadFeatures(){
    if(featureCache) return featureCache;
    if(featureLoadPromise) return featureLoadPromise;
    featureLoadPromise = (async ()=>{
      if(!window.topojson || !window.topojson.feature){
        throw new Error("Map library did not load. Check your connection and try again.");
      }
      const response = await fetch(FOCUS_MAP_TOPOJSON_URL);
      if(!response.ok) throw new Error(`Country outline map failed to load (${response.status}).`);
      const topology = await response.json();
      const collection = window.topojson.feature(topology, topology.objects.countries);
      featureCache = collection.features
        .map(feature=>{
          const contextFeature = getContextFeature(feature);
          return {
            ...feature,
            properties: {
              ...(feature.properties || {}),
              quizCountry: matchCountry(feature),
              contextName: contextFeature ? contextFeature.name : null,
              contextContinent: contextFeature ? contextFeature.continent : null,
              contextOwnerCountry: contextFeature ? contextFeature.ownerCountry : null
            }
          };
        })
        .filter(feature=>!!feature.properties.quizCountry || !!feature.properties.contextName);
      normaliseIrelandUnitedKingdomFeatures(featureCache);
      applyFeatureReplacements(featureCache);
      return featureCache;
    })().catch(error=>{
      featureLoadPromise = null;
      throw error;
    });
    return featureLoadPromise;
  }

  function createShell(features, targetCountry, options){
    const shellId = `country-focus-map-${++shellIdCounter}`;
    const continent = options.continent || getPrimaryContinent(targetCountry);
    const basePanel = {
      id:`focus-${normalise(continent).replace(/\s+/g, "-") || "continent"}`,
      label: options.label || continent,
      x:0,
      y:0,
      width:FOCUS_MAP_WIDTH,
      height:FOCUS_MAP_HEIGHT,
      bounds:FOCUS_MAP_CONTINENT_BOUNDS[continent] || FOCUS_MAP_MAIN_BOUNDS,
      full:true
    };
    const targetFeature = features.find(feature=>feature.properties.quizCountry === targetCountry) || null;
    const useCountryZoom = shouldUseCountryZoom(targetCountry, targetFeature, basePanel, options);
    const detailPanel = useCountryZoom
      ? makeCountryZoomPanel(basePanel, targetFeature, targetCountry, continent, options)
      : null;
    const visibleCountries = new Set(getCountriesForContinent(continent));
    visibleCountries.add(targetCountry);
    const renderFeatures = features.filter(feature=>{
      const country = feature.properties.quizCountry;
      return visibleCountries.has(country) || feature.properties.contextContinent === continent;
    });

    const shell = document.createElement("div");
    shell.className = [
      "country-focus-map",
      options.showCapital ? "has-capital" : "has-country",
      detailPanel ? "has-detail-inset" : "is-continent-view"
    ].join(" ");
    const svg = svgNode("svg", {
      viewBox:`0 0 ${FOCUS_MAP_WIDTH} ${FOCUS_MAP_HEIGHT}`,
      role:"img",
      "aria-label": options.showCapital
        ? `${getCapitalName(targetCountry)} marked on the map`
        : `${targetCountry} highlighted on the map`
    });
    const defs = svgNode("defs");
    ensureFlagPattern(defs, targetCountry, shellId);
    svg.appendChild(defs);
    svg.appendChild(svgNode("rect", {
      class:"country-focus-map-ocean",
      x:0,
      y:0,
      width:FOCUS_MAP_WIDTH,
      height:FOCUS_MAP_HEIGHT,
      rx:18
    }));
    const panelOptions = {...options, hasDetailInset: !!detailPanel};
    drawPanel(svg, renderFeatures, basePanel, targetCountry, panelOptions, shellId);
    if(detailPanel){
      drawPanel(svg, renderFeatures, detailPanel, targetCountry, panelOptions, shellId);
    }
    shell.appendChild(svg);
    if(options.showCountryName){
      shell.appendChild(createMapCaption(targetCountry, options));
    }
    return shell;
  }

  function createMapCaption(country, options){
    const caption = document.createElement("div");
    caption.className = "country-focus-map-caption";
    const countryLabel = document.createElement("div");
    countryLabel.className = "country-focus-map-country-name";
    countryLabel.textContent = country;
    caption.appendChild(countryLabel);
    if(options.showCapitalUnderName && options.showCapital){
      const capital = document.createElement("div");
      capital.className = "country-focus-map-capital-name";
      capital.textContent = getCapitalName(country);
      caption.appendChild(capital);
    }
    return caption;
  }

  function shouldUseCountryZoom(targetCountry, targetFeature, panel, options){
    if(!targetFeature) return false;
    if(options.focusMode === "continent") return false;
    if(options.focusMode === "country") return true;
    if(FOCUS_MAP_COUNTRY_ZOOM_OVERRIDES[targetCountry]?.force) return true;
    const bounds = getProjectedBounds(targetFeature, panel);
    if(!bounds) return false;
    const widthRatio = bounds.width / panel.width;
    const heightRatio = bounds.height / panel.height;
    return Math.max(widthRatio, heightRatio) < FOCUS_MAP_COUNTRY_ZOOM_THRESHOLD_RATIO;
  }

  function makeCountryZoomPanel(basePanel, targetFeature, targetCountry, continent, options){
    const position = getDetailPanelPosition(basePanel, targetFeature);
    return {
      ...basePanel,
      id:`country-${normalise(targetCountry).replace(/\s+/g, "-") || "selected"}`,
      label: options.countryZoomLabel || `${targetCountry} detail`,
      x:position.x,
      y:position.y,
      width:FOCUS_MAP_DETAIL_PANEL_WIDTH,
      height:FOCUS_MAP_DETAIL_PANEL_HEIGHT,
      bounds: getCountryZoomBounds(targetFeature, basePanel.bounds, targetCountry, options) || basePanel.bounds,
      countryZoom:true
    };
  }

  function getDetailPanelPosition(basePanel, targetFeature){
    const margin = FOCUS_MAP_DETAIL_PANEL_MARGIN;
    const width = FOCUS_MAP_DETAIL_PANEL_WIDTH;
    const height = FOCUS_MAP_DETAIL_PANEL_HEIGHT;
    const candidates = [
      {x:basePanel.width - width - margin, y:basePanel.height - height - margin},
      {x:margin, y:basePanel.height - height - margin},
      {x:basePanel.width - width - margin, y:margin},
      {x:margin, y:margin}
    ];
    const targetBounds = targetFeature ? getProjectedBounds(targetFeature, basePanel) : null;
    if(!targetBounds) return candidates[0];

    const targetRect = getPaddedTargetRect(targetBounds);
    const clear = candidates.filter(candidate=>!rectsIntersect(targetRect, {
      left:candidate.x,
      top:candidate.y,
      right:candidate.x + width,
      bottom:candidate.y + height
    }));
    if(clear.length) return clear[0];

    const targetX = targetBounds.x;
    const targetY = targetBounds.y;
    return candidates
      .map(candidate=>({
        ...candidate,
        distance: Math.hypot(candidate.x + width / 2 - targetX, candidate.y + height / 2 - targetY)
      }))
      .sort((left, right)=>right.distance - left.distance)[0];
  }

  function getPaddedTargetRect(bounds){
    const minHalfSize = 34;
    const halfWidth = Math.max(bounds.width / 2, minHalfSize);
    const halfHeight = Math.max(bounds.height / 2, minHalfSize);
    return {
      left:bounds.x - halfWidth,
      top:bounds.y - halfHeight,
      right:bounds.x + halfWidth,
      bottom:bounds.y + halfHeight
    };
  }

  function rectsIntersect(left, right){
    return left.left < right.right
      && left.right > right.left
      && left.top < right.bottom
      && left.bottom > right.top;
  }

  function drawPanel(svg, features, panel, targetCountry, options, shellId){
    const panelGroup = svgNode("g", {
      class:"country-focus-map-panel",
      transform:`translate(${panel.x} ${panel.y})`
    });
    const clipId = `${shellId}-clip-${panel.id}`;
    const panelDefs = svgNode("defs");
    const clip = svgNode("clipPath", {id:clipId});
    clip.appendChild(svgNode("rect", {
      x:0,
      y:0,
      width:panel.width,
      height:panel.height,
      rx:18
    }));
    panelDefs.appendChild(clip);
    panelGroup.appendChild(panelDefs);
    panelGroup.appendChild(svgNode("rect", {
      class:"country-focus-map-panel-bg",
      x:0,
      y:0,
      width:panel.width,
      height:panel.height,
      rx:18
    }));

    const mapLayer = svgNode("g", {
      class:"country-focus-map-layer",
      "clip-path":`url(#${clipId})`
    });
    panelGroup.appendChild(mapLayer);
    const panelFeatures = getPanelFeatures(features, panel);

    for(const feature of panelFeatures){
      const country = feature.properties.quizCountry;
      if(country === "Ireland"){
        drawUnifiedIrelandCountry(mapLayer, feature, panel, targetCountry, shellId);
        continue;
      }
      const pathDataList = makePathList(feature, panel);
      if(!pathDataList.length) continue;
      for(const pathData of pathDataList){
        const path = svgNode("path", {
          class:getCountryClass(country, targetCountry),
          d:pathData
        });
        if(country){
          path.dataset.country = country;
          if(country === targetCountry){
            applyTargetCountryFill(path, feature, country, shellId);
          }
        }
        mapLayer.appendChild(path);
      }
    }

    if(!(options.showCapital && panel.countryZoom)){
      drawTargetMarker(panelGroup, panelFeatures, panel, targetCountry);
    }

    if(options.showCapital && options.capitalPoint){
      const showCapitalLabel = options.showCapitalLabel !== false
        && (!options.hasDetailInset || panel.countryZoom);
      drawCapitalMarker(
        panelGroup,
        panel,
        targetCountry,
        options.capitalPoint,
        options.capitalName,
        options.capitalEstimated,
        showCapitalLabel
      );
    }

    const label = svgNode("text", {
      class:"country-focus-map-panel-label",
      x:18,
      y:31
    });
    label.textContent = panel.label;
    panelGroup.appendChild(label);
    svg.appendChild(panelGroup);
  }

  function drawUnifiedIrelandCountry(mapLayer, feature, panel, targetCountry, shellId){
    const pathData = makePathList(feature, panel).join("");
    if(!pathData) return;
    const fillPath = svgNode("path", {
      class:getCountryClass("Ireland", targetCountry),
      d:pathData
    });
    fillPath.dataset.country = "Ireland";
    fillPath.style.stroke = "none";
    if(targetCountry === "Ireland"){
      applyTargetCountryFill(fillPath, feature, "Ireland", shellId);
    }
    mapLayer.appendChild(fillPath);

    const outlinePath = makeExteriorOutlinePath(feature, panel);
    if(!outlinePath) return;
    const outline = svgNode("path", {
      class:`${getCountryClass("Ireland", targetCountry)} is-ireland-outline`,
      d:outlinePath
    });
    outline.dataset.country = "Ireland";
    if(targetCountry !== "Ireland") outline.classList.add("is-muted-outline");
    mapLayer.appendChild(outline);
  }

  function drawTargetMarker(panelGroup, panelFeatures, panel, targetCountry){
    const targetFeature = panelFeatures.find(feature=>feature.properties.quizCountry === targetCountry);
    if(!targetFeature) return;
    const bounds = getProjectedBounds(targetFeature, panel);
    if(!bounds || !shouldDrawTargetMarker(targetCountry, panel, bounds)) return;
    const marker = svgNode("g", {class:"country-focus-map-target-marker"});
    marker.appendChild(svgNode("circle", {
      class:"country-focus-map-target-halo",
      cx:formatNumber(bounds.x),
      cy:formatNumber(bounds.y),
      r:formatNumber(panel.width > 900 ? 10 : 7)
    }));
    marker.appendChild(svgNode("circle", {
      class:"country-focus-map-target-ring",
      cx:formatNumber(bounds.x),
      cy:formatNumber(bounds.y),
      r:formatNumber(panel.width > 900 ? 6.2 : 4.6)
    }));
    panelGroup.appendChild(marker);
  }

  function drawCapitalMarker(panelGroup, panel, country, capitalPoint, capitalName, estimated=false, showLabel=true){
    const projected = projectPoint(capitalPoint, panel);
    if(!projected) return;
    const [x, y] = projected;
    const marker = svgNode("g", {
      class:`country-focus-map-capital-marker ${estimated ? "is-estimated" : ""}`.trim()
    });
    marker.appendChild(svgNode("circle", {
      class:"country-focus-map-capital-pulse",
      cx:formatNumber(x),
      cy:formatNumber(y),
      r:16
    }));
    marker.appendChild(svgNode("circle", {
      class:"country-focus-map-capital-dot",
      cx:formatNumber(x),
      cy:formatNumber(y),
      r:7.4
    }));
    if(!showLabel){
      panelGroup.appendChild(marker);
      return;
    }

    const label = capitalName || getCapitalName(country);
    const textWidth = Math.max(74, Math.min(230, label.length * 9.6 + 24));
    const textHeight = 34;
    const showLeft = x + textWidth + 30 > panel.width;
    const labelX = clamp(showLeft ? x - textWidth - 18 : x + 18, 12, panel.width - textWidth - 12);
    const labelY = clamp(y - textHeight - 14, 42, panel.height - textHeight - 14);
    const anchorX = showLeft ? labelX + textWidth : labelX;
    const anchorY = labelY + textHeight / 2;

    marker.insertBefore(svgNode("line", {
      class:"country-focus-map-capital-line",
      x1:formatNumber(x),
      y1:formatNumber(y),
      x2:formatNumber(anchorX),
      y2:formatNumber(anchorY)
    }), marker.firstChild);
    marker.appendChild(svgNode("rect", {
      class:"country-focus-map-capital-label-bg",
      x:formatNumber(labelX),
      y:formatNumber(labelY),
      width:formatNumber(textWidth),
      height:textHeight,
      rx:10
    }));
    const text = svgNode("text", {
      class:"country-focus-map-capital-label",
      x:formatNumber(labelX + textWidth / 2),
      y:formatNumber(labelY + 22),
      "text-anchor":"middle"
    });
    text.textContent = label;
    marker.appendChild(text);
    panelGroup.appendChild(marker);
  }

  function createStatus(text, options={}){
    const status = document.createElement("div");
    status.className = "country-focus-map-status";
    const message = document.createElement("span");
    message.textContent = text;
    status.appendChild(message);
    if(typeof options.onRetry === "function"){
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn primary map-retry-btn";
      button.dataset.loadRetry = "true";
      button.textContent = options.retryLabel || "Retry";
      button.addEventListener("click", options.onRetry);
      status.appendChild(button);
    }
    return status;
  }

  function matchCountry(feature){
    const id = String(feature.id || "").padStart(3, "0");
    if(Object.prototype.hasOwnProperty.call(FOCUS_MAP_ID_OVERRIDES, id)){
      const country = resolveCountry(FOCUS_MAP_ID_OVERRIDES[id]);
      if(country) return country;
    }
    const rawName = cleanName(feature.properties && feature.properties.name);
    if(Object.prototype.hasOwnProperty.call(FOCUS_MAP_NAME_OVERRIDES, rawName)){
      const country = resolveCountry(FOCUS_MAP_NAME_OVERRIDES[rawName]);
      if(country) return country;
    }
    return getCountryIndex().get(normalise(rawName)) || null;
  }

  function getContextFeature(feature){
    const id = String(feature.id || "").padStart(3, "0");
    if(Object.prototype.hasOwnProperty.call(FOCUS_MAP_CONTEXT_FEATURES, id)){
      return FOCUS_MAP_CONTEXT_FEATURES[id];
    }
    const rawName = cleanName(feature.properties && feature.properties.name);
    return FOCUS_MAP_CONTEXT_NAME_OVERRIDES[rawName] || null;
  }

  function applyFeatureReplacements(features){
    for(const [country, replacement] of Object.entries(FOCUS_MAP_FEATURE_REPLACEMENTS)){
      for(let i=features.length - 1;i>=0;i--){
        if(features[i].properties && features[i].properties.quizCountry === country){
          features.splice(i, 1);
        }
      }
      features.push(replacement);
    }
  }

  function normaliseIrelandUnitedKingdomFeatures(features){
    const ireland = features.find(feature=>feature.properties && feature.properties.quizCountry === "Ireland");
    const uk = features.find(feature=>feature.properties && feature.properties.quizCountry === "United Kingdom");
    if(!ireland || !uk) return;

    const ukPolygons = getFeaturePolygons(uk);
    const northernIreland = [];
    const remainingUk = [];
    for(const polygon of ukPolygons){
      if(isNorthernIrelandPolygon(polygon)){
        northernIreland.push(polygon);
      }else{
        remainingUk.push(polygon);
      }
    }
    if(!northernIreland.length || !remainingUk.length) return;

    setFeaturePolygons(uk, remainingUk);
    setFeaturePolygons(ireland, [...getFeaturePolygons(ireland), ...northernIreland]);
  }

  function getFeaturePolygons(feature){
    const geometry = feature && feature.geometry ? feature.geometry : {};
    if(geometry.type === "Polygon") return [geometry.coordinates];
    if(geometry.type === "MultiPolygon") return geometry.coordinates;
    return [];
  }

  function setFeaturePolygons(feature, polygons){
    if(!feature || !feature.geometry || !Array.isArray(polygons) || !polygons.length) return;
    if(polygons.length === 1){
      feature.geometry = {...feature.geometry, type:"Polygon", coordinates:polygons[0]};
    }else{
      feature.geometry = {...feature.geometry, type:"MultiPolygon", coordinates:polygons};
    }
  }

  function isNorthernIrelandPolygon(polygon){
    const bounds = getPolygonGeoBounds(polygon);
    if(!bounds) return false;
    const centreLon = (bounds.left + bounds.right) / 2;
    const centreLat = (bounds.bottom + bounds.top) / 2;
    return centreLon > -8.6
      && centreLon < -5.2
      && centreLat > 53.9
      && centreLat < 55.6
      && bounds.right < -5.0;
  }

  function getPolygonGeoBounds(polygon){
    if(!Array.isArray(polygon)) return null;
    let left = Infinity;
    let right = -Infinity;
    let bottom = Infinity;
    let top = -Infinity;
    let count = 0;
    for(const ring of polygon){
      if(!Array.isArray(ring)) continue;
      for(const point of ring){
        if(!Array.isArray(point) || point.length < 2) continue;
        const lon = Number(point[0]);
        const lat = Number(point[1]);
        if(!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        left = Math.min(left, lon);
        right = Math.max(right, lon);
        bottom = Math.min(bottom, lat);
        top = Math.max(top, lat);
        count += 1;
      }
    }
    return count ? {left, right, bottom, top} : null;
  }

  function getCountryZoomBounds(feature, referenceBounds, country="", options={}){
    const overrideBounds = getCountryZoomOverrideBounds(country, options);
    if(overrideBounds) return overrideBounds;
    const bounds = getFeatureGeoBounds(feature, referenceBounds);
    if(!bounds) return null;
    const rawLonSpan = Math.max(0.01, bounds.right - bounds.left);
    const rawLatSpan = Math.max(0.01, bounds.top - bounds.bottom);
    const lonSpan = Math.max(
      rawLonSpan * (1 + FOCUS_MAP_COUNTRY_ZOOM_PADDING_RATIO * 2),
      FOCUS_MAP_COUNTRY_ZOOM_MIN_LON_SPAN
    );
    const latSpan = Math.max(
      rawLatSpan * (1 + FOCUS_MAP_COUNTRY_ZOOM_PADDING_RATIO * 2),
      FOCUS_MAP_COUNTRY_ZOOM_MIN_LAT_SPAN
    );
    const centreLon = (bounds.left + bounds.right) / 2;
    const centreLat = (bounds.bottom + bounds.top) / 2;
    return [
      centreLon - lonSpan / 2,
      Math.max(-58, centreLat - latSpan / 2),
      centreLon + lonSpan / 2,
      Math.min(84, centreLat + latSpan / 2)
    ];
  }

  function getCountryZoomOverrideBounds(country, options={}){
    const override = FOCUS_MAP_COUNTRY_ZOOM_OVERRIDES[country];
    if(!override) return null;
    const centre = Array.isArray(override.center)
      ? override.center
      : override.center === "capital" && Array.isArray(options.capitalPoint)
        ? options.capitalPoint
        : null;
    if(!centre) return null;
    const lon = Number(centre[0]);
    const lat = Number(centre[1]);
    const lonSpan = Number(override.lonSpan);
    const latSpan = Number(override.latSpan);
    if(!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(lonSpan) || !Number.isFinite(latSpan)){
      return null;
    }
    return [
      lon - lonSpan / 2,
      Math.max(-58, lat - latSpan / 2),
      lon + lonSpan / 2,
      Math.min(84, lat + latSpan / 2)
    ];
  }

  function getFeatureGeoBounds(feature, referenceBounds){
    let left = Infinity;
    let right = -Infinity;
    let bottom = Infinity;
    let top = -Infinity;
    let count = 0;
    iteratePoints(feature, point=>{
      const lon = normaliseLonForBounds(Number(point[0]), referenceBounds);
      const lat = Number(point[1]);
      if(!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
      left = Math.min(left, lon);
      right = Math.max(right, lon);
      bottom = Math.min(bottom, lat);
      top = Math.max(top, lat);
      count += 1;
      return false;
    });
    if(count === 0) return null;
    return {left, right, bottom, top};
  }

  function getPanelFeatures(features, panel){
    return features.filter(feature=>featureHasPointsInBounds(feature, getPanelView(panel).bounds));
  }

  function featureHasPointsInBounds(feature, bounds){
    if(!bounds) return true;
    const [left, bottom, right, top] = bounds;
    return iteratePoints(feature, point=>{
      const lon = normaliseLonForBounds(Number(point[0]), bounds);
      const lat = Number(point[1]);
      return Number.isFinite(lon)
        && Number.isFinite(lat)
        && lon >= left
        && lon <= right
        && lat >= bottom
        && lat <= top;
    });
  }

  function makePathList(feature, panel){
    const geometry = feature.geometry || {};
    const polygons = geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
    const country = feature.properties.quizCountry;
    return polygons
      .map(polygon=>makePolygonPath(polygon, panel, country))
      .filter(Boolean);
  }

  function makeExteriorOutlinePath(feature, panel){
    const segmentCounts = new Map();
    const polygons = getFeaturePolygons(feature);
    for(const polygon of polygons){
      for(const ring of polygon){
        for(let i=1;i<ring.length;i++){
          const key = getSegmentKey(ring[i - 1], ring[i]);
          if(key) segmentCounts.set(key, (segmentCounts.get(key) || 0) + 1);
        }
      }
    }

    const segments = [];
    for(const polygon of polygons){
      for(const ring of polygon){
        for(let i=1;i<ring.length;i++){
          const start = ring[i - 1];
          const end = ring[i];
          const key = getSegmentKey(start, end);
          if(!key || segmentCounts.get(key) !== 1) continue;
          const projectedStart = projectPoint(start, panel);
          const projectedEnd = projectPoint(end, panel);
          if(!projectedStart || !projectedEnd) continue;
          segments.push(`M${formatNumber(projectedStart[0])},${formatNumber(projectedStart[1])}L${formatNumber(projectedEnd[0])},${formatNumber(projectedEnd[1])}`);
        }
      }
    }
    return segments.join("");
  }

  function getSegmentKey(start, end){
    const startKey = getPointKey(start);
    const endKey = getPointKey(end);
    if(!startKey || !endKey || startKey === endKey) return "";
    return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
  }

  function getPointKey(point){
    if(!Array.isArray(point) || point.length < 2) return "";
    const lon = Number(point[0]);
    const lat = Number(point[1]);
    if(!Number.isFinite(lon) || !Number.isFinite(lat)) return "";
    return `${lon.toFixed(5)},${lat.toFixed(5)}`;
  }

  function makePolygonPath(polygon, panel, country){
    if(!Array.isArray(polygon)) return "";
    const parts = [];
    for(const ring of polygon){
      const segment = makeRingPath(ring, panel, country);
      if(segment) parts.push(segment);
    }
    return parts.join("");
  }

  function makeRingPath(ring, panel, country){
    if(!Array.isArray(ring) || ring.length < 3) return "";
    const segments = [];
    let segment = [];
    let previousLon = null;
    let wasSplit = false;
    const view = getPanelView(panel);

    for(const point of ring){
      const rawLon = Number(point[0]);
      const lat = Number(point[1]);
      const lon = unwrapLon(rawLon, previousLon, view.bounds, country);
      const projected = projectLonLat(lon, lat, panel, view);
      const longJump = segment.length ? isLongProjectedJump(segment[segment.length - 1], projected, panel) : false;
      if(!projected){
        if(segment.length >= 3) segments.push(segment);
        segment = [];
        wasSplit = true;
      }else if(longJump){
        if(segment.length >= 3) segments.push(segment);
        segment = [projected];
        wasSplit = true;
      }else{
        segment.push(projected);
      }
      if(Number.isFinite(lon)) previousLon = lon;
    }

    if(segment.length >= 3) segments.push(segment);
    return segments.map(points=>{
      const [first, ...rest] = points;
      const closePath = wasSplit ? "" : "Z";
      return `M${formatNumber(first[0])},${formatNumber(first[1])}${rest.map(point=>`L${formatNumber(point[0])},${formatNumber(point[1])}`).join("")}${closePath}`;
    }).join("");
  }

  function projectPoint(point, panel){
    if(!Array.isArray(point) || point.length < 2) return null;
    const view = getPanelView(panel);
    const lon = normaliseLonForBounds(Number(point[0]), view.bounds);
    const lat = Number(point[1]);
    return projectLonLat(lon, lat, panel, view);
  }

  function projectLonLat(lon, lat, panel, view=getPanelView(panel)){
    const [left, bottom, right, top] = view.bounds;
    if(!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    const x = view.margin + ((lon - left) * view.lonScale / view.effectiveLonSpan) * view.innerWidth;
    const y = view.margin + ((top - lat) / view.latSpan) * view.innerHeight;
    return [x, y];
  }

  function unwrapLon(rawLon, previousLon, bounds, country){
    let lon = normaliseLonForBounds(rawLon, bounds);
    if(country === "Russia" && bounds && bounds[0] <= -180 && bounds[2] >= 180 && lon < -150){
      lon += 360;
    }
    if(previousLon === null || !Number.isFinite(previousLon) || !Number.isFinite(lon)) return lon;
    while(lon - previousLon > 180) lon -= 360;
    while(previousLon - lon > 180) lon += 360;
    return lon;
  }

  function normaliseLonForBounds(lon, bounds){
    if(!Number.isFinite(lon) || !bounds) return lon;
    const [left,, right] = bounds;
    if(right > 180 && lon < left) return lon + 360;
    if(left < -180 && lon > right) return lon - 360;
    return lon;
  }

  function isLongProjectedJump(previous, current, panel){
    if(!previous || !current) return false;
    const dx = Math.abs(current[0] - previous[0]);
    const dy = Math.abs(current[1] - previous[1]);
    return dx > panel.width * 1.05 || dy > panel.height * 1.05;
  }

  function getPanelView(panel){
    const margin = 18;
    const innerWidth = panel.width - margin * 2;
    const innerHeight = panel.height - margin * 2;
    let [left, bottom, right, top] = panel.bounds || FOCUS_MAP_MAIN_BOUNDS;
    const centreLon = (left + right) / 2;
    const centreLat = (bottom + top) / 2;
    const lonScale = Math.max(.35, Math.cos(Math.abs(centreLat) * Math.PI / 180));
    let lonSpan = right - left;
    let latSpan = top - bottom;
    const targetAspect = innerWidth / innerHeight;
    const geoAspect = (lonSpan * lonScale) / latSpan;

    if(geoAspect > targetAspect){
      latSpan = (lonSpan * lonScale) / targetAspect;
      bottom = centreLat - latSpan / 2;
      top = centreLat + latSpan / 2;
    }else{
      lonSpan = (latSpan * targetAspect) / lonScale;
      left = centreLon - lonSpan / 2;
      right = centreLon + lonSpan / 2;
    }

    return {
      bounds:[left, bottom, right, top],
      margin,
      innerWidth,
      innerHeight,
      lonScale,
      effectiveLonSpan: lonSpan * lonScale,
      latSpan
    };
  }

  function getProjectedBounds(feature, panel){
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let count = 0;
    iteratePoints(feature, point=>{
      const projected = projectPoint(point, panel);
      if(!projected) return false;
      const [x, y] = projected;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      count += 1;
      return false;
    });
    if(count === 0) return null;
    return {
      x:(minX + maxX) / 2,
      y:(minY + maxY) / 2,
      width:maxX - minX,
      height:maxY - minY
    };
  }

  function shouldDrawTargetMarker(country, panel, bounds){
    if(FOCUS_MAP_SMALL_MARKER_COUNTRIES.has(country)) return true;
    return bounds.width < 9 || bounds.height < 9 || panel.width < 700;
  }

  function iteratePoints(feature, callback){
    const geometry = feature.geometry || {};
    const polygons = geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
    for(const polygon of polygons){
      for(const ring of polygon){
        for(const point of ring){
          if(callback(point)) return true;
        }
      }
    }
    return false;
  }

  function getCountryClass(country, targetCountry){
    const classes = ["country-focus-map-country"];
    if(!country){
      classes.push("is-context");
    }else if(country === targetCountry){
      classes.push("is-target");
    }else{
      classes.push("is-muted");
    }
    return classes.join(" ");
  }

  function applyTargetCountryFill(path, feature, country, shellId){
    const solidFill = FOCUS_MAP_SOLID_TARGET_FILLS[country];
    if(solidFill){
      path.style.fill = solidFill.fill;
      if(solidFill.stroke) path.style.stroke = solidFill.stroke;
      if(solidFill.strokeWidth) path.style.strokeWidth = String(solidFill.strokeWidth);
      return;
    }
    if(alpha2Overrides[country]){
      path.style.fill = `url(#${getPatternId(country, shellId)})`;
    }
  }

  function ensureFlagPattern(defs, country, shellId){
    const code = (alpha2Overrides[country] || "").toLowerCase();
    if(!code || !defs) return false;
    const id = getPatternId(country, shellId);
    const pattern = svgNode("pattern", {
      id,
      x:0,
      y:0,
      width:1,
      height:1,
      patternUnits:"objectBoundingBox",
      patternContentUnits:"objectBoundingBox"
    });
    const image = svgNode("image", {
      x:0,
      y:0,
      width:1,
      height:1,
      preserveAspectRatio:"none",
      href:flagCdnUrl(code, 160)
    });
    image.setAttributeNS("http://www.w3.org/1999/xlink", "href", flagCdnUrl(code, 160));
    pattern.appendChild(image);
    defs.appendChild(pattern);
    return true;
  }

  function getPatternId(country, shellId="country-focus-map"){
    const index = countries.indexOf(country);
    return `${shellId}-flag-fill-${index >= 0 ? index : normalise(country).replace(/\s+/g, "-")}`;
  }

  async function getCapitalCoordinate(country, targetFeature=null, continent=""){
    const coordinates = await loadCapitalCoordinates();
    const exact = coordinates.get(country);
    if(exact) return exact;
    const fallback = getFallbackCapitalCoordinate(country, targetFeature, continent);
    if(!fallback) return null;
    const estimated = [...fallback];
    estimated.estimated = true;
    return estimated;
  }

  async function loadCapitalCoordinates(){
    if(capitalCoordinateCache) return capitalCoordinateCache;
    if(capitalLoadPromise) return capitalLoadPromise;
    capitalLoadPromise = (async ()=>{
      const coordinates = new Map();
      try{
        const response = await fetch(CAPITAL_COORDINATES_URL);
        if(response.ok){
          const text = await response.text();
          const rows = parseCapitalCoordinateRows(text);
          for(const row of rows){
            const sourceCountry = row && row.properties && row.properties.country;
            const country = resolveCapitalCoordinateCountry(sourceCountry);
            const point = row && row.geometry && Array.isArray(row.geometry.coordinates)
              ? row.geometry.coordinates
              : null;
            if(country && point && point.length >= 2){
              const lon = Number(point[0]);
              const lat = Number(point[1]);
              if(Number.isFinite(lon) && Number.isFinite(lat)){
                coordinates.set(country, [lon, lat]);
              }
            }
          }
        }
      }catch{
        // The map still works without external capital coordinates.
      }
      for(const [country, point] of Object.entries(CAPITAL_COORDINATE_OVERRIDES)){
        coordinates.set(country, point);
      }
      capitalCoordinateCache = coordinates;
      return coordinates;
    })();
    return capitalLoadPromise;
  }

  function parseCapitalCoordinateRows(text){
    const source = String(text || "");
    const match = source.match(/var\s+details\s*=\s*(\[[\s\S]*?\]);/);
    if(!match) return [];
    try{
      const rows = JSON.parse(match[1]);
      return Array.isArray(rows) ? rows : [];
    }catch{
      return [];
    }
  }

  function resolveCapitalCoordinateCountry(sourceCountry){
    if(!sourceCountry) return null;
    if(Object.prototype.hasOwnProperty.call(CAPITAL_COORDINATE_COUNTRY_ALIASES, sourceCountry)){
      return resolveCountry(CAPITAL_COORDINATE_COUNTRY_ALIASES[sourceCountry]);
    }
    return resolveCountry(sourceCountry);
  }

  function getFallbackCapitalCoordinate(country, targetFeature, continent){
    if(!targetFeature) return null;
    const bounds = getFeatureGeoBounds(targetFeature, FOCUS_MAP_CONTINENT_BOUNDS[continent] || FOCUS_MAP_MAIN_BOUNDS);
    if(!bounds) return null;
    return [
      (bounds.left + bounds.right) / 2,
      (bounds.bottom + bounds.top) / 2
    ];
  }

  function getAlpha2CountryMap(){
    if(alpha2CountryCache) return alpha2CountryCache;
    alpha2CountryCache = new Map();
    for(const [country, code] of Object.entries(alpha2Overrides || {})){
      alpha2CountryCache.set(String(code || "").toLowerCase(), country);
    }
    return alpha2CountryCache;
  }

  function getCountryIndex(){
    if(countryIndexCache) return countryIndexCache;
    countryIndexCache = new Map();
    for(const country of countries || []){
      addCountryIndexValue(countryIndexCache, country, country);
      for(const alias of countryAliases[country] || []){
        addCountryIndexValue(countryIndexCache, alias, country);
      }
    }
    return countryIndexCache;
  }

  function addCountryIndexValue(index, value, country){
    const key = normalise(value);
    if(key && !index.has(key)) index.set(key, country);
  }

  function resolveCountry(candidate){
    if(!candidate) return null;
    if(countries.includes(candidate)) return candidate;
    return getCountryIndex().get(normalise(candidate)) || null;
  }

  function getPrimaryContinent(country){
    const values = FOCUS_MAP_COUNTRY_CONTINENTS[country] || [countryContinent[country] || "Unknown"];
    return values[0] || "Unknown";
  }

  function getCountryContinents(country){
    return FOCUS_MAP_COUNTRY_CONTINENTS[country] || [countryContinent[country] || "Unknown"];
  }

  function getCountriesForContinent(continent){
    return (countries || []).filter(country=>getCountryContinents(country).includes(continent));
  }

  function getCapitalName(country){
    return countryCapitals[country] || "Capital";
  }

  function cleanName(value){
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function formatNumber(value){
    return Number(value).toFixed(2).replace(/\.?0+$/, "");
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function svgNode(name, attributes={}){
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    for(const [key, value] of Object.entries(attributes)){
      node.setAttribute(key, String(value));
    }
    return node;
  }

  window.CountryFocusMap = {
    render,
    cancel,
    create,
    loadFeatures,
    getCapitalCoordinate
  };
})();
