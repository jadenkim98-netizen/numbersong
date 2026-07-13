// Numbersong — pure app/session flow helpers.
// These helpers keep high-churn decision logic out of the large React component so
// behavior is easier to reason about and unit test.

export function qCountForLevel(lvl, opts = {}) {
  const { testMode = false, jojoMode = false, defaultSessionLen = 20 } = opts;
  if (testMode || jojoMode) return 3;
  return (lvl && lvl.qCount) || defaultSessionLen;
}

export function passRateForLevel(lvl, opts = {}) {
  const { testMode = false, defaultPassRate = 0.8 } = opts;
  if (testMode) return 0.6;
  return (lvl && lvl.pass) || defaultPassRate;
}

export function passCountForLevel(lvl, opts = {}) {
  const { jojoMode = false } = opts;
  if (jojoMode) return 1;
  return Math.ceil(passRateForLevel(lvl, opts) * qCountForLevel(lvl, opts));
}

export function isPassedBest(best, lvl, opts = {}) {
  return best >= passCountForLevel(lvl, opts);
}

export function starsForLevelBest(best, lvl, opts = {}) {
  const pass = passCountForLevel(lvl, opts);
  const qCount = qCountForLevel(lvl, opts);
  if (best < pass) return 0;
  if (best >= qCount) return 3;
  if (best >= qCount - 1) return 2;
  return 1;
}

export function totalStarsForProgress(progress, levelsByMode, opts = {}) {
  let total = 0;
  for (const [mode, levels] of Object.entries(levelsByMode || {})) {
    const modeProgress = (progress && progress[mode]) || {};
    for (let i = 0; i < levels.length; i++) {
      const best = modeProgress[i] || 0;
      total += starsForLevelBest(best, levels[i], opts);
    }
  }
  return total;
}

export function mergeBestProgress(prev, mode, levelIdx, firstTries) {
  if (levelIdx == null) return prev;
  const cur = (prev[mode] && prev[mode][levelIdx]) || 0;
  if (firstTries <= cur) return prev;
  return { ...prev, [mode]: { ...prev[mode], [levelIdx]: firstTries } };
}

export function countFirstTries(results) {
  return (results || []).filter((r) => r && r.firstTry).length;
}

export function chooseSessionKey({ mode, lvl, musicKey, randKey }) {
  if (mode === "melody") {
    const km = lvl.keyMode;
    if (km === "c") return "C";
    if (km === "not-c") return randKey(["C"]);
    return randKey([]);
  }
  if (lvl.keyMode === "not-c") return randKey([musicKey]);
  if (lvl.keyMode === "random") return randKey([]);
  return musicKey;
}

export function shouldCelebrateStageClear(args) {
  const {
    fromAdventure,
    advStageId,
    alreadyCleared,
    testMode,
    firstTries,
    passCount,
    levelIdx,
    lastIdx,
  } = args;
  if (!(fromAdventure && advStageId != null) || alreadyCleared) return false;
  if (testMode) return firstTries >= passCount;
  return levelIdx === lastIdx && firstTries >= passCount;
}
