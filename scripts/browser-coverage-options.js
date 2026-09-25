const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:8000";
const DATA_FILES = new Set([
  "/data.js", "/regions-data.js", "/regions-generated-data.js",
  "/regions-leaderboard-data.js", "/typing-data.js", "/typing-passages.js",
  "/leaderboard-config.js", "/world-map-config.js"
]);

module.exports = {
  outputDir: path.join(ROOT, "coverage-reports", "browser"),
  reports: ["lcovonly"],
  entryFilter: entry=>{
    if(!entry.url.startsWith(`${ORIGIN}/`)) return false;
    const pathname = new URL(entry.url).pathname;
    return pathname.endsWith(".js") && !DATA_FILES.has(pathname);
  },
  sourcePath: filePath=>{
    if(filePath.startsWith(`${ORIGIN}/`)){
      return path.join(ROOT, decodeURIComponent(new URL(filePath).pathname));
    }
    // The reporter rewrites URL query strings as path segments before this hook.
    const localScript = filePath.match(/^127\.0\.0\.1-8000\/(.+?\.js)(?:\/.*)?$/);
    if(localScript) return path.join(ROOT, localScript[1]);
    return filePath;
  }
};
