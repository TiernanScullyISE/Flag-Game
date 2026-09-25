const fs = require("node:fs");
const options = require("./browser-coverage-options");

module.exports = async()=>{
  fs.rmSync(options.outputDir, {recursive:true, force:true});
};
