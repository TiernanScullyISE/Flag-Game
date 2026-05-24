const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {chromium} = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const MIME_TYPES = {
  ".css":"text/css",
  ".html":"text/html",
  ".js":"application/javascript",
  ".json":"application/json",
  ".svg":"image/svg+xml"
};

function serveFile(request, response){
  const url = new URL(request.url, "http://127.0.0.1");
  const requestPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const targetPath = path.resolve(ROOT, requestPath.replace(/^\/+/, ""));
  if(!targetPath.startsWith(ROOT)){
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.readFile(targetPath, (error, data)=>{
    if(error){
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {"Content-Type":MIME_TYPES[path.extname(targetPath)] || "application/octet-stream"});
    response.end(data);
  });
}

function startServer(){
  const server = http.createServer(serveFile);
  return new Promise(resolve=>{
    server.listen(0, "127.0.0.1", ()=>{
      const {port} = server.address();
      resolve({server, baseUrl:`http://127.0.0.1:${port}`});
    });
  });
}

async function checkRegionMaps(page){
  return page.evaluate(async ()=>{
    const container = document.createElement("div");
    container.style.width = "960px";
    container.style.height = "640px";
    document.body.appendChild(container);

    const failures = [];
    const groups = REGION_GAME_GROUP_ORDER.filter(key=>{
      const group = REGION_GAME_GROUPS[key];
      return group && group.map && group.map.source;
    });

    for(const groupKey of groups){
      const group = REGION_GAME_GROUPS[groupKey];
      const itemNames = group.items.map(item=>item.name);
      const flaggedItems = group.items.filter(item=>item.flagUrl || item.flagFile || group.flagFileTemplate || group.key === "United States" || (Array.isArray(item.colours) && item.colours.length));
      const targetName = (flaggedItems[0] && flaggedItems[0].name) || itemNames[0];
      try{
        await RegionMap.renderList(container, groupKey, {
          pool:itemNames,
          solved:new Set([targetName])
        });
        const listPaths = container.querySelectorAll(".region-map-country").length;
        const renderedListItems = new Set(Array.from(container.querySelectorAll(".region-map-country")).map(path=>path.dataset.regionItem));
        const listPatterns = container.querySelectorAll("pattern[id^='region-flag-fill']").length;
        const solvedPath = Array.from(container.querySelectorAll(".region-map-country"))
          .find(path=>path.dataset.regionItem === targetName);
        const solvedFill = solvedPath ? solvedPath.style.fill : "";

        await RegionMap.renderFocus(container, groupKey, targetName, {
          solved:[targetName],
          showCaption:false,
          showCapitalMarker:true
        });
        const focusPaths = container.querySelectorAll(".region-map-country").length;
        const targetPaths = container.querySelectorAll(".region-map-country.is-target").length;
        const outlines = container.querySelectorAll(".region-map-target-outline").length;
        const capitalMarkers = container.querySelectorAll(".region-map-capital-marker").length;
        const renderedFocusItems = new Set(Array.from(container.querySelectorAll(".region-map-country")).map(path=>path.dataset.regionItem));

        const errors = [];
        if(listPaths !== itemNames.length) errors.push(`list paths ${listPaths}/${itemNames.length}; missing ${itemNames.filter(item=>!renderedListItems.has(item)).join(", ")}`);
        if(listPatterns !== flaggedItems.length) errors.push(`flag patterns ${listPatterns}/${flaggedItems.length}`);
        if(flaggedItems.some(item=>item.name === targetName) && !solvedFill.includes("url(")) errors.push("solved flagged item did not receive a flag fill");
        if(!flaggedItems.some(item=>item.name === targetName) && !solvedPath.classList.contains("is-solved-unflagged")) errors.push("solved unflagged item did not receive fallback fill");
        if(focusPaths !== itemNames.length) errors.push(`focus paths ${focusPaths}/${itemNames.length}; missing ${itemNames.filter(item=>!renderedFocusItems.has(item)).join(", ")}`);
        if(targetPaths !== 1) errors.push(`target paths ${targetPaths}`);
        if(outlines !== 2) errors.push(`target outlines ${outlines}`);
        if(capitalMarkers !== 1) errors.push(`capital markers ${capitalMarkers}`);
        if(errors.length){
          failures.push({groupKey, errors});
        }
      }catch(error){
        failures.push({groupKey, errors:[error.message || String(error)]});
      }
    }

    container.remove();
    return {checked:groups.length, failures};
  });
}

async function main(){
  const {server, baseUrl} = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", error=>pageErrors.push(error.message));
  page.on("console", message=>{
    if(message.type() === "error") consoleErrors.push(message.text());
  });
  await page.route(/supabase\.co/, route=>route.fulfill({
    status:200,
    contentType:"application/json",
    body:"[]"
  }));

  try{
    await page.goto(`${baseUrl}/game.html`);
    const result = await checkRegionMaps(page);
    if(pageErrors.length || consoleErrors.length || result.failures.length){
      console.error(JSON.stringify({
        pageErrors,
        consoleErrors,
        ...result
      }, null, 2));
      process.exitCode = 1;
    }else{
      console.log(`Regional map check passed: ${result.checked} maps rendered with flag fills, target outlines, and capital markers.`);
    }
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}

main().catch(error=>{
  console.error(error);
  process.exit(1);
});
