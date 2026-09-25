const fs = require("node:fs");
const path = require("node:path");
const MCR = require("monocart-coverage-reports");
const options = require("./browser-coverage-options");

module.exports = async()=>{
  await MCR(options).generate();
  const report = path.join(options.outputDir, "lcov.info");
  if(!fs.existsSync(report) || !fs.readFileSync(report, "utf8").includes("SF:")){
    throw new Error("Browser coverage report is empty.");
  }
};
