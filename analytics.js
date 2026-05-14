(function(){
  const ANALYTICS_VERSION = 2;
  const NEAR_INSTANT_RECOGNITION_MS = 100;
  const IMPOSSIBLE_ACTIVE_WPM = 260;
  const SLOW_SOLVE_MS = 4500;
  const FAST_RECOGNITION_MS = 900;
  const SLOW_TYPING_MS = 1800;

  function countAnswerChars(value){
    return Array.from(String(value || "").replace(/\s+/g, "")).length;
  }

  function wordCount(value){
    const words = String(value || "").trim().split(/\s+/).filter(Boolean);
    return words.length;
  }

  function hasDiacritics(value){
    return /[\u00c0-\u024f]/.test(String(value || ""));
  }

  function nameComplexity(value){
    const text = String(value || "");
    let score = countAnswerChars(text);
    score += Math.max(0, wordCount(text) - 1) * 3;
    if(text.includes("-")) score += 3;
    if(/\band\b/i.test(text)) score += 3;
    if(hasDiacritics(text)) score += 2;
    return score;
  }

  function roundMetric(value, decimals=1){
    const number = Number(value);
    if(!Number.isFinite(number)) return null;
    const factor = 10 ** decimals;
    return Math.round(number * factor) / factor;
  }

  function safeNumber(value, fallback=0){
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function safeArray(value){
    return Array.isArray(value) ? value : [];
  }

  function average(values){
    const list = values.filter(Number.isFinite);
    if(!list.length) return null;
    return roundMetric(list.reduce((sum, value)=>sum + value, 0) / list.length, 2);
  }

  function median(values){
    return percentile(values, 50);
  }

  function percentile(values, pct){
    const list = values.filter(Number.isFinite).sort((a,b)=>a-b);
    if(!list.length) return null;
    const index = (list.length - 1) * (pct / 100);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if(lower === upper) return roundMetric(list[lower], 2);
    const weight = index - lower;
    return roundMetric(list[lower] * (1 - weight) + list[upper] * weight, 2);
  }

  function standardDeviation(values){
    const list = values.filter(Number.isFinite);
    if(list.length < 2) return 0;
    const mean = list.reduce((sum, value)=>sum + value, 0) / list.length;
    const variance = list.reduce((sum, value)=>sum + ((value - mean) ** 2), 0) / list.length;
    return Math.sqrt(variance);
  }

  function ratio(part, whole){
    const denominator = safeNumber(whole);
    if(denominator <= 0) return 0;
    return safeNumber(part) / denominator;
  }

  function perMinute(count, durationMs){
    const minutes = safeNumber(durationMs) / 60000;
    return minutes > 0 ? count / minutes : 0;
  }

  function wpm(chars, durationMs){
    const minutes = safeNumber(durationMs) / 60000;
    return minutes > 0 ? (safeNumber(chars) / 5) / minutes : 0;
  }

  function editDistance(left, right){
    const a = normaliseForDistance(left);
    const b = normaliseForDistance(right);
    const m = a.length;
    const n = b.length;
    if(!m) return n;
    if(!n) return m;
    const previous = new Array(n + 1);
    const current = new Array(n + 1);
    for(let j=0;j<=n;j += 1) previous[j] = j;
    for(let i=1;i<=m;i += 1){
      current[0] = i;
      for(let j=1;j<=n;j += 1){
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(
          previous[j] + 1,
          current[j - 1] + 1,
          previous[j - 1] + cost
        );
      }
      for(let j=0;j<=n;j += 1) previous[j] = current[j];
    }
    return previous[n];
  }

  function normaliseForDistance(value){
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^\p{L}\p{N}]/gu, "");
  }

  function classifyError(rawInput, canonicalAnswer, matchedAlias){
    const raw = String(rawInput || "").trim();
    const canonical = String(canonicalAnswer || "").trim();
    if(!raw) return "unknown";
    if(matchedAlias) return "alias";
    const distance = editDistance(raw, canonical);
    const canonicalLength = Math.max(1, normaliseForDistance(canonical).length);
    if(distance <= 1) return "typo";
    if(distance <= Math.max(2, Math.floor(canonicalLength * 0.2))) return "spelling";
    if(raw.length <= 3 || distance >= Math.floor(canonicalLength * 0.55)) return "unknown";
    return "confusion";
  }

  function normaliseRecord(record){
    const metrics = record && typeof record.metrics === "object" && record.metrics ? record.metrics : {};
    const derived = metrics.derivedMetrics || record.derived_metrics || {};
    const runContext = metrics.runContext || record.run_context || {};
    const route = safeArray(record.route || metrics.route);
    const questions = getQuestionAnalytics(record, metrics, route);
    const totalDurationMs = safeNumber(record.totalDurationMs, safeNumber(record.time_ms, safeNumber(metrics.summary && metrics.summary.timeMs)));
    const solvedCount = safeNumber(record.solvedCount, safeNumber(metrics.summary && metrics.summary.solvedCount, safeNumber(record.total)));
    const firstTryCount = safeNumber(record.firstTryCorrectCount, safeNumber(record.correct_first_try, safeNumber(metrics.summary && metrics.summary.firstTryCount)));
    const totalQuestions = safeNumber(record.totalQuestions, safeNumber(record.total, safeNumber(metrics.summary && metrics.summary.total, questions.length)));
    const qualityFlags = uniqueStrings([
      ...safeArray(record.quality_flags),
      ...safeArray(record.dataQualityFlags),
      ...safeArray(metrics.qualityFlags),
      ...safeArray(metrics.summary && metrics.summary.qualityFlags),
      ...safeArray(derived.dataQualityFlags)
    ]);

    return {
      raw: record,
      version: safeNumber(metrics.version, safeNumber(record.analytics_version, 1)),
      runId: record.client_run_id || record.clientRunId || metrics.runId || runContext.runId || "",
      playerName: record.player_name || record.playerName || "Player",
      playerId: record.player_id || record.playerId || "",
      deviceNumber: record.device_number || record.deviceNumber || stableDeviceNumber(record.player_id || record.playerId || ""),
      knownPlayerNames: uniqueStrings([
        ...safeArray(record.known_player_names),
        ...safeArray(record.knownPlayerNames),
        ...safeArray(runContext.knownPlayerNames),
        ...safeArray(record.metrics && record.metrics.runContext && record.metrics.runContext.knownPlayerNames)
      ]),
      leaderboardNames: uniqueStrings([
        ...safeArray(record.leaderboard_names),
        ...safeArray(record.leaderboardNames),
        ...safeArray(record.device_leaderboard_names),
        ...safeArray(runContext.leaderboardNames),
        ...safeArray(record.metrics && record.metrics.runContext && record.metrics.runContext.leaderboardNames)
      ]),
      mode: record.which || record.mode || runContext.mode || "unknown",
      region: record.continent || record.region || runContext.region || "unknown",
      difficulty: record.difficulty || runContext.difficulty || "unknown",
      target: record.target || runContext.target || "",
      targetLabel: record.target_label || record.targetLabel || runContext.targetLabel || "",
      modeKey: record.mode_key || record.modeKey || "",
      startedAt: runContext.startedAt || metrics.startedAt || "",
      completedAt: runContext.completedAt || record.captured_at || record.created_at || "",
      createdAt: record.created_at || record.createdAt || "",
      totalDurationMs,
      totalQuestions,
      solvedCount,
      firstTryCorrectCount: firstTryCount,
      finalCorrectCount: safeNumber(record.finalCorrectCount, solvedCount),
      typedChars: safeNumber(record.typed_chars, safeNumber(record.typedChars, safeNumber(metrics.summary && metrics.summary.typedChars))),
      canonicalChars: safeNumber(record.canonicalChars, safeNumber(derived.totalCanonicalChars)),
      wpm: safeNumber(record.wpm, safeNumber(metrics.summary && metrics.summary.wpm)),
      splits: record.splits || metrics.splits || {},
      route,
      telemetry: record.telemetry || metrics.telemetry || {},
      runContext,
      qualityFlags,
      derivedMetrics: derived,
      questionAnalytics: questions
    };
  }

  function getQuestionAnalytics(record, metrics, route){
    const detailed = safeArray(record.question_analytics || record.questionAnalytics || metrics.questionAnalytics);
    if(detailed.length) return detailed.map(normaliseQuestion);
    const perQuestion = safeArray(metrics.perQuestion);
    if(perQuestion.length) return perQuestion.map((entry, index)=>normaliseQuestion({
      questionIndex: entry.index || index + 1,
      countryId: entry.countryId || entry.country,
      country: entry.country,
      continent: entry.continent,
      canonicalAnswer: entry.canonicalAnswer || entry.answer || entry.country,
      acceptedAnswer: entry.acceptedAnswer || entry.answer || "",
      rawFinalInput: entry.rawFinalInput || "",
      acceptedAlias: entry.acceptedAlias || "",
      aliasType: entry.aliasType || "unknown",
      shortcutUsed: entry.shortcutUsed,
      autocompleteUsed: entry.autocompleteUsed,
      attempts: entry.attempts,
      wrongSubmits: entry.wrongAttempts,
      typedChars: entry.typedChars,
      canonicalChars: entry.canonicalChars,
      recognitionMs: entry.recognitionMs,
      activeTypingMs: entry.typingMs,
      finalSolveMs: entry.solveMs,
      firstTry: entry.firstTry,
      skipUsed: entry.skipped,
      dataQualityFlags: entry.dataQualityFlags || []
    }));
    return safeArray(route).map((entry, index)=>normaliseQuestion({
      questionIndex: entry.index || index + 1,
      country: entry.country,
      continent: entry.continent,
      canonicalAnswer: entry.answer || entry.country,
      acceptedAnswer: entry.answer || entry.country,
      attempts: entry.attempts,
      wrongSubmits: entry.wrongAttempts,
      typedChars: entry.typedChars,
      canonicalChars: countAnswerChars(entry.answer || entry.country),
      recognitionMs: entry.firstInputMs === null || entry.firstInputMs === undefined ? null : safeNumber(entry.firstInputMs) - safeNumber(entry.shownMs),
      activeTypingMs: entry.solvedMs === null || entry.firstInputMs === null ? null : safeNumber(entry.solvedMs) - safeNumber(entry.firstInputMs),
      finalSolveMs: entry.solvedMs === null ? null : safeNumber(entry.solvedMs) - safeNumber(entry.shownMs),
      skipUsed: entry.skipped
    }));
  }

  function normaliseQuestion(question){
    const canonicalAnswer = String(question.canonicalAnswer || question.answer || question.country || "");
    const attempts = safeArray(question.attempts).map(attempt=>({
      rawInput: String(attempt.rawInput || ""),
      submittedAt: attempt.submittedAt === null || attempt.submittedAt === undefined ? null : safeNumber(attempt.submittedAt),
      correct: attempt.correct === true,
      editDistanceToCanonical: attempt.editDistanceToCanonical === null || attempt.editDistanceToCanonical === undefined
        ? null
        : safeNumber(attempt.editDistanceToCanonical),
      matchedAlias: attempt.matchedAlias || "",
      errorType: attempt.errorType || classifyError(attempt.rawInput, canonicalAnswer, attempt.matchedAlias)
    }));
    const wrongSubmits = question.wrongSubmits === undefined
      ? attempts.filter(attempt=>attempt.correct === false).length
      : safeNumber(question.wrongSubmits);
    const typedChars = safeNumber(question.typedChars);
    const canonicalChars = safeNumber(question.canonicalChars, countAnswerChars(canonicalAnswer));
    const dataQualityFlags = uniqueStrings(safeArray(question.dataQualityFlags));
    const activeTypingMs = nullableNumber(question.activeTypingMs);
    if(activeTypingMs && typedChars > 0 && wpm(typedChars, activeTypingMs) > IMPOSSIBLE_ACTIVE_WPM){
      dataQualityFlags.push("impossible-active-typing-speed");
    }
    const recognitionMs = nullableNumber(question.recognitionMs);
    if(recognitionMs !== null && recognitionMs < NEAR_INSTANT_RECOGNITION_MS){
      dataQualityFlags.push("near-instant-answer");
    }

    return {
      runId: question.runId || "",
      questionIndex: safeNumber(question.questionIndex, safeNumber(question.index)),
      countryId: question.countryId || question.country || "",
      country: question.country || question.countryId || "",
      continent: question.continent || question.region || "Unknown",
      canonicalAnswer,
      acceptedAnswer: question.acceptedAnswer || "",
      rawFinalInput: question.rawFinalInput || "",
      allRawAttempts: safeArray(question.allRawAttempts),
      acceptedAlias: question.acceptedAlias || "",
      aliasType: question.aliasType || "unknown",
      answerCompletionType: question.answerCompletionType || question.aliasType || "unknown",
      shortcutUsed: question.shortcutUsed === true,
      autocompleteUsed: question.autocompleteUsed === true,
      hintUsed: question.hintUsed === true,
      skipUsed: question.skipUsed === true,
      attempts,
      attemptsCount: safeNumber(question.attemptsCount, attempts.length || safeNumber(question.attempts)),
      wrongSubmits,
      typedChars,
      canonicalChars,
      wordCount: safeNumber(question.wordCount, wordCount(canonicalAnswer)),
      hasHyphen: question.hasHyphen === undefined ? canonicalAnswer.includes("-") : question.hasHyphen === true,
      hasDiacritics: question.hasDiacritics === undefined ? hasDiacritics(canonicalAnswer) : question.hasDiacritics === true,
      hasAnd: question.hasAnd === undefined ? /\band\b/i.test(canonicalAnswer) : question.hasAnd === true,
      nameComplexity: safeNumber(question.nameComplexity, nameComplexity(canonicalAnswer)),
      flagSimilarityGroup: question.flagSimilarityGroup || null,
      visibleAt: nullableNumber(question.visibleAt),
      firstKeyAt: nullableNumber(question.firstKeyAt),
      firstInputAt: nullableNumber(question.firstInputAt),
      firstSubmitAt: nullableNumber(question.firstSubmitAt),
      firstWrongAt: nullableNumber(question.firstWrongAt),
      acceptedAt: nullableNumber(question.acceptedAt),
      recognitionMs,
      firstAttemptMs: nullableNumber(question.firstAttemptMs),
      finalSolveMs: nullableNumber(question.finalSolveMs),
      activeTypingMs,
      correctionMs: nullableNumber(question.correctionMs),
      backspaces: safeNumber(question.backspaces),
      deletedChars: safeNumber(question.deletedChars),
      pasteDetected: question.pasteDetected === true,
      focusLostDuringQuestionMs: safeNumber(question.focusLostDuringQuestionMs),
      hiddenDuringQuestionMs: safeNumber(question.hiddenDuringQuestionMs),
      dataQualityFlags: uniqueStrings(dataQualityFlags),
      firstTry: question.firstTry === undefined ? wrongSubmits === 0 : question.firstTry === true
    };
  }

  function nullableNumber(value){
    if(value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function deriveRunMetrics(input){
    const record = input && input.questionAnalytics ? input : normaliseRecord(input || {});
    const questions = safeArray(record.questionAnalytics).map(normaliseQuestion);
    const solved = questions.filter(question=>!question.skipUsed && question.finalSolveMs !== null);
    const totalDurationMs = safeNumber(record.totalDurationMs);
    const totalQuestions = safeNumber(record.totalQuestions, questions.length || solved.length);
    const solvedCount = safeNumber(record.solvedCount, solved.length);
    const firstTryCorrectCount = safeNumber(record.firstTryCorrectCount, solved.filter(question=>question.firstTry).length);
    const finalCorrectCount = safeNumber(record.finalCorrectCount, solved.length);
    const totalTypedChars = solved.reduce((sum, question)=>sum + safeNumber(question.typedChars), 0) || safeNumber(record.typedChars);
    const totalCanonicalChars = solved.reduce((sum, question)=>sum + safeNumber(question.canonicalChars), 0) || safeNumber(record.canonicalChars);
    const totalActiveTypingMs = solved.reduce((sum, question)=>sum + safeNumber(question.activeTypingMs), 0);
    const shortcutCount = solved.filter(question=>question.shortcutUsed).length;
    const autocompleteCount = solved.filter(question=>question.autocompleteUsed).length;
    const pasteEvents = safeNumber(record.telemetry && record.telemetry.pasteEvents) || solved.filter(question=>question.pasteDetected).length;
    const focusLostMs = safeNumber(record.telemetry && record.telemetry.focusLostMs)
      || solved.reduce((sum, question)=>sum + safeNumber(question.focusLostDuringQuestionMs), 0);
    const hiddenMs = safeNumber(record.telemetry && record.telemetry.hiddenMs)
      || solved.reduce((sum, question)=>sum + safeNumber(question.hiddenDuringQuestionMs), 0);
    const correctionTimeTotalMs = solved.reduce((sum, question)=>sum + safeNumber(question.correctionMs), 0);
    const dataQualityFlags = uniqueStrings([
      ...safeArray(record.qualityFlags),
      ...solved.flatMap(question=>safeArray(question.dataQualityFlags))
    ]);

    if(pasteEvents > 0) dataQualityFlags.push("paste-detected");
    if(focusLostMs > 0) dataQualityFlags.push("focus-lost");
    if(hiddenMs > 0) dataQualityFlags.push("hidden-tab");

    const solvedByTime = [...solved].sort((left,right)=>safeNumber(right.finalSolveMs)-safeNumber(left.finalSolveMs));
    const slowestFive = solvedByTime.slice(0, 5);
    const fastestFive = [...solved]
      .sort((left,right)=>safeNumber(left.finalSolveMs)-safeNumber(right.finalSolveMs))
      .slice(0, 5);
    const highestErrorCountries = [...solved]
      .filter(question=>question.wrongSubmits > 0)
      .sort((left,right)=>right.wrongSubmits-left.wrongSubmits || safeNumber(right.finalSolveMs)-safeNumber(left.finalSolveMs))
      .slice(0, 10);

    const cleanRecognitionValues = solved
      .filter(question=>!question.dataQualityFlags.includes("near-instant-answer") && !question.dataQualityFlags.includes("start-artefact"))
      .map(question=>question.recognitionMs)
      .filter(Number.isFinite);
    const solveValues = solved.map(question=>question.finalSolveMs).filter(Number.isFinite);
    const typingValues = solved.map(question=>question.activeTypingMs).filter(Number.isFinite);
    const slowestFiveTime = slowestFive.reduce((sum, question)=>sum + safeNumber(question.finalSolveMs), 0);
    const meanSolve = average(solveValues);
    const solveStdDev = standardDeviation(solveValues);
    const consistencyScore = meanSolve
      ? Math.max(0, Math.round(100 - Math.min(100, (solveStdDev / meanSolve) * 55)))
      : null;
    const activeInputWpm = wpm(totalTypedChars, totalActiveTypingMs);
    if(activeInputWpm > IMPOSSIBLE_ACTIVE_WPM) dataQualityFlags.push("impossible-active-typing-speed");
    if(solvedCount && ratio(autocompleteCount, solvedCount) >= 0.5) dataQualityFlags.push("autocomplete-heavy-run");

    const totalNonTypingMs = Math.max(0, totalDurationMs - totalActiveTypingMs);
    const shortcutTypingScale = totalTypedChars > 0 ? totalCanonicalChars / totalTypedChars : 1;
    const noShortcutEstimatedMs = totalNonTypingMs + (totalActiveTypingMs * Math.max(1, shortcutTypingScale));
    // Estimate only: scales measured typing time by the canonical/input character ratio and keeps recognition/error time unchanged.
    const noShortcutAdjustedWpm = wpm(totalCanonicalChars, noShortcutEstimatedMs);
    const recognitionOnlyMs = cleanRecognitionValues.reduce((sum, value)=>sum + value, 0);
    const recognitionOnlyPace = perMinute(cleanRecognitionValues.length, recognitionOnlyMs);
    const regionStats = buildRegionStats(solved);
    const quadrants = buildQuadrants(solved);
    const dataQualityScore = Math.max(0, Math.round(100 - uniqueStrings(dataQualityFlags).length * 8 - pasteEvents * 4 - Math.min(20, (focusLostMs + hiddenMs) / 1000)));

    return {
      version: ANALYTICS_VERSION,
      totalQuestions,
      solvedCount,
      finalCorrectCount,
      totalDurationMs,
      countriesPerMinute: roundMetric(perMinute(solvedCount, totalDurationMs), 2),
      totalTypedChars,
      totalCanonicalChars,
      totalActiveTypingMs: Math.round(totalActiveTypingMs),
      effectiveCanonicalWpm: roundMetric(wpm(totalCanonicalChars, totalDurationMs), 2),
      actualInputWpm: roundMetric(activeInputWpm, 2),
      activeInputWpm: roundMetric(activeInputWpm, 2),
      speedrunInputWpm: roundMetric(wpm(totalTypedChars, totalDurationMs), 2),
      noShortcutAdjustedWpm: roundMetric(noShortcutAdjustedWpm, 2),
      noShortcutAdjustedWpmEstimated: true,
      recognitionOnlyPace: roundMetric(recognitionOnlyPace, 2),
      firstTryAccuracy: roundMetric(ratio(firstTryCorrectCount, totalQuestions), 4),
      finalCompletionAccuracy: roundMetric(ratio(finalCorrectCount, totalQuestions), 4),
      averageRecognitionMs: average(cleanRecognitionValues),
      medianRecognitionMs: median(cleanRecognitionValues),
      p75RecognitionMs: percentile(cleanRecognitionValues, 75),
      p90RecognitionMs: percentile(cleanRecognitionValues, 90),
      averageFinalSolveMs: average(solveValues),
      medianFinalSolveMs: median(solveValues),
      p75FinalSolveMs: percentile(solveValues, 75),
      p90FinalSolveMs: percentile(solveValues, 90),
      averageActiveTypingMs: average(typingValues),
      medianActiveTypingMs: median(typingValues),
      slowestFive: slowestFive.map(summariseQuestion),
      fastestFive: fastestFive.map(summariseQuestion),
      highestErrorCountries: highestErrorCountries.map(summariseQuestion),
      shortcutCount,
      autocompleteCount,
      shortcutUsageRate: roundMetric(ratio(shortcutCount, solvedCount), 4),
      autocompleteUsageRate: roundMetric(ratio(autocompleteCount, solvedCount), 4),
      correctionTimeTotalMs: Math.round(correctionTimeTotalMs),
      wrongAnswerTimeLossPercent: roundMetric(ratio(correctionTimeTotalMs, totalDurationMs), 4),
      slowestFiveTimeMs: Math.round(slowestFiveTime),
      slowestFiveTimePercent: roundMetric(ratio(slowestFiveTime, totalDurationMs), 4),
      outlierImpact: roundMetric(ratio(slowestFiveTime, totalDurationMs), 4),
      consistencyScore,
      solveStdDevMs: roundMetric(solveStdDev, 2),
      pasteEvents,
      focusLostMs: Math.round(focusLostMs),
      hiddenMs: Math.round(hiddenMs),
      dataQualityFlags: uniqueStrings(dataQualityFlags),
      dataQualityScore,
      regionStats,
      quadrants,
      shortcutImpact: buildShortcutImpact(solved),
      errorAnalysis: buildErrorAnalysis(solved),
      typingBottlenecks: solved.filter(isTypingBottleneck).map(summariseQuestion).slice(0, 12),
      recognitionBottlenecks: solved.filter(isRecognitionBottleneck).map(summariseQuestion).slice(0, 12)
    };
  }

  function summariseQuestion(question){
    return {
      questionIndex: question.questionIndex,
      country: question.country,
      continent: question.continent,
      canonicalAnswer: question.canonicalAnswer,
      rawFinalInput: question.rawFinalInput,
      acceptedAlias: question.acceptedAlias,
      aliasType: question.aliasType,
      shortcutUsed: question.shortcutUsed,
      autocompleteUsed: question.autocompleteUsed,
      attempts: question.attemptsCount,
      wrongSubmits: question.wrongSubmits,
      typedChars: question.typedChars,
      canonicalChars: question.canonicalChars,
      recognitionMs: question.recognitionMs,
      activeTypingMs: question.activeTypingMs,
      finalSolveMs: question.finalSolveMs,
      correctionMs: question.correctionMs,
      bottleneck: getQuestionBottleneck(question)
    };
  }

  function isTypingBottleneck(question){
    return safeNumber(question.recognitionMs) <= FAST_RECOGNITION_MS && safeNumber(question.activeTypingMs) >= SLOW_TYPING_MS;
  }

  function isRecognitionBottleneck(question){
    return safeNumber(question.recognitionMs) >= SLOW_SOLVE_MS && safeNumber(question.activeTypingMs) <= SLOW_TYPING_MS;
  }

  function getQuestionBottleneck(question){
    if(question.wrongSubmits > 0) return "errors";
    if(isTypingBottleneck(question)) return "typing";
    if(isRecognitionBottleneck(question)) return "recognition";
    if(question.canonicalChars >= 18 && question.activeTypingMs >= SLOW_TYPING_MS) return "long-name";
    if(safeNumber(question.finalSolveMs) >= SLOW_SOLVE_MS) return "overall";
    return "none";
  }

  function buildRegionStats(questions){
    const groups = new Map();
    for(const question of questions){
      const key = question.continent || "Unknown";
      if(!groups.has(key)){
        groups.set(key, {
          region: key,
          solvedCount: 0,
          firstTryCount: 0,
          solveTimes: [],
          recognitionTimes: [],
          typingChars: 0,
          canonicalChars: 0,
          masteredCount: 0
        });
      }
      const group = groups.get(key);
      group.solvedCount += 1;
      if(question.firstTry) group.firstTryCount += 1;
      if(Number.isFinite(question.finalSolveMs)) group.solveTimes.push(question.finalSolveMs);
      if(Number.isFinite(question.recognitionMs) && question.recognitionMs >= NEAR_INSTANT_RECOGNITION_MS){
        group.recognitionTimes.push(question.recognitionMs);
      }
      group.typingChars += safeNumber(question.typedChars);
      group.canonicalChars += safeNumber(question.canonicalChars);
      if(question.firstTry && safeNumber(question.finalSolveMs) < 2200) group.masteredCount += 1;
    }
    return Array.from(groups.values()).map(group=>({
      region: group.region,
      solvedCount: group.solvedCount,
      medianSolveMs: median(group.solveTimes),
      p90SolveMs: percentile(group.solveTimes, 90),
      medianRecognitionMs: median(group.recognitionTimes),
      firstTryAccuracy: roundMetric(ratio(group.firstTryCount, group.solvedCount), 4),
      typingBurden: roundMetric(ratio(group.canonicalChars, group.solvedCount), 2),
      masteryPercentage: roundMetric(ratio(group.masteredCount, group.solvedCount), 4)
    })).sort((left,right)=>safeNumber(left.medianSolveMs)-safeNumber(right.medianSolveMs));
  }

  function buildQuadrants(questions){
    const recognitionThreshold = median(questions.map(question=>question.recognitionMs).filter(value=>Number.isFinite(value) && value >= NEAR_INSTANT_RECOGNITION_MS)) || FAST_RECOGNITION_MS;
    const typingThreshold = median(questions.map(question=>question.activeTypingMs).filter(Number.isFinite)) || SLOW_TYPING_MS;
    const quadrants = {
      fastRecognitionFastTyping: [],
      fastRecognitionSlowTyping: [],
      slowRecognitionFastTyping: [],
      slowRecognitionSlowTyping: []
    };
    for(const question of questions){
      const fastRecognition = safeNumber(question.recognitionMs, Infinity) <= recognitionThreshold;
      const fastTyping = safeNumber(question.activeTypingMs, Infinity) <= typingThreshold;
      const item = summariseQuestion(question);
      if(fastRecognition && fastTyping) quadrants.fastRecognitionFastTyping.push(item);
      else if(fastRecognition) quadrants.fastRecognitionSlowTyping.push(item);
      else if(fastTyping) quadrants.slowRecognitionFastTyping.push(item);
      else quadrants.slowRecognitionSlowTyping.push(item);
    }
    return quadrants;
  }

  function buildShortcutImpact(questions){
    const shortcutQuestions = questions.filter(question=>question.shortcutUsed || question.autocompleteUsed);
    const canonicalCharsAvoided = shortcutQuestions.reduce((sum, question)=>sum + Math.max(0, question.canonicalChars - question.typedChars), 0);
    const activeCharsPerMs = questions.reduce((sum, question)=>sum + safeNumber(question.typedChars), 0)
      / Math.max(1, questions.reduce((sum, question)=>sum + safeNumber(question.activeTypingMs), 0));
    const estimatedTimeSavedMs = activeCharsPerMs > 0 ? canonicalCharsAvoided / activeCharsPerMs : 0;
    const byAlias = new Map();
    for(const question of shortcutQuestions){
      const key = question.acceptedAlias || question.rawFinalInput || "unknown";
      const existing = byAlias.get(key) || {alias: key, count: 0, countries: new Set(), canonicalCharsAvoided: 0};
      existing.count += 1;
      existing.countries.add(question.country);
      existing.canonicalCharsAvoided += Math.max(0, question.canonicalChars - question.typedChars);
      byAlias.set(key, existing);
    }
    return {
      shortcutAnswers: shortcutQuestions.length,
      canonicalCharsAvoided,
      estimatedTimeSavedMs: roundMetric(estimatedTimeSavedMs, 2),
      mostUsed: Array.from(byAlias.values())
        .sort((left,right)=>right.count-left.count || right.canonicalCharsAvoided-left.canonicalCharsAvoided)
        .map(item=>({
          alias: item.alias,
          count: item.count,
          countries: Array.from(item.countries).slice(0, 6),
          canonicalCharsAvoided: item.canonicalCharsAvoided
        }))
        .slice(0, 12),
      hiddenWeaknesses: shortcutQuestions
        .filter(question=>question.wrongSubmits > 0 || question.canonicalChars - question.typedChars >= 8)
        .map(summariseQuestion)
        .slice(0, 12)
    };
  }

  function buildErrorAnalysis(questions){
    return questions
      .filter(question=>question.wrongSubmits > 0 || question.attempts.some(attempt=>attempt.correct === false))
      .map(question=>{
        const wrongAttempts = question.attempts.filter(attempt=>attempt.correct === false);
        return {
          country: question.country,
          canonicalAnswer: question.canonicalAnswer,
          wrongSubmits: question.wrongSubmits,
          attempts: wrongAttempts.map(attempt=>({
            rawInput: attempt.rawInput,
            editDistanceToCanonical: attempt.editDistanceToCanonical,
            matchedAlias: attempt.matchedAlias,
            errorType: attempt.errorType || classifyError(attempt.rawInput, question.canonicalAnswer, attempt.matchedAlias)
          })),
          likelyErrorType: getLikelyErrorType(wrongAttempts, question),
          correctionMs: question.correctionMs,
          finalSolveMs: question.finalSolveMs
        };
      })
      .sort((left,right)=>right.wrongSubmits-left.wrongSubmits || safeNumber(right.correctionMs)-safeNumber(left.correctionMs));
  }

  function getLikelyErrorType(wrongAttempts, question){
    if(!wrongAttempts.length) return "none";
    const counts = new Map();
    for(const attempt of wrongAttempts){
      const type = attempt.errorType || classifyError(attempt.rawInput, question.canonicalAnswer, attempt.matchedAlias);
      counts.set(type, (counts.get(type) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((left,right)=>right[1]-left[1])[0][0];
  }

  function aggregateCountryMastery(records){
    const groups = new Map();
    for(const rawRecord of safeArray(records)){
      const record = normaliseRecord(rawRecord);
      const date = new Date(record.completedAt || record.createdAt || Date.now());
      for(const question of record.questionAnalytics){
        if(!question.country) continue;
        if(!groups.has(question.country)){
          groups.set(question.country, {
            country: question.country,
            continent: question.continent,
            attemptsSeen: 0,
            solveTimes: [],
            recognitionTimes: [],
            firstTryCount: 0,
            wrongAttemptsTotal: 0,
            commonWrongAnswers: new Map(),
            shortcutCount: 0,
            autocompleteCount: 0,
            typedCharsTotal: 0,
            correctionTimes: [],
            timeline: [],
            lastSeenDate: null
          });
        }
        const group = groups.get(question.country);
        group.attemptsSeen += 1;
        if(Number.isFinite(question.finalSolveMs)) group.solveTimes.push(question.finalSolveMs);
        if(Number.isFinite(question.recognitionMs) && question.recognitionMs >= NEAR_INSTANT_RECOGNITION_MS){
          group.recognitionTimes.push(question.recognitionMs);
        }
        if(question.firstTry) group.firstTryCount += 1;
        group.wrongAttemptsTotal += safeNumber(question.wrongSubmits);
        for(const attempt of question.attempts.filter(item=>item.correct === false)){
          const key = attempt.rawInput || "blank";
          group.commonWrongAnswers.set(key, (group.commonWrongAnswers.get(key) || 0) + 1);
        }
        if(question.shortcutUsed) group.shortcutCount += 1;
        if(question.autocompleteUsed) group.autocompleteCount += 1;
        group.typedCharsTotal += safeNumber(question.typedChars);
        if(Number.isFinite(question.correctionMs)) group.correctionTimes.push(question.correctionMs);
        group.timeline.push({date, solveMs: question.finalSolveMs, firstTry: question.firstTry});
        if(!group.lastSeenDate || date > group.lastSeenDate) group.lastSeenDate = date;
      }
    }
    return Array.from(groups.values()).map(group=>{
      const item = {
        country: group.country,
        continent: group.continent,
        attemptsSeen: group.attemptsSeen,
        medianSolveTime: median(group.solveTimes),
        p90SolveTime: percentile(group.solveTimes, 90),
        medianRecognitionTime: median(group.recognitionTimes),
        firstTryAccuracy: roundMetric(ratio(group.firstTryCount, group.attemptsSeen), 4),
        commonWrongAnswers: Array.from(group.commonWrongAnswers.entries())
          .sort((left,right)=>right[1]-left[1])
          .slice(0, 5)
          .map(([answer, count])=>({answer, count})),
        averageWrongAttempts: roundMetric(ratio(group.wrongAttemptsTotal, group.attemptsSeen), 2),
        shortcutUsageRate: roundMetric(ratio(group.shortcutCount, group.attemptsSeen), 4),
        autocompleteUsageRate: roundMetric(ratio(group.autocompleteCount, group.attemptsSeen), 4),
        averageTypedCharacters: roundMetric(ratio(group.typedCharsTotal, group.attemptsSeen), 2),
        averageCorrectionTime: average(group.correctionTimes),
        lastSeenDate: group.lastSeenDate ? group.lastSeenDate.toISOString() : "",
        trend: getTrend(group.timeline),
        masteryLevel: ""
      };
      item.masteryLevel = classifyMastery(item, group.timeline);
      return item;
    }).sort((left,right)=>{
      const priority = masteryPriority(left.masteryLevel) - masteryPriority(right.masteryLevel);
      return priority || safeNumber(right.p90SolveTime)-safeNumber(left.p90SolveTime);
    });
  }

  function stableDeviceNumber(playerId){
    const text = String(playerId || "");
    if(!text) return "unknown";
    let hash = 2166136261;
    for(let i=0;i<text.length;i += 1){
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `D-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  }

  function aggregateDevices(records){
    const groups = new Map();
    for(const rawRecord of safeArray(records)){
      const record = normaliseRecord(rawRecord);
      const key = record.playerId || `missing:${record.playerName}`;
      if(!groups.has(key)){
        groups.set(key, {
          playerId: record.playerId,
          deviceNumber: stableDeviceNumber(record.playerId),
          names: [],
          leaderboardNames: [],
          records: [],
          lastSeenAt: "",
          runCount: 0
        });
      }
      const group = groups.get(key);
      group.records.push(rawRecord);
      group.runCount += 1;
      group.names = uniqueStrings([...group.names, record.playerName, ...record.knownPlayerNames]);
      group.leaderboardNames = uniqueStrings([...group.leaderboardNames, ...record.leaderboardNames]);
      const seenAt = record.completedAt || record.createdAt || "";
      if(seenAt && (!group.lastSeenAt || new Date(seenAt) > new Date(group.lastSeenAt))){
        group.lastSeenAt = seenAt;
      }
    }

    return Array.from(groups.values()).map(group=>{
      const normalisedRecords = group.records.map(normaliseRecord);
      const metrics = normalisedRecords.map(record=>deriveRunMetrics(record));
      const solved = metrics.reduce((sum, item)=>sum + safeNumber(item.solvedCount), 0);
      const weightedAccuracy = solved
        ? metrics.reduce((sum, item)=>sum + safeNumber(item.firstTryAccuracy) * safeNumber(item.solvedCount), 0) / solved
        : 0;
      const medianSolveValues = metrics.map(item=>item.medianFinalSolveMs).filter(Number.isFinite);
      const mastery = aggregateCountryMastery(group.records);
      const needsRevision = mastery.filter(item=>item.masteryLevel === "Needs revision" || item.masteryLevel === "Error-prone").length;
      return {
        playerId: group.playerId,
        deviceNumber: group.deviceNumber,
        names: group.names,
        leaderboardNames: group.leaderboardNames,
        runCount: group.runCount,
        lastSeenAt: group.lastSeenAt,
        solvedCount: solved,
        medianSolveMs: median(medianSolveValues),
        firstTryAccuracy: roundMetric(weightedAccuracy, 4),
        countriesTracked: mastery.length,
        needsRevision,
        mastery,
        records: group.records
      };
    }).sort((left,right)=>{
      const byRuns = safeNumber(right.runCount) - safeNumber(left.runCount);
      if(byRuns) return byRuns;
      return new Date(right.lastSeenAt || 0) - new Date(left.lastSeenAt || 0);
    });
  }

  function getTrend(timeline){
    const ordered = timeline
      .filter(item=>Number.isFinite(item.solveMs))
      .sort((left,right)=>left.date-right.date);
    if(ordered.length < 4) return "unknown";
    const split = Math.max(1, Math.floor(ordered.length / 3));
    const early = median(ordered.slice(0, split).map(item=>item.solveMs));
    const recent = median(ordered.slice(-split).map(item=>item.solveMs));
    if(!early || !recent) return "unknown";
    if(recent <= early * 0.9) return "improving";
    if(recent >= early * 1.1) return "worsening";
    return "stable";
  }

  function classifyMastery(item){
    const medianSolve = safeNumber(item.medianSolveTime, Infinity);
    const medianRecognition = safeNumber(item.medianRecognitionTime, Infinity);
    const p90Solve = safeNumber(item.p90SolveTime, Infinity);
    const accuracy = safeNumber(item.firstTryAccuracy);
    const averageWrong = safeNumber(item.averageWrongAttempts);
    const correction = safeNumber(item.averageCorrectionTime);
    const daysSinceSeen = item.lastSeenDate
      ? (Date.now() - new Date(item.lastSeenDate).getTime()) / 86400000
      : Infinity;

    if(daysSinceSeen > 30 || accuracy < 0.55) return "Needs revision";
    if(averageWrong >= 0.6 || accuracy < 0.75) return "Error-prone";
    if(p90Solve > medianSolve * 2.2 && p90Solve > 5000) return "Unstable";
    if(medianRecognition <= FAST_RECOGNITION_MS && medianSolve >= 3200 && correction < 900) return "Typing bottleneck";
    if(medianRecognition >= 1800 && medianSolve < 4200) return "Recognition bottleneck";
    if(accuracy >= 0.9 && medianSolve <= 2400 && p90Solve <= 4200) return "Mastered";
    if(accuracy >= 0.85) return "Known but slow";
    return "Needs revision";
  }

  function masteryPriority(level){
    const order = {
      "Needs revision": 0,
      "Error-prone": 1,
      "Recognition bottleneck": 2,
      "Typing bottleneck": 3,
      "Unstable": 4,
      "Known but slow": 5,
      "Mastered": 6
    };
    return order[level] === undefined ? 7 : order[level];
  }

  function generateRunAnalysis(input, metricsInput, countryMastery=[]){
    const record = input && input.questionAnalytics ? input : normaliseRecord(input || {});
    const metrics = metricsInput || deriveRunMetrics(record);
    const paragraphs = [];
    const recommendations = [];
    const strongestRegions = [...safeArray(metrics.regionStats)]
      .filter(region=>region.solvedCount > 0)
      .sort((left,right)=>safeNumber(left.medianSolveMs)-safeNumber(right.medianSolveMs))
      .slice(0, 2);
    const weakestRegions = [...safeArray(metrics.regionStats)]
      .filter(region=>region.solvedCount > 0)
      .sort((left,right)=>safeNumber(right.p90SolveMs)-safeNumber(left.p90SolveMs))
      .slice(0, 2);
    const slowest = safeArray(metrics.slowestFive);
    const recognitionTargets = safeArray(metrics.recognitionBottlenecks).slice(0, 4);
    const typingTargets = safeArray(metrics.typingBottlenecks).slice(0, 4);
    const errorTargets = safeArray(metrics.highestErrorCountries).slice(0, 4);
    const shortcutHidden = metrics.shortcutImpact ? safeArray(metrics.shortcutImpact.hiddenWeaknesses).slice(0, 4) : [];
    const needsRevision = safeArray(countryMastery)
      .filter(item=>["Needs revision", "Error-prone", "Recognition bottleneck", "Typing bottleneck"].includes(item.masteryLevel))
      .slice(0, 6);

    const medianSolve = formatMs(metrics.medianFinalSolveMs);
    const p90Solve = formatMs(metrics.p90FinalSolveMs);
    paragraphs.push(`Overall, ${record.playerName || "this player"} solved ${metrics.solvedCount}/${metrics.totalQuestions} in ${formatDuration(metrics.totalDurationMs)} at ${formatNumber(metrics.countriesPerMinute)} countries per minute. Median solve time was ${medianSolve}, with p90 at ${p90Solve}.`);

    const speedSources = [];
    if(safeNumber(metrics.medianRecognitionMs) <= FAST_RECOGNITION_MS) speedSources.push("recognition");
    if(safeNumber(metrics.activeInputWpm) >= 55) speedSources.push("typing");
    if(safeNumber(metrics.shortcutUsageRate) >= 0.2) speedSources.push("shortcuts");
    if(safeNumber(metrics.firstTryAccuracy) >= 0.9) speedSources.push("accuracy");
    paragraphs.push(speedSources.length
      ? `Speed came mostly from ${joinHuman(speedSources)}. Canonical WPM was ${formatNumber(metrics.effectiveCanonicalWpm)}, while actual input WPM was ${formatNumber(metrics.activeInputWpm)}, so shortcut and typing effects are separated.`
      : `The run was not dominated by one clear strength. Recognition, typing, shortcuts, and accuracy all need to be read together for this result.`);

    if(slowest.length && safeNumber(metrics.outlierImpact) >= 0.25){
      paragraphs.push(`The run was affected by outliers: the slowest five countries used ${formatPercent(metrics.slowestFiveTimePercent)} of the total time. The main outliers were ${slowest.slice(0, 5).map(item=>item.country).join(", ")}.`);
    }else if(safeNumber(metrics.consistencyScore) !== null){
      paragraphs.push(`Consistency score was ${metrics.consistencyScore}/100, so the pace was ${metrics.consistencyScore >= 75 ? "fairly stable" : "uneven"}.`);
    }

    if(strongestRegions.length){
      paragraphs.push(`Strongest region${strongestRegions.length > 1 ? "s" : ""}: ${strongestRegions.map(region=>`${region.region} (${formatMs(region.medianSolveMs)} median)`).join(", ")}.`);
    }
    if(weakestRegions.length){
      paragraphs.push(`Weakest region${weakestRegions.length > 1 ? "s" : ""}: ${weakestRegions.map(region=>`${region.region} (${formatMs(region.p90SolveMs)} p90)`).join(", ")}.`);
    }
    if(shortcutHidden.length){
      paragraphs.push(`Shortcut/autocomplete heavily affected timing for ${shortcutHidden.map(item=>item.country).join(", ")}. These answers were fast in-game but should not be treated as full-name typing evidence.`);
    }

    if(needsRevision.length) recommendations.push(`Revision targets: ${needsRevision.map(item=>item.country).join(", ")}.`);
    if(recognitionTargets.length) recommendations.push(`Recognition practice: ${recognitionTargets.map(item=>item.country).join(", ")}.`);
    if(typingTargets.length) recommendations.push(`Typing practice: ${typingTargets.map(item=>item.country).join(", ")}.`);
    if(errorTargets.length) recommendations.push(`Mistake cleanup: ${errorTargets.map(item=>item.country).join(", ")}.`);
    if(!recommendations.length && slowest.length) recommendations.push(`Next practice targets: ${slowest.slice(0, 4).map(item=>item.country).join(", ")}.`);

    return {
      paragraphs,
      recommendations,
      strongestRegions,
      weakestRegions,
      countriesNeedingRevision: needsRevision,
      typingBottlenecks: typingTargets,
      recognitionBottlenecks: recognitionTargets,
      shortcutAffectedCountries: shortcutHidden,
      outliers: slowest
    };
  }

  function formatDuration(ms){
    const value = Math.max(0, Math.round(safeNumber(ms)));
    const minutes = Math.floor(value / 60000);
    const seconds = Math.floor((value % 60000) / 1000);
    const tenths = Math.floor((value % 1000) / 100);
    return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
  }

  function formatMs(ms){
    const number = Number(ms);
    if(!Number.isFinite(number)) return "unknown";
    if(number >= 1000) return `${roundMetric(number / 1000, 1)}s`;
    return `${Math.round(number)}ms`;
  }

  function formatNumber(value){
    const number = Number(value);
    if(!Number.isFinite(number)) return "unknown";
    return number >= 100 ? String(Math.round(number)) : String(roundMetric(number, 1));
  }

  function formatPercent(value){
    const number = Number(value);
    if(!Number.isFinite(number)) return "unknown";
    return `${roundMetric(number * 100, 1)}%`;
  }

  function joinHuman(items){
    if(items.length <= 1) return items.join("");
    if(items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  }

  function uniqueStrings(values){
    const output = [];
    for(const value of values){
      const text = String(value || "").trim();
      if(text && !output.includes(text)) output.push(text);
    }
    return output;
  }

  window.SpeedrunAnalytics = {
    version: ANALYTICS_VERSION,
    countAnswerChars,
    wordCount,
    hasDiacritics,
    nameComplexity,
    editDistance,
    classifyError,
    normaliseRecord,
    normaliseQuestion,
    deriveRunMetrics,
    aggregateCountryMastery,
    aggregateDevices,
    generateRunAnalysis,
    stableDeviceNumber,
    formatDuration,
    formatMs,
    formatNumber,
    formatPercent,
    roundMetric
  };
})();
