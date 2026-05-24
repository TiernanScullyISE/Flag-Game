(function(){
  const REGION_MAP_WIDTH = 1440;
  const REGION_MAP_HEIGHT = 760;
  const REGION_MAP_PADDING = 30;
  const REGION_MAP_PANEL_RADIUS = 18;

  const featureCache = new Map();
  const loadPromiseCache = new Map();

  const listState = {
    groupKey: "",
    defs: null,
    progress: null,
    pathElementsByItem: new Map()
  };

  function getGroup(groupKey){
    return REGION_GAME_GROUPS[groupKey] || REGION_GAME_GROUPS[DEFAULT_REGION_GAME_GROUP];
  }

  function getGroupItems(groupKey){
    const group = getGroup(groupKey);
    return Array.isArray(group.items) ? group.items : [];
  }

  function getRegionItem(groupKey, itemName){
    const key = normalise(itemName);
    return getGroupItems(groupKey).find(item=>normalise(item.name) === key) || null;
  }

  function getRegionItemNames(groupKey){
    return getGroupItems(groupKey).map(item=>item.name);
  }

  async function renderList(target, groupKey, options={}){
    const group = getGroup(groupKey);
    const features = await loadRegionFeatures(group.key);
    const pool = Array.isArray(options.pool) ? options.pool : getRegionItemNames(group.key);
    const solved = options.solved instanceof Set ? options.solved : new Set(options.solved || []);
    target.innerHTML = "";
    target.appendChild(createMapShell(group, features, {
      pool,
      solved,
      showProgress:true
    }));
    return true;
  }

  async function renderFocus(target, groupKey, itemName, options={}){
    const group = getGroup(groupKey);
    const features = await loadRegionFeatures(group.key);
    const pool = getRegionItemNames(group.key);
    const solved = new Set(options.solved || []);
    solved.add(itemName);
    target.innerHTML = "";
    target.appendChild(createMapShell(group, features, {
      pool,
      solved,
      targetItem:itemName,
      showProgress:false,
      showCaption:options.showCaption !== false,
      showCapitalMarker:options.showCapitalMarker === true,
      showCapitalLabel:options.showCapitalLabel === true
    }));
    return true;
  }

  function createMapShell(group, features, options){
    const shell = document.createElement("div");
    shell.className = `region-map-shell region-map-${normalise(group.key).replace(/\s+/g, "-")}`;

    listState.groupKey = group.key;
    listState.defs = null;
    listState.progress = null;
    listState.pathElementsByItem = new Map();

    const poolSet = new Set(options.pool || []);
    const solvedSet = options.solved instanceof Set ? options.solved : new Set(options.solved || []);
    const panelFeatures = features.filter(feature=>poolSet.has(feature.properties.regionName));
    const bounds = getFeaturesBounds(panelFeatures, group);
    const panel = {
      x:0,
      y:0,
      width:REGION_MAP_WIDTH,
      height:REGION_MAP_HEIGHT,
      bounds,
      yDirection:getMapYDirection(group)
    };

    const svg = svgNode("svg", {
      viewBox:`0 0 ${REGION_MAP_WIDTH} ${REGION_MAP_HEIGHT}`,
      role:"img",
      "aria-label":group.mapLabel || `${group.label} regions`
    });

    const defs = svgNode("defs");
    listState.defs = defs;
    const preloadFlags = options.showProgress === true;
    for(const itemName of preloadFlags ? poolSet : solvedSet) ensureRegionFlagPattern(group.key, itemName, defs);
    svg.appendChild(defs);

    svg.appendChild(svgNode("rect", {
      class:"region-map-ocean",
      x:0,
      y:0,
      width:REGION_MAP_WIDTH,
      height:REGION_MAP_HEIGHT,
      rx:REGION_MAP_PANEL_RADIUS
    }));

    svg.appendChild(svgNode("rect", {
      class:"region-map-panel-bg",
      x:0,
      y:0,
      width:REGION_MAP_WIDTH,
      height:REGION_MAP_HEIGHT,
      rx:REGION_MAP_PANEL_RADIUS
    }));

    const mapLayer = svgNode("g", {class:"region-map-layer"});
    svg.appendChild(mapLayer);
    let targetOutlinePath = "";
    let targetFeature = null;

    for(const feature of panelFeatures){
      const itemName = feature.properties.regionName;
      const pathDataList = makeRegionPathList(feature, panel);
      if(!pathDataList.length) continue;
      const pathData = pathDataList.join("");

      const path = svgNode("path", {
        class:getRegionPathClass(itemName, options.targetItem, solvedSet),
        d:pathData
      });
      path.dataset.regionItem = itemName;
      if(solvedSet.has(itemName)){
        if(ensureRegionFlagPattern(group.key, itemName, defs)){
          path.style.fill = `url(#${getRegionPatternId(group.key, itemName)})`;
        }else{
          path.classList.add("is-solved-unflagged");
        }
      }
      rememberRegionPath(itemName, path);
      mapLayer.appendChild(path);
      if(options.targetItem && itemName === options.targetItem){
        targetOutlinePath = pathData;
        targetFeature = feature;
      }
    }

    if(targetOutlinePath){
      mapLayer.appendChild(svgNode("path", {
        class:"region-map-target-outline region-map-target-outline-backdrop",
        d:targetOutlinePath
      }));
      mapLayer.appendChild(svgNode("path", {
        class:"region-map-target-outline region-map-target-outline-front",
        d:targetOutlinePath
      }));
    }

    if(options.showCapitalMarker && options.targetItem && targetFeature){
      drawRegionCapitalMarker(mapLayer, panel, group, options.targetItem, targetFeature, {
        showLabel:options.showCapitalLabel === true
      });
    }

    const label = svgNode("text", {
      class:"region-map-panel-label",
      x:18,
      y:30
    });
    label.textContent = group.mapLabel || group.label;
    svg.appendChild(label);
    shell.appendChild(svg);

    if(options.showCaption && options.targetItem){
      shell.appendChild(createFocusCaption(group, options.targetItem));
    }

    if(options.showProgress){
      const progress = createRegionProgress();
      listState.progress = progress;
      shell.appendChild(progress);
      updateProgress(group.key, {pool:options.pool, solved:solvedSet});
    }

    return shell;
  }

  function createFocusCaption(group, itemName){
    const item = getRegionItem(group.key, itemName);
    const caption = document.createElement("div");
    caption.className = "region-map-caption";
    const name = document.createElement("div");
    name.className = "region-map-country-name";
    name.textContent = itemName;
    caption.appendChild(name);
    if(item && item.capital){
      const capital = document.createElement("div");
      capital.className = "region-map-capital-name";
      capital.textContent = item.capital;
      caption.appendChild(capital);
    }
    return caption;
  }

  function createRegionProgress(){
    const progress = document.createElement("div");
    progress.className = "world-map-progress region-map-progress";
    return progress;
  }

  function updateProgress(groupKey, options={}){
    if(!listState.progress || listState.groupKey !== groupKey) return;
    const group = getGroup(groupKey);
    const pool = Array.isArray(options.pool) ? options.pool : getRegionItemNames(groupKey);
    const solved = options.solved instanceof Set ? options.solved : new Set(options.solved || []);
    const remaining = pool.filter(item=>!solved.has(item)).length;

    const total = document.createElement("div");
    total.className = "world-map-progress-total";
    total.textContent = `${remaining} of ${pool.length} ${group.itemPluralLabel} remaining`;

    const grid = document.createElement("div");
    grid.className = "world-map-progress-grid";
    const item = document.createElement("div");
    item.className = `world-map-progress-item ${remaining === 0 ? "is-empty" : ""}`;
    const label = document.createElement("span");
    label.textContent = group.label;
    const value = document.createElement("strong");
    value.textContent = String(remaining);
    item.append(label, value);
    grid.appendChild(item);

    listState.progress.replaceChildren(total, grid);
  }

  function scheduleSolved(groupKey, itemName){
    if(listState.groupKey !== groupKey) return;
    const hasFlagPattern = ensureRegionFlagPattern(groupKey, itemName, listState.defs);
    const paths = listState.pathElementsByItem.get(itemName) || [];
    for(const path of paths){
      path.classList.add("is-solved", "is-just-solved");
      if(hasFlagPattern){
        path.style.fill = `url(#${getRegionPatternId(groupKey, itemName)})`;
      }else{
        path.classList.add("is-solved-unflagged");
      }
      window.setTimeout(()=>path.classList.remove("is-just-solved"), 520);
    }
  }

  async function loadRegionFeatures(groupKey){
    const group = getGroup(groupKey);
    if(featureCache.has(group.key)) return featureCache.get(group.key);
    if(loadPromiseCache.has(group.key)) return loadPromiseCache.get(group.key);

    const promise = (async ()=>{
      const data = await fetchRegionMapData(group);
      const features = convertRegionFeatures(group, data)
        .map(feature=>normaliseRegionFeature(group, feature))
        .filter(feature=>!!feature.properties.regionName);
      if(!features.length) throw new Error(`${group.mapLabel || group.label} map has no matching ${group.itemPluralLabel}.`);
      featureCache.set(group.key, features);
      return features;
    })().catch(error=>{
      loadPromiseCache.delete(group.key);
      throw error;
    });

    loadPromiseCache.set(group.key, promise);
    return promise;
  }

  async function fetchRegionMapData(group){
    const urls = Array.from(new Set([group.map.url, ...(group.map.fallbackUrls || [])].filter(Boolean)));
    let lastStatus = "";
    let lastError = null;
    for(const url of urls){
      try{
        const response = await fetch(url, {
          headers: {
            "Accept":"application/geo+json, application/json;q=0.9, */*;q=0.8"
          }
        });
        if(!response.ok){
          lastStatus = String(response.status);
          continue;
        }
        try{
          return await readRegionMapResponse(group, response);
        }catch(error){
          lastError = error;
        }
      }catch(error){
        lastError = error;
      }
    }
    if(lastError) throw lastError;
    throw new Error(`${group.mapLabel || group.label} map failed to load (${lastStatus || "network error"}).`);
  }

  async function readRegionMapResponse(group, response){
    if(group.map.source === "geojson-zip"){
      if(!window.JSZip || !window.JSZip.loadAsync){
        throw new Error("Zip map library did not load. Check your connection and try again.");
      }
      const archive = await window.JSZip.loadAsync(await response.arrayBuffer());
      const targetName = group.map.zipFile || "";
      const file = targetName
        ? archive.file(targetName)
        : archive.file(/\.geojson$/i)[0];
      if(!file) throw new Error(`${group.mapLabel || group.label} archive is missing GeoJSON data.`);
      return parseRegionMapJson(group, await file.async("text"));
    }
    return parseRegionMapJson(group, await response.text());
  }

  function parseRegionMapJson(group, text){
    const label = group.mapLabel || group.label;
    const prefix = String(text || "").trimStart().slice(0, 80);
    if(prefix.startsWith("version https://git-lfs.github.com/spec/v1")){
      throw new Error(`${label} map source returned a Git LFS pointer instead of GeoJSON.`);
    }
    if(prefix.startsWith("<!DOCTYPE") || prefix.startsWith("<html") || prefix.startsWith("<")){
      throw new Error(`${label} map source returned HTML instead of map data.`);
    }
    try{
      return JSON.parse(text);
    }catch{
      throw new Error(`${label} map source did not return valid JSON.`);
    }
  }

  function convertRegionFeatures(group, data){
    if(group.map.source === "topojson"){
      if(!window.topojson || !window.topojson.feature){
        throw new Error("Map libraries did not load. Check your connection and try again.");
      }
      const objectName = group.map.objectName;
      const object = data && data.objects && data.objects[objectName];
      if(!object) throw new Error(`${group.mapLabel || group.label} map is missing ${objectName}.`);
      return window.topojson.feature(data, object).features || [];
    }
    if(data && data.type === "FeatureCollection" && Array.isArray(data.features)){
      return data.features;
    }
    throw new Error(`${group.mapLabel || group.label} map data is not a supported format.`);
  }

  function normaliseRegionFeature(group, feature){
    const rawName = getRegionFeatureRawName(group, feature);
    const regionName = resolveRegionFeatureName(group, rawName);
    return {
      ...feature,
      properties: {
        ...(feature.properties || {}),
        rawRegionName: rawName,
        regionName
      }
    };
  }

  function getRegionFeatureRawName(group, feature){
    const props = feature && feature.properties ? feature.properties : {};
    for(const field of group.map.nameFields || []){
      const value = props[field];
      if(value) return cleanRegionFeatureName(value);
    }
    return "";
  }

  function cleanRegionFeatureName(value){
    return repairRegionMojibake(value)
      .replace(/^County\s+/i, "")
      .replace(/\s+County$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function resolveRegionFeatureName(group, rawName){
    const aliases = group.map.featureAliases || {};
    const alias = resolveRegionFeatureAlias(aliases, rawName);
    if(alias) return alias;
    const key = normalise(rawName);
    const regionalKey = normaliseRegionMatch(rawName);
    const exactItem = getGroupItems(group.key).find(candidate=>
      normalise(candidate.name) === key
      || (candidate.aliases || []).some(alias=>normalise(alias) === key)
      || (candidate.featureAliases || []).some(alias=>normalise(alias) === key)
    );
    if(exactItem) return exactItem.name;
    const relaxedItem = getGroupItems(group.key).find(candidate=>
      normaliseRegionMatch(candidate.name) === regionalKey
      || (candidate.aliases || []).some(alias=>normaliseRegionMatch(alias) === regionalKey)
      || (candidate.featureAliases || []).some(alias=>normaliseRegionMatch(alias) === regionalKey)
    );
    return relaxedItem ? relaxedItem.name : "";
  }

  function resolveRegionFeatureAlias(aliases, rawName){
    if(Object.prototype.hasOwnProperty.call(aliases, rawName)) return aliases[rawName];
    const repaired = repairRegionMojibake(rawName);
    if(Object.prototype.hasOwnProperty.call(aliases, repaired)) return aliases[repaired];
    const regionalKey = normaliseRegionMatch(rawName);
    for(const [alias, itemName] of Object.entries(aliases)){
      if(normaliseRegionMatch(alias) === regionalKey) return itemName;
    }
    return "";
  }

  function normaliseRegionMatch(value){
    return normalise(repairRegionMojibake(value)
      .replace(/&/g, " and ")
      .replace(/[-‐‑‒–—―]/g, " ")
    ).replace(/\b(an|the|of|de|del|da|do|dos|das|la|le|el|autonomous|federal|administrative|special|capital|city|cities|district|districts|municipality|municipalities|province|provinces|provincia|region|regions|regiao|estado|state|states|territory|territories|prefecture|prefectures|governorate|governorates|oblast|oblasts|county|counties|department|departments|canton|cantons|maakond|republic|republics|voivodeship|voivodeships|subject|subjects|lan|kraj|krai)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function repairRegionMojibake(value){
    const text = String(value || "");
    if(!/[ÃÂâ]/.test(text)) return text;
    try{
      const bytes = new Uint8Array(Array.from(text, char=>char.charCodeAt(0) & 255));
      return new TextDecoder("utf-8").decode(bytes);
    }catch{
      try{
        return decodeURIComponent(escape(text));
      }catch{
        return text;
      }
    }
  }

  function getMapYDirection(group){
    return group && group.map && group.map.yDirection === "down" ? "down" : "up";
  }

  function getFeaturesBounds(features, group){
    const bounds = {left:Infinity, right:-Infinity, top:0, bottom:0};
    const yDown = getMapYDirection(group) === "down";
    let minY = Infinity;
    let maxY = -Infinity;
    let count = 0;
    for(const feature of features){
      iterateRegionPoints(feature, point=>{
        const x = Number(point[0]);
        const y = Number(point[1]);
        if(!Number.isFinite(x) || !Number.isFinite(y)) return;
        bounds.left = Math.min(bounds.left, x);
        bounds.right = Math.max(bounds.right, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        count += 1;
      });
    }
    if(yDown){
      bounds.top = minY;
      bounds.bottom = maxY;
    }else{
      bounds.bottom = minY;
      bounds.top = maxY;
    }
    if(!count || bounds.left === bounds.right || bounds.top === bounds.bottom){
      return {left:0, right:1, bottom:0, top:1};
    }
    return bounds;
  }

  function iterateRegionPoints(feature, callback){
    for(const polygon of getRegionFeaturePolygons(feature)){
      for(const ring of polygon){
        for(const point of ring) callback(point);
      }
    }
  }

  function getRegionFeaturePolygons(feature){
    const geometry = feature && feature.geometry ? feature.geometry : {};
    if(geometry.type === "Polygon") return [geometry.coordinates];
    if(geometry.type === "MultiPolygon") return geometry.coordinates;
    return [];
  }

  function makeRegionPathList(feature, panel){
    return getRegionFeaturePolygons(feature)
      .map(polygon=>makeRegionPolygonPath(polygon, panel))
      .filter(Boolean);
  }

  function makeRegionPolygonPath(polygon, panel){
    if(!Array.isArray(polygon)) return "";
    const parts = [];
    for(const ring of polygon){
      if(!Array.isArray(ring) || ring.length < 2) continue;
      const projected = ring.map(point=>projectRegionPoint(point, panel)).filter(Boolean);
      if(projected.length < 2) continue;
      const first = projected[0];
      const rest = projected.slice(1);
      parts.push(`M${formatRegionNumber(first[0])},${formatRegionNumber(first[1])}${rest.map(point=>`L${formatRegionNumber(point[0])},${formatRegionNumber(point[1])}`).join("")}Z`);
    }
    return parts.join("");
  }

  function drawRegionCapitalMarker(layer, panel, group, itemName, feature, options={}){
    const markerPoint = getProjectedRegionCapitalPoint(group, itemName, feature, panel);
    if(!markerPoint) return;
    const marker = svgNode("g", {
      class:`region-map-capital-marker ${markerPoint.estimated ? "is-estimated" : "is-exact"}`.trim()
    });
    marker.appendChild(svgNode("circle", {
      class:"region-map-capital-pulse",
      cx:formatRegionNumber(markerPoint.x),
      cy:formatRegionNumber(markerPoint.y),
      r:16
    }));
    marker.appendChild(svgNode("circle", {
      class:"region-map-capital-dot",
      cx:formatRegionNumber(markerPoint.x),
      cy:formatRegionNumber(markerPoint.y),
      r:7.4
    }));

    const item = getRegionItem(group.key, itemName);
    if(options.showLabel && item && item.capital){
      appendRegionCapitalLabel(marker, panel, markerPoint, item.capital);
    }
    layer.appendChild(marker);
  }

  function appendRegionCapitalLabel(marker, panel, point, label){
    const textWidth = Math.max(74, Math.min(230, label.length * 9.6 + 24));
    const textHeight = 34;
    const showLeft = point.x + textWidth + 30 > panel.width;
    const labelX = clampRegion(showLeft ? point.x - textWidth - 18 : point.x + 18, 12, panel.width - textWidth - 12);
    const labelY = clampRegion(point.y - textHeight - 14, 42, panel.height - textHeight - 14);
    const anchorX = showLeft ? labelX + textWidth : labelX;
    const anchorY = labelY + textHeight / 2;

    marker.insertBefore(svgNode("line", {
      class:"region-map-capital-line",
      x1:formatRegionNumber(point.x),
      y1:formatRegionNumber(point.y),
      x2:formatRegionNumber(anchorX),
      y2:formatRegionNumber(anchorY)
    }), marker.firstChild);
    marker.appendChild(svgNode("rect", {
      class:"region-map-capital-label-bg",
      x:formatRegionNumber(labelX),
      y:formatRegionNumber(labelY),
      width:formatRegionNumber(textWidth),
      height:textHeight,
      rx:10
    }));
    const text = svgNode("text", {
      class:"region-map-capital-label",
      x:formatRegionNumber(labelX + textWidth / 2),
      y:formatRegionNumber(labelY + 22),
      "text-anchor":"middle"
    });
    text.textContent = label;
    marker.appendChild(text);
  }

  function getProjectedRegionCapitalPoint(group, itemName, feature, panel){
    const item = getRegionItem(group.key, itemName);
    if(item && isValidRegionCoordinate(item.capitalCoordinates)){
      const projected = projectRegionPoint(item.capitalCoordinates, panel);
      if(projected && isProjectedPointInPanel(projected, panel)){
        return {x:projected[0], y:projected[1], estimated:false};
      }
    }
    const fallback = getProjectedRegionBoundsCenter(feature, panel);
    return fallback ? {x:fallback[0], y:fallback[1], estimated:true} : null;
  }

  function getProjectedRegionBoundsCenter(feature, panel){
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    iterateRegionPoints(feature, point=>{
      const projected = projectRegionPoint(point, panel);
      if(!projected) return;
      left = Math.min(left, projected[0]);
      right = Math.max(right, projected[0]);
      top = Math.min(top, projected[1]);
      bottom = Math.max(bottom, projected[1]);
    });
    if(!Number.isFinite(left) || left === right || top === bottom) return null;
    return [(left + right) / 2, (top + bottom) / 2];
  }

  function isValidRegionCoordinate(value){
    return Array.isArray(value)
      && value.length === 2
      && value.every(Number.isFinite)
      && Math.abs(value[0]) <= 180
      && Math.abs(value[1]) <= 90;
  }

  function isProjectedPointInPanel(point, panel){
    const margin = 18;
    return point[0] >= panel.x - margin
      && point[0] <= panel.x + panel.width + margin
      && point[1] >= panel.y - margin
      && point[1] <= panel.y + panel.height + margin;
  }

  function clampRegion(value, min, max){
    return Math.max(min, Math.min(max, value));
  }

  function projectRegionPoint(point, panel){
    const x = Number(point[0]);
    const y = Number(point[1]);
    if(!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const bounds = panel.bounds;
    const spanX = Math.max(1e-9, bounds.right - bounds.left);
    const spanY = Math.max(1e-9, Math.abs(bounds.top - bounds.bottom));
    const innerWidth = panel.width - REGION_MAP_PADDING * 2;
    const innerHeight = panel.height - REGION_MAP_PADDING * 2;
    const scale = Math.min(innerWidth / spanX, innerHeight / spanY);
    const drawnWidth = spanX * scale;
    const drawnHeight = spanY * scale;
    const offsetX = panel.x + (panel.width - drawnWidth) / 2;
    const offsetY = panel.y + (panel.height - drawnHeight) / 2;
    const projectedX = offsetX + (x - bounds.left) * scale;
    const projectedY = panel.yDirection === "down"
      ? offsetY + (y - bounds.top) * scale
      : offsetY + (bounds.top - y) * scale;
    return [projectedX, projectedY];
  }

  function getRegionPathClass(itemName, targetItem, solvedSet){
    const classes = ["region-map-country"];
    if(targetItem && itemName === targetItem) classes.push("is-target");
    if(solvedSet.has(itemName)) classes.push("is-solved");
    return classes.join(" ");
  }

  function rememberRegionPath(itemName, path){
    const paths = listState.pathElementsByItem.get(itemName) || [];
    paths.push(path);
    listState.pathElementsByItem.set(itemName, paths);
  }

  function ensureRegionFlagPattern(groupKey, itemName, defs=listState.defs){
    if(!defs || !itemName) return false;
    const id = getRegionPatternId(groupKey, itemName);
    if(defs.querySelector(`#${CSS.escape(id)}`)) return true;
    const group = getGroup(groupKey);
    const item = getRegionItem(group.key, itemName);
    if(!item) return false;
    const url = getRegionFlagUrl(groupKey, itemName);
    if(!url) return false;
    const pattern = svgNode("pattern", {
      id,
      patternUnits:"objectBoundingBox",
      patternContentUnits:"objectBoundingBox",
      width:1,
      height:1
    });
    pattern.appendChild(svgNode("rect", {
      x:0,
      y:0,
      width:1,
      height:1,
      fill:"#fff9ee"
    }));
    const image = svgNode("image", {
      x:0,
      y:0,
      width:1,
      height:1,
      preserveAspectRatio:"none",
      href:url
    });
    image.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
    pattern.appendChild(image);
    defs.appendChild(pattern);
    return true;
  }

  function createFlagElement(groupKey, itemName, size=320){
    const item = getRegionItem(groupKey, itemName);
    const url = getRegionFlagUrl(groupKey, itemName);
    if(!item || !url) return createRegionFlagFallback(size);
    const img = document.createElement("img");
    img.alt = `${itemName} ${getGroup(groupKey).flagLabel || "flag"}`;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = size;
    img.height = Math.round(size * 0.625);
    img.src = url;
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", ()=>{
      img.replaceWith(createRegionFlagFallback(size));
    }, {once:true});
    return img;
  }

  function createRegionFlagFallback(size){
    const div = document.createElement("div");
    div.className = "flag-fallback";
    div.style.width = `${size}px`;
    div.style.height = `${Math.round(size * 0.625)}px`;
    div.textContent = "Flag unavailable";
    return div;
  }

  function getRegionFlagUrl(groupKey, itemName){
    const group = getGroup(groupKey);
    const item = getRegionItem(group.key, itemName);
    if(!item) return "";
    if(item.flagUrl) return item.flagUrl;
    if(item.flagFile) return getCommonsFileUrl(item.flagFile);
    if(group.flagFileTemplate){
      return getCommonsFileUrl(group.flagFileTemplate.replace(/\{name\}/g, item.name));
    }
    if(group.key === "United States"){
      const file = item.flagFile || `Flag of ${item.name}.svg`;
      return getCommonsFileUrl(file);
    }
    if(Array.isArray(item.colours) && item.colours.length) return makeCountyColourFlagDataUrl(item);
    return "";
  }

  function getCommonsFileUrl(file){
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
  }

  function makeCountyColourFlagDataUrl(item){
    const colours = Array.isArray(item.colours) && item.colours.length ? item.colours : ["#e9eef2", "#1f2933"];
    const safeColours = colours.map(colour=>/^#[0-9a-f]{3,8}$/i.test(colour) ? colour : "#d8e1e8");
    const stripeWidth = 900 / safeColours.length;
    const stripes = safeColours.map((colour, index)=>
      `<rect x="${index * stripeWidth}" y="0" width="${stripeWidth + 1}" height="560" fill="${colour}"/>`
    ).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560">${stripes}</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function getRegionPatternId(groupKey, itemName){
    return `region-flag-fill-${normalise(groupKey).replace(/\s+/g, "-")}-${normalise(itemName).replace(/\s+/g, "-")}`;
  }

  function formatRegionNumber(value){
    return Number(value).toFixed(2).replace(/\.?0+$/, "");
  }

  function svgNode(tag, attrs={}){
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for(const [key, value] of Object.entries(attrs)){
      node.setAttribute(key, value);
    }
    return node;
  }

  window.RegionMap = {
    renderList,
    renderFocus,
    updateProgress,
    scheduleSolved,
    createFlagElement,
    getRegionFlagUrl,
    getRegionItem,
    getRegionItemNames,
    loadRegionFeatures
  };
})();
