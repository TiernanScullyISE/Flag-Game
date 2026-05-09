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

  function isConfigured(){
    const config = getConfig();
    return configuredValue(config.supabaseUrl)
      && configuredValue(config.supabaseAnonKey)
      && configuredValue(config.submitFunctionUrl);
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
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...extraHeaders
    };
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
      const message = details.message || details.error || fallback;
      const reasons = Array.isArray(details.reasons)
        ? details.reasons
        : Array.isArray(details.reviewReasons)
          ? details.reviewReasons
          : [];
      return reasons.length ? `${message}: ${reasons.join(", ")}` : message;
    }catch{
      return text || fallback;
    }
  }

  function cleanText(value, fallback, maxLength){
    const text = String(value || "").trim().replace(/\s+/g, " ");
    return (text || fallback).slice(0, maxLength);
  }

  function normalizeRun(row){
    return {
      modeKey: row.mode_key || "",
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
      target: row.target_label || row.target || "",
      splits: row.splits || {},
      route: Array.isArray(row.route) ? row.route : [],
      telemetry: row.telemetry || {},
      antiCheat: row.anti_cheat || {},
      verified: !!row.verified,
      submissionMethod: row.submission_method || "direct",
      status: row.status || "approved",
      reviewReasons: Array.isArray(row.review_reasons) ? row.review_reasons : [],
      shared: true
    };
  }

  async function fetchRuns(filters, limit=10){
    const params = makeRunParams("detailed", limit);
    params.set("mode_key", `eq.${filters.modeKey}`);
    const rows = await requestWithLegacyFallback(params, limit, filters.modeKey);
    return Array.isArray(rows) ? rows.map(normalizeRun) : [];
  }

  async function fetchAllRuns(limit=5000){
    const params = makeRunParams("detailed", limit);
    const rows = await requestWithLegacyFallback(params, limit);
    return Array.isArray(rows) ? rows.map(normalizeRun) : [];
  }

  function makeRunParams(detail, limit){
    const params = new URLSearchParams();
    const base = "mode_key,which,continent,difficulty,target,player_name,time_ms,created_at,correct_first_try,total,target_label,splits";
    const detailed = `${base},route,telemetry,anti_cheat,verified,submission_method,status,review_reasons`;
    params.set("select", detail === "detailed" ? detailed : base);
    params.set("order", "mode_key.asc,time_ms.asc,created_at.asc");
    params.set("limit", String(limit));
    return params;
  }

  async function requestWithLegacyFallback(params, limit, modeKey){
    try{
      return await request(params);
    }catch(error){
      const message = error && error.message ? error.message.toLowerCase() : "";
      if(!message.includes("route") && !message.includes("anti_cheat") && !message.includes("verified")){
        throw error;
      }
      const fallback = makeRunParams("legacy", limit);
      if(modeKey) fallback.set("mode_key", `eq.${modeKey}`);
      return request(fallback);
    }
  }

  async function submitRun(run){
    const payload = {
      player_name: cleanText(run.playerName, "Player", 24),
      mode_key: cleanText(run.modeKey, "unknown", 80),
      which: cleanText(run.which, "flags", 12),
      continent: cleanText(run.continent, "All", 32),
      difficulty: cleanText(run.difficulty, "hard", 12),
      target: cleanText(run.target, "all", 12),
      target_label: cleanText(run.targetLabel, "All", 24),
      time_ms: Math.round(Number(run.timeMs) || 0),
      correct_first_try: Math.round(Number(run.correct) || 0),
      total: Math.round(Number(run.total) || 0),
      splits: run.splits || {},
      route: Array.isArray(run.route) ? run.route : [],
      telemetry: run.telemetry || {},
      anti_cheat: run.antiCheat || {},
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
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if(!response.ok){
      const text = await response.text();
      throw new Error(getErrorMessage(text, `Leaderboard function failed (${response.status}).`));
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {ok:true, status:"approved"};
  }

  window.sharedLeaderboard = {
    isConfigured,
    fetchRuns,
    fetchAllRuns,
    submitRun
  };
})();
