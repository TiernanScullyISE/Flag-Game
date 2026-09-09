const {test, expect} = require("@playwright/test");
const {execFileSync} = require("node:child_process");
const path = require("node:path");

const pages = ["index", "game", "leaderboard", "revise", "view", "feedback", "admin"];
test.beforeEach(async ({page})=>{
  await page.route(/supabase\.co/, route=>route.fulfill({json:[]}));
});

for(const theme of ["dark", "light"]){
  for(const width of [320, 390, 768, 1440]){
    test(`${theme} pages fit a ${width}px viewport`, async ({page}, testInfo)=>{
      await page.setViewportSize({width, height:900});
      await page.addInitScript(value=>localStorage.setItem("flagGameTheme", value), theme);
      const errors = [];
      page.on("pageerror", error=>errors.push(error.message));
      for(const name of pages){
        await page.goto(`/${name}.html`);
        await expect(page.locator("h1")).toBeVisible();
        const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth + 1);
        expect(overflow, `${name}: horizontal overflow`).toBe(false);
        await expect(page.locator('.skip-link')).toHaveAttribute("href", "#main-content");
        if(["index", "game"].includes(name) && [390,1440].includes(width)){
          await page.screenshot({path:testInfo.outputPath(`${name}.png`), fullPage:true});
        }
      }
      expect(errors).toEqual([]);
    });
  }
}

test("pledge contains focus, cancels safely and stays acknowledged for the tab session", async ({page})=>{
  await page.goto("/game.html");
  const speedrun = page.getByRole("button", {name:"Speedrun", exact:true});
  await speedrun.click();
  await expect(page.locator("#speedrun-oath-ack")).toBeFocused();
  await expect(page.locator("main")).toHaveJSProperty("inert", true);
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#speedrun-oath-cancel")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#speedrun-oath-ack")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(speedrun).toBeFocused();
  await expect(page.locator("body")).toHaveAttribute("data-play-mode", "practice");
  await expect(page.locator("main")).toHaveJSProperty("inert", false);
  await speedrun.click();
  await page.locator("#speedrun-oath-ack").check();
  await page.locator("#speedrun-oath-agree").click();
  await expect(page.locator("body")).toHaveAttribute("data-play-mode", "speedrun");
  await page.reload();
  await speedrun.click();
  await expect(page.locator("#speedrun-oath-modal")).not.toHaveClass(/is-visible/);
  await expect(page.locator("body")).toHaveAttribute("data-play-mode", "speedrun");
});

test("result dialog contains focus and closes with Escape", async ({page})=>{
  await page.goto("/game.html");
  await page.locator("#giveup-btn").click();
  await expect(page.locator("#result-modal")).toHaveClass(/is-visible/);
  await expect(page.locator("#result-retry")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#result-close")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#result-modal")).not.toHaveClass(/is-visible/);
  await expect(page.locator("main")).toHaveJSProperty("inert", false);
});

test("all result formatters preserve milliseconds and handle invalid values", async ({page})=>{
  for(const [file, formatter] of [["game","formatTime"],["leaderboard","formatLeaderboardTime"],["admin","formatAdminTime"]]){
    await page.goto(`/${file}.html`);
    const values = await page.evaluate(name=>[376669,60000,999,0,-1,NaN,Infinity].map(window[name]), formatter);
    expect(values).toEqual(["6:16.669","1:00.000","0:00.999","0:00.000","0:00.000","0:00.000","0:00.000"]);
  }
});

test("browse filters do not mix stale cards after rapid mode switches", async ({page})=>{
  await page.goto("/view.html");
  await page.locator("#browse-search").fill("Paris");
  await page.getByLabel("Capitals", {exact:true}).check();
  await expect(page.locator("#grid .card")).toHaveCount(1);
  await expect(page.locator("#grid")).toContainText("France");
  await expect(page.locator("#grid")).toContainText("Paris");
  await page.locator("#browse-search").fill("no-matching-country");
  await expect(page.locator("#grid .card")).toHaveCount(0);
  await expect(page.locator("#grid")).toContainText("No countries match");
});

test("desktop import merges once and preserves stronger existing records", async ({page})=>{
  const script = execFileSync("python", ["-c", "from desktop_app import migration_script; print(migration_script({'revise_flags':['France'],'high_scores':{'countries_flags_all_hard_unlimited':36}}))"], {cwd:path.resolve(__dirname,".."),encoding:"utf8"}).trim();
  await page.goto("/index.html");
  await page.evaluate(()=>{
    localStorage.setItem("revise_flags", '["Ireland"]');
    localStorage.setItem("high_scores", '{"countries_flags_all_hard_unlimited":40}');
  });
  expect(await page.evaluate(script)).toBe(true);
  expect(await page.evaluate(script)).toBe(false);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("revise_flags")))).toEqual(["Ireland","France"]);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("high_scores")))).toEqual({countries_flags_all_hard_unlimited:40});
});

for(const theme of ["dark", "light"]){
  test(`${theme} pages and pledge pass automated accessibility checks`, async ({page})=>{
    test.setTimeout(60000);
    const {default:AxeBuilder} = require("@axe-core/playwright");
    await page.addInitScript(value=>localStorage.setItem("flagGameTheme", value), theme);
    for(const name of pages){
      await page.goto(`/${name}.html`);
      const result = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
      expect(result.violations, `${name}: accessibility violations`).toEqual([]);
    }
    await page.goto("/game.html");
    await page.getByRole("button", {name:"Speedrun",exact:true}).click();
    const result = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
  });
}
