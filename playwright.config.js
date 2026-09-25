const {defineConfig} = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  globalSetup: process.env.SONAR_COVERAGE ? "./scripts/prepare-browser-coverage.js" : undefined,
  globalTeardown: process.env.SONAR_COVERAGE ? "./scripts/write-browser-coverage.js" : undefined,
  use: {
    baseURL: "http://127.0.0.1:8000"
  },
  webServer: {
    command: "python -m http.server 8000 --bind 127.0.0.1",
    url: "http://127.0.0.1:8000/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 10000
  }
});
