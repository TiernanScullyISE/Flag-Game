const {test, expect} = require("./coverage-fixture");

const pages = [
  ["site root", "/", "Practise with lives"],
  ["play", "/game.html", "Practise with lives"],
  ["leaderboard", "/leaderboard.html", "Fastest WPM"],
  ["revision", "/revise.html", "Revision"],
  ["all countries", "/view.html", "Browse every country"],
  ["feedback", "/feedback.html", "Share feedback"],
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

test("site root and index open the game", async ({page})=>{
  for(const path of ["/", "/index.html"]){
    await page.goto(path);
    await expect(page).toHaveURL(/\/game\.html$/);
    await expect(page.getByRole("heading", {level:1})).toContainText("Practise with lives");
  }
});

test("play page switches quiz modes", async ({page})=>{
  await page.goto("/game.html");
  await page.getByRole("button", {name:"Capital Quiz"}).click();
  await expect(page.locator("#country-label")).toBeVisible({timeout:15000});

  await page.getByRole("button", {name:"Speedrun"}).click();
  await expect(page.locator("#speedrun-oath-modal")).toHaveClass(/is-visible/);
  await expect(page.getByRole("button", {name:"I agree and start Speedrun"})).toBeDisabled();
  await page.locator("#speedrun-oath-ack").check();
  await page.getByRole("button", {name:"I agree and start Speedrun"}).click();
  await expect.poll(()=>page.evaluate(()=>state.session.speedRun.started), {timeout:15000}).toBe(false);
  await expect(page.locator("#answer-input")).toBeEnabled({timeout:15000});
  await page.locator("#answer-input").pressSequentially("a");
  await expect.poll(()=>page.evaluate(()=>state.session.speedRun.started), {timeout:15000}).toBe(true);
  await expect(page.locator("#timer-value")).toBeVisible();
});

test("mobile typing keeps the question visual and compact answer controls in view", async ({page})=>{
  await page.setViewportSize({width:390, height:844});
  await page.goto("/game.html");
  await page.locator("#hard-toggle").check();

  await page.evaluate(()=>{
    Object.defineProperty(window.visualViewport, "height", {
      configurable: true,
      value: 420
    });
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("body")).toHaveClass(/mobile-answer-active/);

  const layout = await page.evaluate(()=>{
    const quiz = document.querySelector(".quiz-card").getBoundingClientRect();
    const visual = document.querySelector("#question-visual").getBoundingClientRect();
    const input = document.querySelector("#answer-input").getBoundingClientRect();
    const controls = document.querySelector(".answer-control-row").getBoundingClientRect();
    return {
      quizTop: quiz.top,
      quizBottom: quiz.bottom,
      visualTop: visual.top,
      visualBottom: visual.bottom,
      visualHeight: visual.height,
      inputTop: input.top,
      inputBottom: input.bottom,
      inputHeight: input.height,
      controlsHeight: controls.height
    };
  });

  expect(layout.visualTop).toBeGreaterThanOrEqual(0);
  expect(layout.visualHeight).toBeGreaterThanOrEqual(190);
  expect(layout.visualBottom).toBeLessThan(layout.inputTop);
  expect(layout.inputHeight).toBeLessThanOrEqual(52);
  expect(layout.controlsHeight).toBeLessThanOrEqual(110);
  expect(layout.inputBottom).toBeLessThanOrEqual(layout.quizTop + 420);
  expect(layout.quizBottom).toBeLessThanOrEqual(layout.quizTop + 420);
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

test("leaderboard page exposes filterable typing record tables", async ({page})=>{
  await page.goto("/leaderboard.html");
  await expect(page.locator("#typing-leaderboards")).toBeVisible();
  await expect(page.locator("#typing-leaderboards-grid .typing-leaderboard-card")).toHaveCount(46);
  await page.locator("#typing-leaderboard-mode").selectOption("passage");
  await expect(page.locator("#typing-leaderboards-grid .typing-leaderboard-card")).toHaveCount(16);
  await expect(page.locator("#typing-leaderboards-grid")).toContainText("As You Like It · Act II, Scene VII");
  await expect(page.locator("#typing-leaderboards-grid")).toContainText("Bill Gates Challenge");
  await page.locator("#typing-leaderboard-language").selectOption("python");
  await expect(page.locator("#typing-leaderboards-grid .typing-leaderboard-card")).toHaveCount(3);
  await expect(page.locator("#typing-leaderboard-mode option[value='alphabet']")).toBeHidden();
  await page.locator("#leaderboard-mode").selectOption("typing");
  await expect(page.locator("body")).toHaveAttribute("data-leaderboard-view","typing");
  await expect(page.locator("#leaderboard-page-grid")).toBeHidden();
});

test("posted leaderboard run remains searchable and shows its split details", async ({page})=>{
  await page.goto("/leaderboard.html");
  await expect(page.locator("#leaderboard-refresh")).toBeEnabled();
  await page.evaluate(()=>{
    const category = leaderboardPageState.categories.find(item=>item.gameScope === "countries" && item.which === "flags");
    const run = {
      modeKey:category.key,
      gameScope:"countries",
      which:"flags",
      playerName:"Coverage Runner",
      timeMs:15000,
      correct:10,
      total:10,
      date:"2026-09-28T12:00:00Z",
      splits:{10:15000,all:15000}
    };
    leaderboardPageState.loading = false;
    leaderboardPageState.error = "";
    leaderboardPageState.allRuns = [run];
    leaderboardPageState.runsByKey = new Map([[category.key,[run]]]);
    renderLeaderboardPage();
  });
  await page.locator("#leaderboard-with-scores").check();
  await expect(page.locator("#leaderboard-page-grid .leaderboard-run-details")).toHaveCount(1);
  await expect(page.locator("#leaderboard-page-grid")).toContainText("Coverage Runner");
  await page.locator("#leaderboard-page-grid .leaderboard-run-details summary").click();
  await expect(page.locator("#leaderboard-page-grid")).toContainText("First 10: 0:15.000");
  await page.locator("#leaderboard-search").fill("Coverage Runner");
  await expect(page.locator("#leaderboard-page-grid .leaderboard-run-details")).toHaveCount(1);
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
      anti_cheat: {
        score: 86,
        crossRun: {
          fingerprintMatches: 1,
          routeOrderMatches: 1,
          timingReplayMatches: 1,
          timingReplayRunIds: [42],
          recentServerClientNames: 3,
          serverClientBurstRuns: 6
        }
      },
      review_reasons: ["name-review", "timing-review", "reused-run-evidence", "rapid-identity-switching",
        "mechanical-answer-timing", "uniform-solve-timing", "replayed-timing-pattern", "cross-run-check-unavailable"],
      route: [
        {index:1, country:"Antrim", continent:"Ireland", solvedMs:900, attempts:1}
      ],
      created_at: new Date().toISOString()
    };
    document.getElementById("admin-list").appendChild(renderAdminRun(sample));
  });

  await expect(page.locator(".admin-review-panel")).toContainText("8 reasons pending review");
  await expect(page.locator(".admin-review-panel")).toContainText("Name review");
  await expect(page.locator(".admin-review-panel")).toContainText("Server review check");
  await expect(page.locator(".admin-review-panel")).toContainText("Cross-run review");
  await expect(page.locator(".admin-review-panel")).toContainText("Check whether the device is shared before deciding");
  await expect(page.locator(".admin-run-card")).toContainText("Reused evidence: 1");
  await expect(page.locator(".admin-run-card")).toContainText("Recent client names: 3");
  await expect(page.locator(".admin-run-card")).toContainText("Earlier matching runs: #42");
  await expect(page.locator(".admin-review-panel")).toContainText("a single fast answer does not trigger this check");
  await expect(page.locator(".admin-review-panel")).toContainText("held for review, not rejected or labelled as cheating");
});

test("admin run filters include approved, pending and rejected records", async ({page})=>{
  await page.goto("/admin.html");
  await page.evaluate(()=>{
    const base = {
      mode_key: "flags_All_hard_10",
      game_scope: "countries",
      set_label: "All",
      continent: "All",
      which: "flags",
      target_label: "First 10",
      time_ms: 20000,
      correct_first_try: 10,
      total: 10,
      verified: true,
      review_reasons: [],
      route: [],
      created_at: new Date().toISOString()
    };
    currentAdminRuns = [
      {...base, id:1, status:"pending", player_name:"Pending Runner"},
      {...base, id:2, status:"approved", player_name:"Approved Runner"},
      {...base, id:3, status:"rejected", player_name:"Rejected Runner", time_ms:21000}
    ];
    currentAdminView = "runs";
    document.getElementById("admin-tools").hidden = false;
    document.getElementById("admin-run-age-filter").value = "all";
    document.getElementById("admin-run-status-filter").value = "all";
    renderFilteredAdminRuns();
  });

  await expect(page.locator(".admin-run-card")).toHaveCount(3);
  await page.locator("#admin-run-duplicates-only").check();
  await expect(page.locator(".admin-run-card")).toHaveCount(2);
  await page.locator("#admin-run-duplicates-only").uncheck();
  await page.locator("#admin-run-status-filter").selectOption("rejected");
  await expect(page.locator(".admin-run-card")).toHaveCount(1);
  await expect(page.locator(".admin-run-card")).toContainText("Rejected Runner");
});

test("admin moderation updates locally without reloading the run list", async ({page})=>{
  await page.unroute(/supabase\.co/);
  let listRequests = 0;
  await page.route("**/functions/v1/admin-leaderboard", async route=>{
    const request = JSON.parse(route.request().postData() || "{}");
    const base = {
      id:44,
      status:"pending",
      player_name:"Runner",
      mode_key:"flags_All_hard_10",
      game_scope:"countries",
      set_label:"All",
      continent:"All",
      which:"flags",
      target_label:"First 10",
      time_ms:20000,
      correct_first_try:10,
      total:10,
      verified:true,
      review_reasons:["manual-approval-required"],
      route:[],
      created_at:new Date().toISOString()
    };
    if(request.action === "list"){
      listRequests += 1;
      await route.fulfill({status:200, contentType:"application/json", body:JSON.stringify({runs:[base]})});
      return;
    }
    await route.fulfill({
      status:200,
      contentType:"application/json",
      body:JSON.stringify({run:{...base, status:"rejected", reviewed_at:new Date().toISOString()}})
    });
  });

  await page.goto("/admin.html");
  await page.locator("#admin-password").fill("test-password");
  await page.locator("#admin-load").click();
  await page.locator("#admin-run-age-filter").selectOption("all");
  await page.locator("#admin-run-status-filter").selectOption("all");
  await page.getByRole("button", {name:"Reject", exact:true}).click();

  await expect(page.locator("#admin-status")).toContainText("No queue reload was needed");
  await expect(page.locator(".admin-run-card")).toHaveClass(/is-rejected/);
  expect(listRequests).toBe(1);
});

test("admin analytics presents a completed run and country-level learning data", async ({page})=>{
  await page.goto("/admin.html");
  await page.evaluate(()=>renderAnalytics([{
    clientRunId:"test-run",
    playerName:"Runner",
    playerId:"test-device",
    gameScope:"countries",
    mode:"flags",
    region:"Europe",
    target:"10",
    totalDurationMs:12000,
    totalQuestions:1,
    solvedCount:1,
    firstTryCorrectCount:1,
    completedAt:"2026-09-28T12:00:00Z",
    questionAnalytics:[{
      country:"France",
      continent:"Europe",
      canonicalAnswer:"France",
      rawFinalInput:"France",
      attempts:[{rawInput:"France",correct:true}],
      attemptsCount:1,
      finalSolveMs:1200,
      recognitionMs:400,
      activeTypingMs:500,
      typedChars:6,
      canonicalChars:6,
      firstTry:true
    }]
  }]));
  await expect(page.locator("#admin-list")).toContainText("Private device tracking");
  await expect(page.locator("#admin-list")).toContainText("1 analytics runs");
  await expect(page.locator("#admin-list")).toContainText("Runner");
  await expect(page.locator("#admin-list")).toContainText("France");
  await expect(page.locator("#admin-list")).toContainText("Automatic analysis");
});

test("feedback form submits to configured endpoint", async ({page})=>{
  let requestBody = null;
  await page.route("**/functions/v1/submit-feedback", async route=>{
    requestBody = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ok:true})
    });
  });

  await page.goto("/feedback.html");
  await page.locator("#feedback-name").fill("Tester");
  await page.locator("#feedback-page").fill("Speedrun");
  await page.locator("#feedback-message").fill("Please add a way to practise only island countries.");
  await page.getByRole("button", {name:"Submit feedback"}).click();

  await expect(page.locator("#feedback-status")).toContainText("Feedback submitted");
  expect(requestBody).toMatchObject({
    category: "suggestion",
    name: "Tester",
    pageUrl: "Speedrun",
    message: "Please add a way to practise only island countries."
  });
});

test("admin feedback cards can select all and copy selected items", async ({page})=>{
  await page.goto("/admin.html");
  await page.evaluate(()=>{
    window.__copiedFeedback = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async text=>{ window.__copiedFeedback = text; }
      }
    });
    renderFeedbackSubmissions([
      {
        id: 7,
        created_at: "2026-07-10T10:00:00Z",
        category: "suggestion",
        name: "Player",
        page_url: "Revision",
        message: "Add a filter for weak countries."
      },
      {
        id: 8,
        created_at: "2026-07-10T11:00:00Z",
        category: "data",
        name: "",
        page_url: "All",
        message: "Check the capital spelling for one item."
      }
    ]);
  });

  await page.locator("#admin-feedback-select-all").check();
  await page.getByRole("button", {name:"Copy selected"}).click();

  await expect(page.locator("#admin-status")).toContainText("Copied 2 feedback items");
  const copied = await page.evaluate(()=>window.__copiedFeedback);
  expect(copied).toContain("Feedback #7");
  expect(copied).toContain("Add a filter for weak countries.");
  expect(copied).toContain("Feedback #8");
});

test("play page supports regional county and state sets", async ({page})=>{
  const bhutanItems = require("../regions-data.js").REGION_GAME_GROUPS.Bhutan.items;
  const bhutanMap = {
    type:"FeatureCollection",
    features:bhutanItems.map((item,index)=>{
      const west = 89 + (index % 5) * 0.6;
      const south = 26 + Math.floor(index / 5) * 0.6;
      return {
        type:"Feature",
        properties:{shapeName:item.name,shapeISO:item.isoCodes?.[0] || ""},
        geometry:{type:"Polygon",coordinates:[[[west,south],[west+0.45,south],[west+0.45,south+0.45],[west,south+0.45],[west,south]]]}
      };
    })
  };
  await page.route("**/geoBoundaries-BTN-ADM1_simplified.geojson",route=>route.fulfill({
    status:200,
    contentType:"application/geo+json",
    headers:{"Access-Control-Allow-Origin":"*"},
    body:JSON.stringify(bhutanMap)
  }));
  await page.goto("/game.html");
  await page.getByRole("button", {name:"Regions"}).click();

  await expect(page.locator("#region-set-input")).toHaveValue("Ireland");
  await expect(page.getByRole("button", {name:"Flags"})).toBeVisible();
  await expect(page.getByRole("button", {name:"Towns"})).toBeVisible();
  await expect(page.getByRole("button", {name:"Map", exact:true})).toBeVisible();

  await page.locator("#region-set-input").fill("usa");
  await page.locator("#region-set-input").press("Enter");
  await expect(page.locator("#region-set-input")).toHaveValue("United States");
  await expect(page.getByRole("button", {name:"Flags"})).toBeVisible();
  await expect(page.getByRole("button", {name:"Capitals"})).toBeVisible();
  await expect(page.getByRole("button", {name:"Map", exact:true})).toBeVisible();

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
  await expect(page.getByRole("button", {name:"Map", exact:true})).toBeVisible();

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
  await expect(page.locator("#question-visual .region-map-capital-marker")).toHaveCount(1, {timeout:15000});
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

test("correct speedrun answer locks skip until the next flag loads", async ({page})=>{
  await page.goto("/game.html");

  const duringAdvance = await page.evaluate(()=>{
    state.playMode = "speedrun";
    state.gameScope = "countries";
    state.which = "flags";
    state.hard = true;
    state.session = makeSession();
    state.session.pool = ["France", "Germany"];
    state.session.correctCountry = "France";
    state.session.correctAnswer = "France";
    recordRouteQuestion("France");

    handleCorrect(true);
    const snapshot = {
      answerDisabled: answerInput.disabled,
      nextDisabled: nextBtn.disabled,
      pendingAdvance: state.session.pendingAdvance,
      routeLength: state.session.route.length,
      solved: state.session.solved.size
    };
    nextQuestion();
    return {
      ...snapshot,
      routeLengthAfterNext: state.session.route.length,
      currentAfterNext: state.session.correctCountry
    };
  });

  expect(duringAdvance).toMatchObject({
    answerDisabled: true,
    nextDisabled: true,
    pendingAdvance: true,
    routeLength: 1,
    solved: 1,
    routeLengthAfterNext: 1,
    currentAfterNext: "France"
  });

  await page.waitForTimeout(150);
  const afterAdvance = await page.evaluate(()=>({
    pendingAdvance: state.session.pendingAdvance,
    routeLength: state.session.route.length,
    currentCountry: state.session.correctCountry
  }));

  expect(afterAdvance).toMatchObject({
    pendingAdvance: false,
    routeLength: 2,
    currentCountry: "Germany"
  });
});

test("numeric speedrun splits are recorded and labelled separately from the finish", async ({page})=>{
  await page.goto("/game.html");
  const result = await page.evaluate(()=>{
    state.playMode = "speedrun";
    state.speedTarget = "10";
    state.session = makeSession();
    state.session.pool = countries.slice(0, 10);
    state.session.solved = new Set(state.session.pool);
    state.session.speedRun.started = true;
    state.session.speedRun.startPerf = performance.now() - 5000;
    captureSpeedRunSplit();
    renderSplits();
    return {
      split:state.session.speedRun.splits["10"],
      labels:Array.from(document.querySelectorAll("#split-list .split-row"),row=>row.textContent)
    };
  });
  expect(result.split).toBeGreaterThan(0);
  expect(result.labels.some(label=>label.includes("First 10"))).toBe(true);
  expect(result.labels.some(label=>label.includes("Finish"))).toBe(true);
});

test("practice skips return after the remaining answer and finish with both countries solved", async ({page})=>{
  await page.goto("/game.html");
  const first = await page.evaluate(async()=>{
    state.playMode = "practice";
    state.gameScope = "countries";
    state.which = "flags";
    state.hard = true;
    state.selectedContinent = "All";
    state.session = makeSession();
    state.session.pool = ["France", "Germany"];
    toggleAnswerUi();
    await loadQuestion();
    return state.session.correctCountry;
  });

  await page.locator("#next-btn").click();
  const second = await page.evaluate(()=>state.session.correctCountry);
  expect(second).not.toBe(first);
  await page.locator("#answer-input").fill(second);
  await expect.poll(()=>page.evaluate(()=>state.session.correctCountry)).toBe(first);
  await page.locator("#answer-input").fill(first);

  await expect(page.locator("#result-modal")).toHaveClass(/is-visible/);
  const outcome = await page.evaluate(()=>({solved:state.session.solved.size,skipped:state.session.skipped.size}));
  expect(outcome).toEqual({solved:2,skipped:0});
});

test("one-life practice ends after an incorrect answer without recording a solved question", async ({page})=>{
  await page.goto("/game.html");
  await page.locator("#life-select").selectOption("1");
  await page.locator("#hard-toggle").check();
  const country = await page.evaluate(()=>state.session.correctCountry);
  await page.locator("#answer-input").fill("not a country");
  await page.locator("#submit-btn").click();
  await expect(page.locator("#result-modal")).toHaveClass(/is-visible/);
  expect(await page.evaluate(()=>({
    lives:state.session.livesRemaining,
    solved:state.session.solved.size,
    wrong:state.session.incorrect.has(state.session.correctCountry)
  }))).toEqual({lives:0,solved:0,wrong:true});
  await expect(page.locator("#result-details")).toContainText(country);
});

test("mobile speedrun keeps the answer input focused between flags", async ({page})=>{
  await page.setViewportSize({width:390, height:844});
  await page.goto("/game.html");

  const duringAdvance = await page.evaluate(()=>{
    state.playMode = "speedrun";
    state.gameScope = "countries";
    state.which = "flags";
    state.hard = true;
    state.session = makeSession();
    state.session.pool = ["France", "Germany"];
    state.session.correctCountry = "France";
    state.session.correctAnswer = "France";
    recordRouteQuestion("France");
    toggleAnswerUi();
    answerInput.disabled = false;
    answerInput.focus();

    handleCorrect(true);
    return {
      answerDisabled: answerInput.disabled,
      answerFocused: document.activeElement === answerInput,
      nextDisabled: nextBtn.disabled,
      pendingAdvance: state.session.pendingAdvance
    };
  });

  expect(duringAdvance).toEqual({
    answerDisabled: false,
    answerFocused: true,
    nextDisabled: true,
    pendingAdvance: true
  });

  await page.waitForTimeout(150);
  await expect(page.locator("#answer-input")).toBeFocused();
  await expect(page.locator("#answer-input")).toBeEnabled();
});

test("first speedrun completion opens results with publish prompt", async ({page})=>{
  await page.goto("/game.html");

  const result = await page.evaluate(async ()=>{
    state.playMode = "speedrun";
    state.gameScope = "countries";
    state.which = "flags";
    state.hard = true;
    state.selectedContinent = "All";
    state.speedTarget = "all";
    state.speedRuns = {};
    state.pendingSharedRun = null;
    state.lastCompletedRun = null;
    state.session = makeSession();
    state.session.pool = ["France"];
    state.session.correctCountry = "France";
    state.session.correctAnswer = "France";
    recordRouteQuestion("France");

    const firstAttempt = registerAttempt();
    state.session.speedRun.startPerf = performance.now() - 1500;
    state.session.speedRun.startMs = Date.now() - 1500;
    recordRouteAttempt("France", true, {exact:true, aliasOk:false, fuzzyOk:false});
    handleCorrect(firstAttempt);
    finishSession("complete");
    await state.pendingSharedRunCheck;

    return {
      modalVisible: resultModal.classList.contains("is-visible"),
      title: resultTitle.textContent,
      publishHidden: leaderboardPublish.hidden,
      publishRowHidden: leaderboardPublishRow.hidden,
      publishTitle: leaderboardPublishTitle.textContent,
      pendingCount: getPendingSharedRuns().length,
      isPersonalBest: state.lastCompletedRun && state.lastCompletedRun.isPersonalBest
    };
  });

  expect(result).toMatchObject({
    modalVisible: true,
    title: "Speedrun complete",
    publishHidden: false,
    publishRowHidden: false,
    pendingCount: 1,
    isPersonalBest: true
  });
  expect(result.publishTitle).toContain("Faster than your posted personal best");
});

test("shared speedrun uses a server start, sealed finish and single receipt", async ({page})=>{
  await page.unroute(/supabase\.co/);
  const actions = [];
  await page.route(/supabase\.co/, async route=>{
    const request = route.request();
    if(request.url().includes("/functions/v1/submit-speedrun")){
      const body = JSON.parse(request.postData() || "{}");
      actions.push(body);
      const response = body.action === "start"
        ? {ok:true, challenge:"sealed-start"}
        : body.action === "finish"
          ? {ok:true, completionReceipt:"sealed-completion", time_ms:1550}
          : {ok:true, status:"approved", time_ms:1550};
      await route.fulfill({status:body.action === "submit" ? 201 : 200, contentType:"application/json", body:JSON.stringify(response)});
      return;
    }
    await route.fulfill({status:200, contentType:"application/json", body:"[]"});
  });

  await page.goto("/game.html");
  await page.evaluate(async ()=>{
    state.playMode = "speedrun";
    state.gameScope = "countries";
    state.which = "flags";
    state.hard = true;
    state.selectedContinent = "All";
    state.speedTarget = "all";
    state.speedRuns = {};
    state.pendingSharedRun = null;
    state.lastCompletedRun = null;
    state.session = makeSession();
    state.session.pool = ["France"];
    state.session.correctCountry = "France";
    state.session.correctAnswer = "France";
    recordRouteQuestion("France");
    await startSpeedRun();
    state.session.speedRun.startPerf = performance.now() - 1500;
    state.session.speedRun.startMs = Date.now() - 1500;
    const firstAttempt = registerAttempt();
    recordRouteAttempt("France", true, {exact:true, aliasOk:false, fuzzyOk:false});
    handleCorrect(firstAttempt);
  });

  await expect(page.locator("#leaderboard-publish")).toBeVisible();
  await page.locator("#result-player-name").fill("Secure Runner");
  await page.locator("#post-leaderboard-btn").click();
  await expect(page.locator("#leaderboard-publish-status")).toContainText("Posted run");

  expect(actions.map(body=>body.action)).toEqual(["start", "finish", "submit"]);
  expect(actions[1].challenge).toBe("sealed-start");
  expect(actions[2].completion_receipt).toBe("sealed-completion");
  expect(actions[2].player_name).toBe("Secure Runner");
});

test("speedrun results and publish prompt survive progress summary errors", async ({page})=>{
  await page.goto("/game.html");

  const result = await page.evaluate(async ()=>{
    const originalGenerateRunAnalysis = window.SpeedrunAnalytics.generateRunAnalysis;
    window.SpeedrunAnalytics.generateRunAnalysis = ()=>{
      throw new Error("forced progress summary failure");
    };

    try{
      state.playMode = "speedrun";
      state.gameScope = "countries";
      state.which = "flags";
      state.hard = true;
      state.selectedContinent = "All";
      state.speedTarget = "all";
      state.speedRuns = {};
      state.deviceAnalyticsHistory = [];
      state.pendingSharedRun = null;
      state.lastCompletedRun = null;
      state.session = makeSession();
      state.session.pool = ["France"];
      state.session.correctCountry = "France";
      state.session.correctAnswer = "France";
      recordRouteQuestion("France");

      const firstAttempt = registerAttempt();
      state.session.speedRun.startPerf = performance.now() - 1500;
      state.session.speedRun.startMs = Date.now() - 1500;
      recordRouteAttempt("France", true, {exact:true, aliasOk:false, fuzzyOk:false});
      handleCorrect(firstAttempt);
      await state.pendingSharedRunCheck;

      return {
        modalVisible: resultModal.classList.contains("is-visible"),
        title: resultTitle.textContent,
        publishHidden: leaderboardPublish.hidden,
        publishRowHidden: leaderboardPublishRow.hidden,
        publishTitle: leaderboardPublishTitle.textContent,
        pendingCount: getPendingSharedRuns().length,
        isPersonalBest: state.lastCompletedRun && state.lastCompletedRun.isPersonalBest
      };
    }finally{
      window.SpeedrunAnalytics.generateRunAnalysis = originalGenerateRunAnalysis;
    }
  });

  expect(result).toMatchObject({
    modalVisible: true,
    title: "Speedrun complete",
    publishHidden: false,
    publishRowHidden: false,
    pendingCount: 1,
    isPersonalBest: true
  });
  expect(result.publishTitle).toContain("Faster than your posted personal best");
});

test("speedrun PB upload prompt survives localStorage write failures", async ({page})=>{
  await page.goto("/game.html");

  const result = await page.evaluate(async ()=>{
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = ()=>{
      throw new Error("forced storage failure");
    };

    try{
      state.playMode = "speedrun";
      state.gameScope = "countries";
      state.which = "flags";
      state.hard = true;
      state.selectedContinent = "All";
      state.speedTarget = "all";
      state.speedRuns = {};
      state.pendingSharedRun = null;
      state.lastCompletedRun = null;
      state.session = makeSession();
      state.session.pool = ["France"];
      state.session.correctCountry = "France";
      state.session.correctAnswer = "France";
      recordRouteQuestion("France");

      const firstAttempt = registerAttempt();
      state.session.speedRun.startPerf = performance.now() - 1500;
      state.session.speedRun.startMs = Date.now() - 1500;
      recordRouteAttempt("France", true, {exact:true, aliasOk:false, fuzzyOk:false});
      handleCorrect(firstAttempt);
      await state.pendingSharedRunCheck;

      return {
        modalVisible: resultModal.classList.contains("is-visible"),
        title: resultTitle.textContent,
        publishHidden: leaderboardPublish.hidden,
        publishRowHidden: leaderboardPublishRow.hidden,
        publishTitle: leaderboardPublishTitle.textContent,
        pendingCount: getPendingSharedRuns().length,
        isPersonalBest: state.lastCompletedRun && state.lastCompletedRun.isPersonalBest
      };
    }finally{
      Storage.prototype.setItem = originalSetItem;
    }
  });

  expect(result).toMatchObject({
    modalVisible: true,
    title: "Speedrun complete",
    publishHidden: false,
    publishRowHidden: false,
    pendingCount: 1,
    isPersonalBest: true
  });
  expect(result.publishTitle).toContain("Faster than your posted personal best");
});

test("run slower than posted PB opens results without publish prompt", async ({page})=>{
  await page.route(/\/rest\/v1\/speedrun_leaderboard/, route=>route.fulfill({
    status:200, contentType:"application/json", body:JSON.stringify([{time_ms:1000}])
  }));
  await page.goto("/game.html");

  const result = await page.evaluate(async ()=>{
    state.playMode = "speedrun";
    state.gameScope = "countries";
    state.which = "flags";
    state.hard = true;
    state.selectedContinent = "All";
    state.speedTarget = "all";
    const speedRunKey = getSpeedRunKey();
    state.speedRuns = {
      [speedRunKey]: {
        bestSplits: {all: 1000},
        runs: [{timeMs: 1000, date: new Date().toISOString(), correct: 1, total: 1}]
      }
    };
    state.pendingSharedRun = null;
    state.lastCompletedRun = null;
    state.session = makeSession();
    state.session.pool = ["France"];
    state.session.correctCountry = "France";
    state.session.correctAnswer = "France";
    recordRouteQuestion("France");

    await startSpeedRun();
    const firstAttempt = registerAttempt();
    state.session.speedRun.startPerf = performance.now() - 2000;
    state.session.speedRun.startMs = Date.now() - 2000;
    recordRouteAttempt("France", true, {exact:true, aliasOk:false, fuzzyOk:false});
    handleCorrect(firstAttempt);
    await state.pendingSharedRunCheck;

    return {
      modalVisible: resultModal.classList.contains("is-visible"),
      title: resultTitle.textContent,
      publishHidden: leaderboardPublish.hidden,
      pendingCount: getPendingSharedRuns().length,
      isPersonalBest: state.lastCompletedRun && state.lastCompletedRun.isPersonalBest
    };
  });

  expect(result).toMatchObject({
    modalVisible: true,
    title: "Speedrun complete",
    publishHidden: true,
    pendingCount: 0,
    isPersonalBest: false
  });
});

test("a posted PB updated after the prompt stops a stale submission", async ({page})=>{
  await page.goto("/game.html");
  const result = await page.evaluate(async ()=>{
    const service = window.sharedLeaderboard;
    const originalFetch = service.fetchBestPostedRunTime;
    try{
      service.fetchBestPostedRunTime = async ()=>1000;
      state.lastCompletedRun = {modeKey:"flags_All_hard_25", timeMs:2000};
      state.pendingSharedRun = state.lastCompletedRun;
      state.pendingSharedRunCheck = null;
      leaderboardPublishRow.hidden = false;
      await postPendingSharedRun();
      return {
        pending:state.pendingSharedRun,
        rowHidden:leaderboardPublishRow.hidden,
        message:leaderboardPublishStatus.textContent
      };
    }finally{
      service.fetchBestPostedRunTime = originalFetch;
    }
  });
  expect(result.pending).toBeNull();
  expect(result.rowHidden).toBe(true);
  expect(result.message).toContain("not faster than your posted personal best");
});

test("PB prompt stays available when shared lookup is unavailable", async ({page})=>{
  await page.goto("/game.html");
  const result = await page.evaluate(async ()=>{
    const service = window.sharedLeaderboard;
    const originalConfigured = service.isConfigured;
    const originalFetch = service.fetchBestPostedRunTime;
    try{
      state.playMode = "speedrun";
      const run = {modeKey:"flags_All_hard_25", timeMs:2000,
        isPersonalBest:true, completionReceipt:"offline-test-receipt"};
      state.lastCompletedRun = run;
      state.session = makeSession();
      service.isConfigured = ()=>false;
      await refreshPendingSharedRun(run, state.session);
      const local = {pending:state.pendingSharedRun === run,
        title:leaderboardPublishTitle.textContent, rowHidden:leaderboardPublishRow.hidden};

      service.isConfigured = ()=>true;
      service.fetchBestPostedRunTime = async ()=>{ throw new Error("offline lookup"); };
      await refreshPendingSharedRun(run, state.session);
      const lookupFailure = {pending:state.pendingSharedRun === run,
        title:leaderboardPublishTitle.textContent, failed:state.postedPbLookupFailed};
      return {local, lookupFailure};
    }finally{
      service.isConfigured = originalConfigured;
      service.fetchBestPostedRunTime = originalFetch;
    }
  });
  expect(result.local).toMatchObject({pending:true, rowHidden:true});
  expect(result.local.title).toContain("saved locally");
  expect(result.lookupFailure).toMatchObject({pending:true, failed:true});
  expect(result.lookupFailure.title).toContain("Could not check your posted personal best");
});

test("rejected local PB does not block a faster run than the posted PB", async ({page})=>{
  const actions = [];
  await page.route(/\/rest\/v1\/speedrun_leaderboard/, route=>route.fulfill({
    status:200, contentType:"application/json", body:JSON.stringify([{time_ms:3000}])
  }));
  await page.route(/\/functions\/v1\/submit-speedrun/, route=>{
    const action = JSON.parse(route.request().postData() || "{}").action;
    actions.push(action);
    const body = action === "start"
      ? {ok:true, challenge:"rejected-pb-start"}
      : action === "finish"
        ? {ok:true, completionReceipt:"rejected-pb-finish", time_ms:2000}
        : {ok:true, status:"approved", time_ms:2000};
    return route.fulfill({status:200, contentType:"application/json", body:JSON.stringify(body)});
  });
  await page.goto("/game.html");

  const result = await page.evaluate(async ()=>{
    state.playMode = "speedrun";
    state.gameScope = "countries";
    state.which = "flags";
    state.hard = true;
    state.selectedContinent = "All";
    state.speedTarget = "all";
    const speedRunKey = getSpeedRunKey();
    state.speedRuns = {
      [speedRunKey]: {
        bestSplits:{all:1000},
        runs:[{timeMs:1000, status:"rejected", date:new Date().toISOString()}]
      }
    };
    state.session = makeSession();
    state.session.pool = ["France"];
    state.session.correctCountry = "France";
    state.session.correctAnswer = "France";
    recordRouteQuestion("France");
    await startSpeedRun();
    const firstAttempt = registerAttempt();
    state.session.speedRun.startPerf = performance.now() - 2000;
    state.session.speedRun.startMs = Date.now() - 2000;
    recordRouteAttempt("France", true, {exact:true, aliasOk:false, fuzzyOk:false});
    handleCorrect(firstAttempt);
    await state.pendingSharedRunCheck;

    return {
      isLocalPersonalBest: state.lastCompletedRun.isPersonalBest,
      publishHidden: leaderboardPublish.hidden,
      pendingCount: getPendingSharedRuns().length,
      title: leaderboardPublishTitle.textContent
    };
  });

  expect(result).toMatchObject({
    isLocalPersonalBest:false,
    publishHidden:false,
    pendingCount:1
  });
  expect(result.title).toContain("Faster than your posted personal best");
  await page.locator("#post-leaderboard-btn").click();
  await expect(page.locator("#leaderboard-publish-status")).toContainText("Posted run");
  expect(actions).toEqual(["start", "finish", "submit"]);
});

test("speedrun completion still opens results if local recording fails", async ({page})=>{
  await page.goto("/game.html");

  const result = await page.evaluate(()=>{
    state.playMode = "speedrun";
    state.gameScope = "countries";
    state.which = "flags";
    state.hard = true;
    state.selectedContinent = "All";
    state.speedTarget = "all";
    state.pendingSharedRun = null;
    state.lastCompletedRun = null;
    state.session = makeSession();
    state.session.pool = ["France"];
    state.session.solved.add("France");
    startSpeedRun();
    state.session.speedRun.startPerf = performance.now() - 1500;
    state.session.speedRun.startMs = Date.now() - 1500;
    recordSpeedRun = ()=>{
      throw new Error("forced recording failure");
    };

    finishSession("complete");

    return {
      modalVisible: resultModal.classList.contains("is-visible"),
      title: resultTitle.textContent,
      publishHidden: leaderboardPublish.hidden,
      pendingCount: getPendingSharedRuns().length,
      lastCompletedRun: state.lastCompletedRun
    };
  });

  expect(result).toMatchObject({
    modalVisible: true,
    title: "Speedrun complete",
    publishHidden: true,
    pendingCount: 0,
    lastCompletedRun: null
  });
});

test("speedrun flag mode preloads current and upcoming flags", async ({page})=>{
  const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
  await page.route(/flagcdn\.com/, route=>route.fulfill({
    status: 200,
    contentType: "image/png",
    body: tinyPng
  }));
  await page.goto("/game.html");

  const result = await page.evaluate(async ()=>{
    const requests = [];
    preloadImageUrl = url=>{
      requests.push(url);
      return Promise.resolve(true);
    };
    state.playMode = "speedrun";
    state.gameScope = "countries";
    state.which = "flags";
    state.hard = true;
    state.session = makeSession();
    state.session.pool = ["France", "Germany", "Italy"];

    await loadQuestion();
    await Promise.resolve();
    await Promise.resolve();

    const img = document.querySelector("#question-visual img");
    return {
      current: state.session.correctCountry,
      requests,
      loading: img ? img.loading : "",
      fetchPriority: img ? img.fetchPriority || "" : ""
    };
  });

  expect(result.current).toBe("France");
  expect(result.requests[0]).toContain("/fr.png");
  expect(result.requests).toEqual(expect.arrayContaining([
    expect.stringContaining("/de.png"),
    expect.stringContaining("/it.png")
  ]));
  expect(result.loading).toBe("eager");
});

test("practice flag mode preloads the buffer before showing the flag", async ({page})=>{
  await page.goto("/game.html");

  const result = await page.evaluate(async ()=>{
    const requests = [];
    preloadImageUrl = url=>{
      requests.push(url);
      return Promise.resolve(true);
    };
    state.playMode = "practice";
    state.gameScope = "countries";
    state.which = "flags";
    state.hard = true;
    state.session = makeSession();
    state.session.pool = ["France", "Germany", "Italy"];

    await loadQuestion();
    return {
      current: state.session.correctCountry,
      requests,
      alt: document.querySelector("#question-visual img")?.alt || ""
    };
  });

  expect(result.current).toBeTruthy();
  expect(result.requests.length).toBeGreaterThanOrEqual(3);
  expect(result.alt).toBe(`Flag of ${result.current}`);
});

test("country speedrun progress ignores older regional revision targets", async ({page})=>{
  await page.goto("/game.html");

  const progressText = await page.evaluate(()=>{
    const makeQuestion = (country, continent, index, wrongSubmits=0)=>({
      runId: "test-run",
      questionIndex: index,
      countryId: country,
      country,
      continent,
      canonicalAnswer: country,
      acceptedAnswer: country,
      rawFinalInput: country,
      allRawAttempts: wrongSubmits ? ["wrong", country] : [country],
      acceptedAlias: "",
      aliasType: "full-canonical",
      answerCompletionType: wrongSubmits ? "corrected-after-mistakes" : "full-canonical",
      shortcutUsed: false,
      autocompleteUsed: false,
      hintUsed: false,
      skipUsed: false,
      attempts: [
        ...Array.from({length: wrongSubmits}, (_, attemptIndex)=>({
          rawInput: `wrong-${attemptIndex}`,
          submittedAt: 1000 + attemptIndex,
          correct: false,
          errorType: "confusion"
        })),
        {
          rawInput: country,
          submittedAt: 2000 + index,
          correct: true,
          errorType: "none"
        }
      ],
      attemptsCount: wrongSubmits + 1,
      wrongSubmits,
      typedChars: country.length,
      canonicalChars: country.length,
      recognitionMs: wrongSubmits ? 5200 : 900,
      firstAttemptMs: wrongSubmits ? 5300 : 1100,
      finalSolveMs: wrongSubmits ? 8000 : 1800 + index,
      activeTypingMs: 700,
      correctionMs: wrongSubmits ? 2700 : 0,
      firstTry: wrongSubmits === 0,
      dataQualityFlags: []
    });
    const makeRoute = questions=>questions.map(question=>({
      index: question.questionIndex,
      country: question.country,
      continent: question.continent,
      answer: question.country,
      shownMs: 0,
      firstInputMs: question.recognitionMs,
      firstSubmitMs: question.firstAttemptMs,
      solvedMs: question.finalSolveMs,
      attempts: question.attemptsCount,
      wrongAttempts: question.wrongSubmits,
      typedChars: question.typedChars,
      skipped: false
    }));

    const staleRegionalQuestions = ["Cork", "Leitrim", "Wicklow", "Sligo"]
      .map((country, index)=>makeQuestion(country, "Ireland", index + 1, 2));
    state.deviceAnalyticsHistory = [{
      analyticsVersion: 2,
      clientRunId: "stale-regional-run",
      playerName: "Runner",
      playerId: "device",
      gameScope: "regions",
      setKey: "ireland",
      setLabel: "Ireland",
      itemLabel: "county",
      which: "flags",
      mode: "flags",
      continent: "Ireland",
      region: "Ireland",
      difficulty: "hard",
      target: "all",
      targetLabel: "All available",
      totalDurationMs: 32000,
      total: staleRegionalQuestions.length,
      correct: 0,
      firstTryCorrectCount: 0,
      route: makeRoute(staleRegionalQuestions),
      questionAnalytics: staleRegionalQuestions,
      runContext: {
        gameScope: "regions",
        setKey: "ireland",
        setLabel: "Ireland",
        mode: "flags",
        difficulty: "hard",
        target: "all",
        targetLabel: "All available"
      },
      telemetry: {nonce: "stale-regional-run"}
    }];

    const countryQuestions = ["France", "Germany"].map((country, index)=>makeQuestion(country, "Europe", index + 1, 0));
    state.lastCompletedRun = {
      playerName: "Runner",
      modeKey: "flags_all_hard_all",
      which: "flags",
      gameScope: "countries",
      setKey: "all",
      setLabel: "All",
      itemLabel: "country",
      continent: "All",
      difficulty: "hard",
      targetValue: "all",
      targetLabel: "All available",
      timeMs: 5000,
      typedChars: 13,
      wpm: 31.2,
      correct: countryQuestions.length,
      total: countryQuestions.length,
      target: "All available",
      splits: {all: 5000},
      route: makeRoute(countryQuestions),
      questionAnalytics: countryQuestions,
      runContext: {
        gameScope: "countries",
        setKey: "all",
        setLabel: "All",
        mode: "flags",
        difficulty: "hard",
        target: "all",
        targetLabel: "All available",
        questionOrder: ["France", "Germany"]
      },
      telemetry: {nonce: "current-country-run"},
      antiCheat: {},
      isPersonalBest: true
    };
    state.playMode = "speedrun";
    state.gameScope = "countries";
    state.which = "flags";
    resultDetails.innerHTML = "";

    renderDeviceProgressSummary();
    return resultDetails.textContent;
  });

  expect(progressText).toContain("Runs for this setup: 1");
  expect(progressText).not.toContain("Cork");
  expect(progressText).not.toContain("Leitrim");
  expect(progressText).not.toContain("Wicklow");
  expect(progressText).not.toContain("Sligo");
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
