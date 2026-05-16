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
