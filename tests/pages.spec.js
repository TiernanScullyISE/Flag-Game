const {test, expect} = require("@playwright/test");

const pages = [
  ["home", "/index.html", "Flag & Capital Quiz"],
  ["play", "/game.html", "Practise with lives"],
  ["leaderboard", "/leaderboard.html", "Fastest WPM"],
  ["revision", "/revise.html", "Revision"],
  ["all countries", "/view.html", "Browse every country"],
  ["admin", "/admin.html", "Admin password"]
];

test.beforeEach(async ({page})=>{
  await page.route(/supabase\.co/, route=>{
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]"
    });
  });
});

for(const [name, url, expectedText] of pages){
  test(`${name} page renders`, async ({page})=>{
    const pageErrors = [];
    page.on("pageerror", error=>pageErrors.push(error.message));

    await page.goto(url);
    await expect(page.locator("body")).toContainText(expectedText);
    expect(pageErrors).toEqual([]);
  });
}

test("play page switches quiz modes", async ({page})=>{
  await page.goto("/game.html");
  await page.getByRole("button", {name:"Capital Quiz"}).click();
  await expect(page.locator("#country-label")).toBeVisible();

  await page.getByRole("button", {name:"Speedrun"}).click();
  await expect(page.locator("#timer-value")).toHaveText("0:00.0");
});

test("leaderboard page lists regional boards and searches categories", async ({page})=>{
  await page.goto("/leaderboard.html");
  await expect(page.locator("#leaderboard-scope")).toHaveValue("all");
  await expect(page.locator("#leaderboard-page-status")).toContainText("region boards");

  await page.locator("#leaderboard-search").fill("Ireland");
  await expect(page.locator("#leaderboard-page-grid")).toContainText("Ireland");
  await expect(page.locator(".leaderboard-category-card.is-region-board").first()).toBeVisible();

  await page.locator("#leaderboard-search").fill("United States");
  await expect(page.locator("#leaderboard-page-grid")).toContainText("United States");
});

test("admin review cards explain pending reasons", async ({page})=>{
  await page.goto("/admin.html");
  await page.evaluate(()=>{
    const sample = {
      id: 99,
      status: "pending",
      mode_key: "regions_flags_ireland_hard_all",
      game_scope: "regions",
      set_label: "Ireland",
      continent: "Ireland",
      which: "flags",
      target_label: "All",
      player_name: "Runner",
      time_ms: 55000,
      correct_first_try: 31,
      total: 32,
      verified: true,
      anti_cheat: {score: 86},
      review_reasons: ["very-fast-average", "focus-loss"],
      route: [
        {index:1, country:"Antrim", continent:"Ireland", solvedMs:900, attempts:1}
      ],
      created_at: new Date().toISOString()
    };
    document.getElementById("admin-list").appendChild(renderAdminRun(sample));
  });

  await expect(page.locator(".admin-review-panel")).toContainText("2 reasons pending review");
  await expect(page.locator(".admin-review-panel")).toContainText("Very fast average");
  await expect(page.locator(".admin-review-panel")).toContainText("Focus changed");
});

test("play page supports regional county and state sets", async ({page})=>{
  await page.goto("/game.html");
  await page.getByRole("button", {name:"Regions"}).click();

  await expect(page.locator("#region-set-input")).toHaveValue("Ireland");
  await expect(page.getByRole("button", {name:"Flags"})).toBeVisible();
  await expect(page.getByRole("button", {name:"Towns"})).toBeVisible();
  await expect(page.getByRole("button", {name:"Map"})).toBeVisible();

  await page.locator("#region-set-input").fill("usa");
  await page.locator("#region-set-input").press("Enter");
  await expect(page.locator("#region-set-input")).toHaveValue("United States");
  await expect(page.getByRole("button", {name:"Flags"})).toBeVisible();
  await expect(page.getByRole("button", {name:"Capitals"})).toBeVisible();
  await expect(page.getByRole("button", {name:"Map"})).toBeVisible();

  const generated = await page.evaluate(()=>({
    groupCount: REGION_GAME_GROUP_ORDER.length,
    argentina: REGION_GAME_GROUPS.Argentina.items.length,
    afghanistan: REGION_GAME_GROUPS.Afghanistan.items.length,
    belarus: REGION_GAME_GROUPS.Belarus.items.length,
    belgium: REGION_GAME_GROUPS.Belgium.items.length,
    bhutan: REGION_GAME_GROUPS.Bhutan.items.length,
    bhutanFlagCoverage: REGION_GAME_GROUPS.Bhutan.flagCoverage,
    bhutanHasThimphu: REGION_GAME_GROUPS.Bhutan.items.some(item=>item.name === "Thimphu" && item.capital === "Thimphu"),
    bhutanHasCapitalCoords: REGION_GAME_GROUPS.Bhutan.items.some(item=>Array.isArray(item.capitalCoordinates)),
    bhutanFeatureAlias: REGION_GAME_GROUPS.Bhutan.map.featureAliases.Thimpu,
    bosniaAndHerzegovina: REGION_GAME_GROUPS["Bosnia and Herzegovina"].items.length,
    brazil: REGION_GAME_GROUPS.Brazil.items.length,
    canada: REGION_GAME_GROUPS.Canada.items.length,
    colombia: REGION_GAME_GROUPS.Colombia.items.length,
    croatia: REGION_GAME_GROUPS.Croatia.items.length,
    czechia: REGION_GAME_GROUPS.Czechia.items.length,
    ecuador: REGION_GAME_GROUPS.Ecuador.items.length,
    england: REGION_GAME_GROUPS.England.items.length,
    germany: REGION_GAME_GROUPS.Germany.items.length,
    estonia: REGION_GAME_GROUPS.Estonia.items.length,
    india: REGION_GAME_GROUPS.India.items.length,
    kosovo: REGION_GAME_GROUPS.Kosovo.items.length,
    malaysia: REGION_GAME_GROUPS.Malaysia.items.length,
    mongolia: REGION_GAME_GROUPS.Mongolia.items.length,
    netherlands: REGION_GAME_GROUPS.Netherlands.items.length,
    peru: REGION_GAME_GROUPS.Peru.items.length,
    paraguay: REGION_GAME_GROUPS.Paraguay.items.length,
    russia: REGION_GAME_GROUPS.Russia.items.length,
    scotland: REGION_GAME_GROUPS.Scotland.items.length,
    solomonIslands: REGION_GAME_GROUPS["Solomon Islands"].items.length,
    southAfrica: REGION_GAME_GROUPS["South Africa"].items.length,
    southSudan: REGION_GAME_GROUPS["South Sudan"].items.length,
    spain: REGION_GAME_GROUPS.Spain.items.length,
    thailand: REGION_GAME_GROUPS.Thailand.items.length,
    ukraine: REGION_GAME_GROUPS.Ukraine.items.length,
    unitedKingdom: REGION_GAME_GROUPS["United Kingdom"].items.length,
    wales: REGION_GAME_GROUPS.Wales.items.length
  }));
  expect(generated.groupCount).toBeGreaterThanOrEqual(199);
  expect(generated).toMatchObject({
    afghanistan: 34,
    argentina: 24,
    belarus: 7,
    belgium: 3,
    bhutan: 20,
    bhutanHasThimphu: true,
    bhutanHasCapitalCoords: true,
    bhutanFeatureAlias: "Thimphu",
    bosniaAndHerzegovina: 3,
    brazil: 27,
    canada: 13,
    colombia: 33,
    croatia: 21,
    czechia: 14,
    ecuador: 24,
    england: 47,
    germany: 16,
    estonia: 15,
    india: 36,
    kosovo: 7,
    malaysia: 16,
    mongolia: 22,
    netherlands: 12,
    peru: 25,
    paraguay: 18,
    russia: 83,
    scotland: 12,
    solomonIslands: 10,
    southAfrica: 9,
    southSudan: 10,
    spain: 19,
    thailand: 77,
    ukraine: 27,
    unitedKingdom: 4,
    wales: 8
  });

  await page.locator("#region-set-input").fill("Brazil");
  await page.locator("#region-set-input").press("Enter");
  await expect(page.locator("#region-set-input")).toHaveValue("Brazil");
  await expect(page.getByRole("button", {name:"Map"})).toBeVisible();

  await page.locator("#region-set-input").fill("Bhutan");
  await page.locator("#region-set-input").press("Enter");
  await expect(page.locator("#region-set-input")).toHaveValue("Bhutan");
  await expect(page.getByRole("button", {name:"Flags"})).toBeEnabled();
  await expect(page.getByRole("button", {name:"Flags"})).toHaveClass(/active/);
  await expect(page.locator("#question-visual img")).toBeVisible();
  await expect(page.locator("#question-visual .flag-fallback")).toHaveCount(0);
  expect(generated.bhutanFlagCoverage).toMatchObject({
    available: 20,
    total: 20,
    verified: 0,
    generated: 20
  });

  await page.getByRole("button", {name:"Capitals"}).click();
  await expect(page.locator("#question-visual .region-map-capital-marker")).toHaveCount(1);
  await expect(page.locator("#question-visual .region-map-capital-label")).toHaveCount(0);
});

test("Irish regional Gaeilge set requires correct fadas", async ({page})=>{
  await page.goto("/game.html");
  const result = await page.evaluate(()=>{
    state.gameScope = "regions";
    state.selectedRegionGroup = "Ireland as Gaeilge";
    const withFadas = getRegionAnswerIndex("Ireland as Gaeilge").get(normaliseRegionAnswer("dún na ngall", "Ireland as Gaeilge")) || "";
    const withoutFadas = getRegionAnswerIndex("Ireland as Gaeilge").get(normaliseRegionAnswer("dun na ngall", "Ireland as Gaeilge")) || "";
    const townCaseInsensitive = normaliseRegionAnswer("cúil raithin", "Ireland as Gaeilge") === normaliseRegionAnswer("Cúil Raithin", "Ireland as Gaeilge");
    return {withFadas, withoutFadas, townCaseInsensitive};
  });

  expect(result).toEqual({
    withFadas: "Dún na nGall",
    withoutFadas: "",
    townCaseInsensitive: true
  });
});

test("revision page shows saved regional items", async ({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem("revise_region_flags", JSON.stringify({Ireland:["Tipperary"]}));
    localStorage.setItem("revise_region_capitals", JSON.stringify({Ireland:["Tipperary"]}));
  });
  await page.goto("/revise.html");
  await page.getByRole("button", {name:"Regions"}).click();

  await expect(page.locator("#revise-region-set-input")).toHaveValue("Ireland");
  await expect(page.locator("#revise-list")).toContainText("Tipperary");
  await expect(page.locator("#revise-list")).toContainText("County town: Clonmel");

  await page.getByLabel("Flags Revise").check();
  await expect(page.locator("#revise-list")).toContainText("Tipperary");
});

test("revision page shows saved Gaeilge county items", async ({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem("revise_region_flags", JSON.stringify({"Ireland as Gaeilge":["Dún na nGall"]}));
    localStorage.setItem("revise_region_capitals", JSON.stringify({"Ireland as Gaeilge":["Dún na nGall"]}));
  });
  await page.goto("/revise.html");
  await page.getByRole("button", {name:"Regions"}).click();
  await page.locator("#revise-region-set-input").fill("Ireland as Gaeilge");
  await page.locator("#revise-region-set-input").press("Enter");

  await expect(page.locator("#revise-region-set-input")).toHaveValue("Ireland as Gaeilge");
  await expect(page.locator("#revise-list")).toContainText("Dún na nGall");
  await expect(page.locator("#revise-list")).toContainText("County town: Leifear");
});
