(function(){
  const DEFAULT_TABLE = "speedrun_leaderboard";
  const PLACEHOLDER_VALUES = new Set([
    "",
    "YOUR_SUPABASE_URL",
    "YOUR_SUPABASE_ANON_KEY"
  ]);

  function getConfig(){
    return window.LEADERBOARD_CONFIG || {};
  }

  function configuredValue(value){
    return typeof value === "string" && !PLACEHOLDER_VALUES.has(value.trim());
  }

  function isJwt(value){
    return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || "").trim());
  }

  function makePublicHeaders(key, extraHeaders={}){
    const headers = {
      apikey: key,
      "Content-Type": "application/json",
      ...extraHeaders
    };
    if(isJwt(key) && !headers.Authorization){
      headers.Authorization = `Bearer ${key}`;
    }
    return headers;
  }

  function isConfigured(){
    const config = getConfig();
    return configuredValue(config.supabaseUrl)
      && configuredValue(config.supabaseAnonKey)
      && configuredValue(config.submitFunctionUrl);
  }

  function isAnalyticsConfigured(){
    const config = getConfig();
    return configuredValue(config.supabaseUrl)
      && configuredValue(config.supabaseAnonKey)
      && configuredValue(config.analyticsFunctionUrl);
  }

  function getTableName(){
    const config = getConfig();
    return configuredValue(config.tableName) ? config.tableName.trim() : DEFAULT_TABLE;
  }

  function getRestUrl(){
    const config = getConfig();
    const baseUrl = config.supabaseUrl.trim().replace(/\/+$/,"");
    return `${baseUrl}/rest/v1/${encodeURIComponent(getTableName())}`;
  }

  function getHeaders(extraHeaders={}){
    const key = getConfig().supabaseAnonKey.trim();
    return makePublicHeaders(key, extraHeaders);
  }

  async function request(params, options={}){
    if(!isConfigured()) throw new Error("Shared leaderboard is not configured.");
    const query = params ? `?${params.toString()}` : "";
    const response = await fetch(`${getRestUrl()}${query}`, {
      ...options,
      headers: getHeaders(options.headers || {})
    });

    if(!response.ok){
      let message = `Leaderboard request failed (${response.status}).`;
      const text = await response.text();
      if(text){
        message = getErrorMessage(text, message);
      }
      throw new Error(message);
    }

    if(response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function getErrorMessage(text, fallback){
    try{
      const details = JSON.parse(text);
      return details.message || details.error || fallback;
    }catch{
      return text || fallback;
    }
  }

  function cleanText(value, fallback, maxLength){
    const text = String(value || "").trim().replace(/\s+/g, " ");
    return (text || fallback).slice(0, maxLength);
  }

  function getFiniteTiming(value){
    if(value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function clampSubmissionTiming(entry){
    const visibleAt = getFiniteTiming(entry && entry.visibleAt);
    if(visibleAt !== null){
      for(const key of ["firstKeyAt", "firstInputAt", "firstSubmitAt", "firstWrongAt", "acceptedAt"]){
        const value = getFiniteTiming(entry[key]);
        if(value !== null && value < visibleAt) entry[key] = Math.round(visibleAt);
      }
    }

    const shownMs = getFiniteTiming(entry && entry.shownMs);
    if(shownMs !== null){
      for(const key of ["firstKeyMs", "firstInputMs", "firstSubmitMs", "solvedMs"]){
        const value = getFiniteTiming(entry[key]);
        if(value !== null && value < shownMs) entry[key] = Math.round(shownMs);
      }
    }
    return entry;
  }

  function normaliseSubmissionRoute(route){
    if(!Array.isArray(route)) return [];
    const previousAttemptsByCountry = new Map();
    return route.map(entry=>{
      const country = cleanText(entry && entry.country, "", 120);
      const previous = previousAttemptsByCountry.get(country) || {attempts:0, wrongAttempts:0};
      const solved = entry && entry.solvedMs !== null && entry.solvedMs !== undefined;
      const ownAttempts = Math.max(0, Math.round(Number(entry && entry.attempts) || 0));
      const ownWrongAttempts = Math.max(0, Math.round(Number(entry && entry.wrongAttempts) || 0));
      const attempts = solved ? ownAttempts + previous.attempts : ownAttempts;
      const wrongAttempts = solved ? ownWrongAttempts + previous.wrongAttempts : ownWrongAttempts;

      if(solved){
        previousAttemptsByCountry.delete(country);
      }else{
        previousAttemptsByCountry.set(country, {
          attempts: previous.attempts + ownAttempts,
          wrongAttempts: previous.wrongAttempts + ownWrongAttempts
        });
      }

      return clampSubmissionTiming({
        ...entry,
        attempts,
        wrongAttempts
      });
    });
  }

  function routeEntryIsSolved(entry){
    return !!entry && entry.solvedMs !== null && entry.solvedMs !== undefined;
  }

  function countFirstTrySolved(route){
    return (Array.isArray(route) ? route : [])
      .filter(routeEntryIsSolved)
      .filter(entry=>(Number(entry.wrongAttempts) || 0) === 0)
      .length;
  }

  function normalizeRun(row){
    const gameScope = row.game_scope || (String(row.mode_key || "").startsWith("regions_") ? "regions" : "countries");
    return {
      modeKey: row.mode_key || "",
      gameScope,
      setKey: row.set_key || "",
      setLabel: row.set_label || row.continent || "",
      itemLabel: row.item_label || (gameScope === "regions" ? "region" : "country"),
      which: row.which || "",
      continent: row.continent || "",
      difficulty: row.difficulty || "",
      targetValue: row.target || "",
      targetLabel: row.target_label || row.target || "",
      playerName: cleanText(row.player_name, "Player", 24),
      timeMs: Number(row.time_ms) || 0,
      date: row.created_at || "",
      correct: Number(row.correct_first_try) || 0,
      total: Number(row.total) || 0,
      typedChars: Number(row.typed_chars) || Number(row.typedChars) || 0,
      canonicalChars: Number(row.canonical_chars) || Number(row.canonicalChars) || 0,
      wpm: Number(row.wpm) || 0,
      wpmVariants: row.wpm_variants || row.wpmVariants || {},
      target: row.target_label || row.target || "",
      splits: row.splits || {},
      route: [],
      telemetry: {},
      antiCheat: {},
      verified: false,
      submissionMethod: row.submission_method || "direct",
      status: row.status || "approved",
      reviewReasons: Array.isArray(row.review_reasons) ? row.review_reasons : [],
      shared: true
    };
  }

  async function fetchRuns(filters, limit=10){
    const params = makeRunParams("full", limit);
    params.set("mode_key", `eq.${filters.modeKey}`);
    const rows = await requestWithLegacyFallback(params, limit, filters.modeKey);
    return Array.isArray(rows) ? rows.map(normalizeRun) : [];
  }

  async function fetchAllRuns(limit=5000){
    const params = makeRunParams("full", limit);
    const rows = await requestWithLegacyFallback(params, limit);
    return Array.isArray(rows) ? rows.map(normalizeRun) : [];
  }

  function makeRunParams(detail, limit){
    const params = new URLSearchParams();
    const legacyBase = "mode_key,which,continent,difficulty,target,player_name,time_ms,created_at,correct_first_try,total,target_label,splits";
    const base = `mode_key,game_scope,set_key,set_label,item_label,which,continent,difficulty,target,player_name,time_ms,created_at,correct_first_try,total,target_label,splits`;
    const full = `${base},typed_chars,canonical_chars,wpm,wpm_variants`;
    params.set("select", detail === "full"
      ? full
      : detail === "legacy" ? legacyBase
        : base);
    params.set("order", "mode_key.asc,time_ms.asc,created_at.asc");
    params.set("limit", String(limit));
    return params;
  }

  async function requestWithLegacyFallback(params, limit, modeKey){
    try{
      return await request(params);
    }catch(error){
      const message = error && error.message ? error.message.toLowerCase() : "";
      if(!isDetailedColumnError(message)){
        throw error;
      }
      const fallback = makeRunParams("legacy", limit);
      if(modeKey) fallback.set("mode_key", `eq.${modeKey}`);
      return request(fallback);
    }
  }

  function isDetailedColumnError(message){
    return [
      "game_scope",
      "set_key",
      "set_label",
      "item_label",
      "typed_chars",
      "canonical_chars",
      "wpm",
      "permission denied",
      "schema cache",
      "could not find",
      "does not exist"
    ].some(text=>message.includes(text));
  }

  async function submitRun(run){
    const route = normaliseSubmissionRoute(run.route);
    const correctFirstTry = countFirstTrySolved(route);
    const payload = {
      player_name: cleanText(run.playerName, "Player", 24),
      mode_key: cleanText(run.modeKey, "unknown", 120),
      game_scope: cleanText(run.gameScope || run.runContext && run.runContext.gameScope, "countries", 16),
      set_key: cleanText(run.setKey || run.runContext && run.runContext.setKey, "", 80),
      set_label: cleanText(run.setLabel || run.runContext && run.runContext.setLabel || run.continent, run.continent || "All", 80),
      item_label: cleanText(run.itemLabel || run.runContext && run.runContext.itemLabel, "country", 40),
      which: cleanText(run.which, "flags", 12),
      continent: cleanText(run.continent, "All", 80),
      difficulty: cleanText(run.difficulty, "hard", 12),
      target: cleanText(run.target, "all", 12),
      target_label: cleanText(run.targetLabel, "All", 24),
      time_ms: Math.round(Number(run.timeMs) || 0),
      correct_first_try: correctFirstTry,
      total: Math.round(Number(run.total) || 0),
      typed_chars: Math.round(Number(run.typedChars) || 0),
      canonical_chars: Math.round(Number(run.canonicalChars) || 0),
      wpm: Number(run.wpm) || 0,
      wpm_variants: run.wpmVariants || {},
      splits: run.splits || {},
      route,
      telemetry: run.telemetry || {},
      anti_cheat: run.antiCheat || {},
      run_context: run.runContext || {},
      derived_metrics: run.derivedMetrics || {},
      submission_method: run.submissionMethod || "direct",
      verified: !!run.verified
    };

    const config = getConfig();
    if(!configuredValue(config.submitFunctionUrl)){
      throw new Error("Shared leaderboard submit function is not configured.");
    }
    const key = config.supabaseAnonKey.trim();
    const response = await fetch(config.submitFunctionUrl.trim(), {
      method: "POST",
      headers: makePublicHeaders(key),
      body: JSON.stringify(payload)
    });
    if(!response.ok){
      const text = await response.text();
      throw new Error(getErrorMessage(text, `Leaderboard function failed (${response.status}).`));
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {ok:true, status:"approved"};
  }

  async function submitAnalytics(run){
    const config = getConfig();
    if(!configuredValue(config.analyticsFunctionUrl)){
      throw new Error("Speedrun analytics function is not configured.");
    }
    const key = config.supabaseAnonKey.trim();
    const route = normaliseSubmissionRoute(run.route);
    const correctFirstTry = countFirstTrySolved(route);
    const payload = {
      client_run_id: cleanText(run.clientRunId, "", 120),
      player_name: cleanText(run.playerName, "Player", 24),
      player_id: cleanText(run.playerId, "", 80),
      mode_key: cleanText(run.modeKey, "unknown", 120),
      game_scope: cleanText(run.gameScope || run.runContext && run.runContext.gameScope, "countries", 16),
      set_key: cleanText(run.setKey || run.runContext && run.runContext.setKey, "", 80),
      set_label: cleanText(run.setLabel || run.runContext && run.runContext.setLabel || run.continent, run.continent || "All", 80),
      item_label: cleanText(run.itemLabel || run.runContext && run.runContext.itemLabel, "country", 40),
      which: cleanText(run.which, "flags", 12),
      continent: cleanText(run.continent, "All", 80),
      difficulty: cleanText(run.difficulty, "hard", 12),
      target: cleanText(run.target, "all", 12),
      target_label: cleanText(run.targetLabel, "All", 24),
      time_ms: Math.round(Number(run.timeMs) || 0),
      correct_first_try: correctFirstTry,
      total: Math.round(Number(run.total) || 0),
      typed_chars: Math.round(Number(run.typedChars) || 0),
      wpm: Number(run.wpm) || 0,
      analytics_version: Math.round(Number(run.analyticsVersion) || 2),
      run_id: cleanText(run.runId || run.clientRunId, "", 120),
      device_number: cleanText(run.deviceNumber, "", 40),
      known_player_names: Array.isArray(run.knownPlayerNames) ? run.knownPlayerNames : [],
      leaderboard_names: Array.isArray(run.leaderboardNames) ? run.leaderboardNames : [],
      mode: cleanText(run.mode || run.which, "flags", 12),
      region: cleanText(run.region || run.continent, "All", 80),
      country_set_version: cleanText(run.countrySetVersion, "", 80),
      question_order_id: cleanText(run.questionOrderId, "", 120),
      question_order: Array.isArray(run.questionOrder) ? run.questionOrder : [],
      started_at: run.startedAt || "",
      completed_at: run.completedAt || "",
      total_duration_ms: Math.round(Number(run.totalDurationMs || run.timeMs) || 0),
      solved_count: Math.round(Number(run.solvedCount || run.total) || 0),
      final_correct_count: Math.round(Number(run.finalCorrectCount || run.total) || 0),
      canonical_chars: Math.round(Number(run.canonicalChars) || 0),
      wpm_variants: run.wpmVariants || {},
      autocomplete_enabled: run.runContext ? run.runContext.autocompleteEnabled !== false : true,
      aliases_enabled: run.runContext ? run.runContext.aliasesEnabled !== false : true,
      strict_spelling_mode: run.runContext ? run.runContext.strictSpellingMode === true : false,
      leaderboard_valid: run.leaderboardValid !== false,
      analytics_only: run.analyticsOnly === true,
      total_focus_lost_ms: Math.round(Number((run.telemetry && run.telemetry.focusLostMs) || (run.runContext && run.runContext.totalFocusLostMs)) || 0),
      total_hidden_ms: Math.round(Number((run.telemetry && run.telemetry.hiddenMs) || (run.runContext && run.runContext.totalHiddenTabMs)) || 0),
      paste_events_count: Math.round(Number((run.telemetry && run.telemetry.pasteEvents) || (run.runContext && run.runContext.pasteEventsCount)) || 0),
      splits: run.splits || {},
      route,
      question_analytics: Array.isArray(run.questionAnalytics) ? run.questionAnalytics : [],
      derived_metrics: run.derivedMetrics || {},
      run_context: run.runContext || {},
      telemetry: run.telemetry || {},
      anti_cheat: run.antiCheat || {},
      data_quality_flags: Array.isArray(run.dataQualityFlags) ? run.dataQualityFlags : [],
      captured_at: run.capturedAt || new Date().toISOString()
    };

    const response = await fetch(config.analyticsFunctionUrl.trim(), {
      method: "POST",
      headers: makePublicHeaders(key),
      body: JSON.stringify(payload)
    });
    if(!response.ok){
      const text = await response.text();
      throw new Error(getErrorMessage(text, `Analytics function failed (${response.status}).`));
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {ok:true, status:"stored"};
  }

  window.sharedLeaderboard = {
    isConfigured,
    isAnalyticsConfigured,
    fetchRuns,
    fetchAllRuns,
    submitRun,
    submitAnalytics
  };
})();
