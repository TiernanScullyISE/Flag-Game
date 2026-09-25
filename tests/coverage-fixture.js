const {test: base, expect} = require("@playwright/test");
const MCR = require("monocart-coverage-reports");
const options = require("../scripts/browser-coverage-options");

const test = base.extend({
  page: async ({page}, use)=>{
    if(!process.env.SONAR_COVERAGE){
      await use(page);
      return;
    }
    await page.coverage.startJSCoverage({resetOnNavigation:false});
    try{
      await use(page);
    }finally{
      const entries = await page.coverage.stopJSCoverage();
      if(entries.length) await MCR(options).add(entries);
    }
  }
});

module.exports = {test, expect};
