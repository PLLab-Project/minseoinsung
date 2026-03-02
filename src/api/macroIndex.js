import { clamp, round2, round6, toNumber } from "./playMetrics";

export const MACRO_FEATURE_VERSION = "macro-features-v1";
export const MACRO_RULESET_VERSION = "macro-rules-v2026-02-12-sparse-fallback";

export const MACRO_VECTOR_KEYS = Object.freeze([
  "meanAbsDelta",
  "stdAbsDelta",
  "perfectRate",
  "missRate",
  "impossiblyFastRate",
  "deltaAutocorr",
  "fixedOffsetRate",
]);

export const MACRO_RULE_CONFIG = Object.freeze({
  stdAbsLowMs: 8,
  stdAbsWarnMs: 12,
  fastRateWarn: 0.2,
  fastRateHigh: 0.35,
  perfectRateWarn: 0.95,
  perfectRateHigh: 0.98,
  autocorrHigh: 0.6,
  fixedOffsetWindowMs: 3,
  fixedOffsetRateHigh: 0.7,
  pendingScore: 60,
});

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const mean = (values) => {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

const stdDev = (values) => {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const autocorrLag1 = (values) => {
  if (values.length < 2) return 0;
  const avg = mean(values);

  let numerator = 0;
  let denominator = 0;

  for (let index = 1; index < values.length; index += 1) {
    numerator += (values[index] - avg) * (values[index - 1] - avg);
  }

  for (const value of values) {
    denominator += (value - avg) ** 2;
  }

  return denominator === 0 ? 0 : numerator / denominator;
};

const extractDelta = (hit) => {
  const deltaCandidate =
    hit?.deltaMs ??
    hit?.delta ??
    hit?.delta_ms ??
    hit?.deltaMsSigned ??
    undefined;

  if (isFiniteNumber(deltaCandidate)) return Number(deltaCandidate);

  const absDelta = hit?.absDeltaMs ?? hit?.abs_delta_ms;
  if (isFiniteNumber(absDelta)) return Number(absDelta);

  const hitTime = hit?.hitTime ?? hit?.hitTimeMs ?? hit?.hit_time_ms;
  const scheduled = hit?.scheduledTime ?? hit?.scheduledTimeMs ?? hit?.scheduled_time_ms;
  if (isFiniteNumber(hitTime) && isFiniteNumber(scheduled)) {
    return Number(hitTime) - Number(scheduled);
  }

  return null;
};

export function computeMacroFeatures({
  hits = [],
  perfect = 0,
  good = 0,
  miss = 0,
  notes = null,
  comboMax = 0,
  score = 0,
  meanAbsDeltaMs = null,
  stdAbsDeltaMs = null,
} = {}) {
  const hitList = Array.isArray(hits) ? hits : [];
  const deltas = [];

  let perfectFromHits = 0;
  let goodFromHits = 0;
  let missFromHits = 0;

  for (const hit of hitList) {
    const resultText = String(hit?.result ?? "").toLowerCase();
    if (resultText.includes("perfect")) perfectFromHits += 1;
    else if (resultText.includes("good")) goodFromHits += 1;
    else if (resultText.includes("miss")) missFromHits += 1;

    const delta = extractDelta(hit);
    if (isFiniteNumber(delta)) deltas.push(Number(delta));
  }

  const hasResultFromHits = perfectFromHits + goodFromHits + missFromHits > 0;

  const perfectCount = hasResultFromHits
    ? perfectFromHits
    : Math.max(0, Math.round(toNumber(perfect, 0)));
  const goodCount = hasResultFromHits
    ? goodFromHits
    : Math.max(0, Math.round(toNumber(good, 0)));
  const missCount = hasResultFromHits
    ? missFromHits
    : Math.max(0, Math.round(toNumber(miss, 0)));

  const providedNotes = notes == null ? 0 : Math.max(0, Math.round(toNumber(notes, 0)));
  const inferredNotes = perfectCount + goodCount + missCount;
  const totalNotes = Math.max(providedNotes, inferredNotes, hitList.length, 1);

  const absDeltas = deltas.map((delta) => Math.abs(delta));
  const fallbackMean = Math.max(0, toNumber(meanAbsDeltaMs, 0));
  const fallbackStd = Math.max(0, toNumber(stdAbsDeltaMs, 0));

  const meanAbsDelta = absDeltas.length ? mean(absDeltas) : fallbackMean;
  const stdAbsDelta = absDeltas.length ? stdDev(absDeltas) : fallbackStd;
  const meanSignedDelta = deltas.length ? mean(deltas) : 0;

  const fixedOffsetRate = deltas.length
    ? deltas.filter((delta) => Math.abs(delta - meanSignedDelta) <= MACRO_RULE_CONFIG.fixedOffsetWindowMs)
        .length / deltas.length
    : 0;

  const impossiblyFastRate = deltas.length
    ? deltas.filter((delta) => Math.abs(delta) <= 10).length / deltas.length
    : 0;

  const comboRate = clamp(toNumber(comboMax, 0) / totalNotes, 0, 1);
  const weightedAccuracy = clamp(
    (perfectCount + goodCount * 0.7) / totalNotes,
    0,
    1
  );
  const goodRate = clamp(goodCount / totalNotes, 0, 1);
  const scorePerNote = Math.max(0, toNumber(score, 0)) / totalNotes;

  return {
    meanAbsDelta: round6(Math.max(0, meanAbsDelta)),
    stdAbsDelta: round6(Math.max(0, stdAbsDelta)),
    perfectRate: round6(clamp(perfectCount / totalNotes, 0, 1)),
    goodRate: round6(goodRate),
    weightedAccuracy: round6(weightedAccuracy),
    comboRate: round6(comboRate),
    scorePerNote: round6(scorePerNote),
    missRate: round6(clamp(missCount / totalNotes, 0, 1)),
    impossiblyFastRate: round6(clamp(impossiblyFastRate, 0, 1)),
    deltaAutocorr: round6(clamp(autocorrLag1(deltas), -1, 1)),
    meanSignedDelta: round6(meanSignedDelta),
    fixedOffsetRate: round6(clamp(fixedOffsetRate, 0, 1)),
    sampleHitCount: deltas.length,
    totalNotes,
  };
}

export function computeRuleMacroScore(features, ruleConfig = MACRO_RULE_CONFIG) {
  const meanAbsDelta = Math.max(0, toNumber(features?.meanAbsDelta, 0));
  const stdAbsDelta = Math.max(0, toNumber(features?.stdAbsDelta, 0));
  const fastRate = clamp(toNumber(features?.impossiblyFastRate, 0), 0, 1);
  const perfectRate = clamp(toNumber(features?.perfectRate, 0), 0, 1);
  const goodRate = clamp(toNumber(features?.goodRate, 0), 0, 1);
  const weightedAccuracy = clamp(
    toNumber(features?.weightedAccuracy, perfectRate + goodRate * 0.7),
    0,
    1
  );
  const comboRate = clamp(toNumber(features?.comboRate, 0), 0, 1);
  const missRate = clamp(toNumber(features?.missRate, 0), 0, 1);
  const fixedOffsetRate = clamp(toNumber(features?.fixedOffsetRate, 0), 0, 1);
  const autocorr = clamp(toNumber(features?.deltaAutocorr, 0), -1, 1);
  const sampleHitCount = Math.max(0, toNumber(features?.sampleHitCount, 0));
  const totalNotes = Math.max(0, toNumber(features?.totalNotes, 0));
  const hasTimingSignal =
    sampleHitCount >= 8 ||
    stdAbsDelta > 0 ||
    meanAbsDelta > 0 ||
    fastRate > 0 ||
    fixedOffsetRate > 0 ||
    Math.abs(autocorr) > 0.001;
  const hasNoteSignal = totalNotes > 0 || perfectRate > 0 || missRate > 0;

  let score = 0;
  const reasons = [];
  const pushReason = (value, text) => {
    if (value <= 0) return;
    score += value;
    reasons.push(text);
  };

  if (hasTimingSignal) {
    const varianceRisk =
      clamp(
        (ruleConfig.stdAbsWarnMs - stdAbsDelta) / Math.max(ruleConfig.stdAbsWarnMs, 1),
        0,
        1
      ) * 26;
    pushReason(varianceRisk, "Timing variance contributes risk");

    const meanDeltaRisk = clamp((22 - meanAbsDelta) / 22, 0, 1) * 8;
    pushReason(meanDeltaRisk, "Timing offset tightness contributes risk");
  }

  const fastRisk =
    clamp((fastRate - 0.02) / Math.max(ruleConfig.fastRateHigh - 0.02, 0.0001), 0, 1) * 24;
  pushReason(fastRisk, "Fast reaction pattern contributes risk");

  if (hasNoteSignal) {
    const perfectRiskGate = clamp((15 - stdAbsDelta) / 15, 0, 1);
    const perfectRisk =
      clamp((perfectRate - 0.85) / 0.15, 0, 1) * perfectRiskGate * 14;
    pushReason(perfectRisk, "High perfect rate with low variance contributes risk");
  }

  const fixedOffsetRiskGate = clamp((15 - stdAbsDelta) / 15, 0, 1);
  const fixedOffsetRisk =
    clamp(
      (fixedOffsetRate - 0.2) /
        Math.max(ruleConfig.fixedOffsetRateHigh - 0.2, 0.0001),
      0,
      1
    ) *
    fixedOffsetRiskGate *
    14;
  pushReason(fixedOffsetRisk, "Fixed timing offset contributes risk");

  const autocorrRisk =
    clamp((autocorr - 0.15) / Math.max(ruleConfig.autocorrHigh - 0.15, 0.0001), 0, 1) * 10;
  pushReason(autocorrRisk, "Repeated timing pattern contributes risk");

  const comboRisk =
    (missRate <= 0.03 ? 1 : 0) *
    clamp((perfectRate - 0.9) / 0.1, 0, 1) *
    clamp((fastRate - 0.1) / 0.25, 0, 1) *
    10;
  pushReason(comboRisk, "Low miss + fast-perfect combo contributes risk");

  // Fallback: when timing signals are sparse/missing, use per-session note pattern rules.
  if (!hasTimingSignal && hasNoteSignal) {
    const noteConsistency = clamp((weightedAccuracy - 0.88) / 0.12, 0, 1);
    const missScarcity = clamp((0.03 - missRate) / 0.03, 0, 1);
    const comboDominance = clamp((comboRate - 0.8) / 0.2, 0, 1);
    const perfectDominance = clamp((perfectRate - goodRate - 0.55) / 0.35, 0, 1);

    const sparseBaseRisk =
      (noteConsistency * 0.4 +
        missScarcity * 0.2 +
        comboDominance * 0.25 +
        perfectDominance * 0.15) *
      45;
    pushReason(
      sparseBaseRisk,
      "Sparse timing data: note-pattern rule contributes risk"
    );

    const longSessionFactor = clamp((totalNotes - 120) / 180, 0, 1);
    const extremeAccuracy = clamp((weightedAccuracy - 0.985) / 0.015, 0, 1);
    const sparseExtremeRisk =
      extremeAccuracy *
      missScarcity *
      comboDominance *
      longSessionFactor *
      25;
    pushReason(
      sparseExtremeRisk,
      "Sparse timing data: extreme consistency in long session"
    );
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    reasons: reasons.length ? reasons : ["No strong macro signal"],
    threshold: ruleConfig.pendingScore,
  };
}

export function vectorizeMacroFeatures(features = {}) {
  return MACRO_VECTOR_KEYS.map((key) => toNumber(features?.[key], 0));
}

const normalizeModelArray = (value) =>
  Array.isArray(value) ? value.map((item) => toNumber(item, 0)) : null;

export function isValidMacroModel(model) {
  if (!model || model.enabled === false) return false;

  const weights = normalizeModelArray(model.weights);
  const means = normalizeModelArray(model.means);
  const stds = normalizeModelArray(model.stds);

  return (
    !!weights &&
    !!means &&
    !!stds &&
    weights.length === MACRO_VECTOR_KEYS.length &&
    means.length === MACRO_VECTOR_KEYS.length &&
    stds.length === MACRO_VECTOR_KEYS.length
  );
}

export function predictMacroMlScore(features, model) {
  if (!isValidMacroModel(model)) {
    return { score: null, probability: null, reason: "ML model unavailable" };
  }

  const weights = normalizeModelArray(model.weights);
  const means = normalizeModelArray(model.means);
  const stds = normalizeModelArray(model.stds);
  const bias = toNumber(model.bias, 0);

  const vector = vectorizeMacroFeatures(features).map(
    (value, index) => (value - means[index]) / (stds[index] || 1)
  );

  const z = vector.reduce((acc, value, index) => acc + value * weights[index], bias);
  const probability = 1 / (1 + Math.exp(-z));

  return {
    score: round2(clamp(probability * 100, 0, 100)),
    probability: round6(probability),
    reason: "ML logistic prediction",
  };
}

const normalizeMode = (mode) => {
  const value = String(mode ?? "").toLowerCase();
  if (value === "ml") return "ml";
  if (value === "hybrid") return "hybrid";
  return "rule";
};

export function evaluateMacroIndex({ features, model = null } = {}) {
  const normalizedFeatures = features ?? computeMacroFeatures({});
  const rule = computeRuleMacroScore(normalizedFeatures);

  if (!isValidMacroModel(model)) {
    return {
      macroScore: rule.score,
      ruleScore: rule.score,
      mlScore: null,
      detector: "RULES",
      reasons: rule.reasons,
      modelVersion: null,
      featureVersion: MACRO_FEATURE_VERSION,
      rulesetVersion: MACRO_RULESET_VERSION,
      threshold: rule.threshold,
    };
  }

  const ml = predictMacroMlScore(normalizedFeatures, model);
  const mode = normalizeMode(model.mode);
  const blendWeight = clamp(toNumber(model.blendWeight, 0.6), 0, 1);

  let finalScore = rule.score;
  let detector = "RULES";

  if (mode === "ml" && ml.score != null) {
    finalScore = ml.score;
    detector = "ML";
  } else if (mode === "hybrid" && ml.score != null) {
    finalScore = round2(rule.score * (1 - blendWeight) + ml.score * blendWeight);
    detector = "HYBRID";
  }

  return {
    macroScore: clamp(finalScore, 0, 100),
    ruleScore: rule.score,
    mlScore: ml.score,
    detector,
    reasons: detector === "RULES" ? rule.reasons : [...rule.reasons, ml.reason],
    modelVersion: model.version ?? null,
    featureVersion: MACRO_FEATURE_VERSION,
    rulesetVersion: MACRO_RULESET_VERSION,
    threshold: rule.threshold,
  };
}

export function labelToBinary(labelValue) {
  if (typeof labelValue === "number") return labelValue > 0 ? 1 : 0;
  if (typeof labelValue === "boolean") return labelValue ? 1 : 0;

  const normalized = String(labelValue ?? "").trim().toLowerCase();
  if (!normalized) return null;

  if (["1", "true", "yes", "cheat", "macro", "suspicious"].includes(normalized)) return 1;
  if (["0", "false", "no", "clean", "ok", "normal"].includes(normalized)) return 0;

  return null;
}

export function trainLogisticMacroModel(
  samples,
  { epochs = 300, learningRate = 0.08, l2 = 0.001 } = {}
) {
  const normalizedSamples = (Array.isArray(samples) ? samples : [])
    .map((sample) => ({
      features: sample?.features ?? {},
      label: labelToBinary(sample?.label),
    }))
    .filter((sample) => sample.label === 0 || sample.label === 1);

  if (normalizedSamples.length < 20) {
    throw new Error("Need at least 20 labeled samples to train an ML model.");
  }

  const labels = normalizedSamples.map((sample) => sample.label);
  const rawMatrix = normalizedSamples.map((sample) => vectorizeMacroFeatures(sample.features));

  const means = MACRO_VECTOR_KEYS.map((_, index) => mean(rawMatrix.map((row) => row[index])));
  const stds = MACRO_VECTOR_KEYS.map((_, index) => stdDev(rawMatrix.map((row) => row[index])));
  const matrix = rawMatrix.map((row) =>
    row.map((value, index) => (value - means[index]) / (stds[index] || 1))
  );

  let weights = new Array(MACRO_VECTOR_KEYS.length).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const dw = new Array(weights.length).fill(0);
    let db = 0;

    for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
      const linear = matrix[rowIndex].reduce(
        (acc, value, index) => acc + value * weights[index],
        bias
      );
      const pred = 1 / (1 + Math.exp(-linear));
      const err = pred - labels[rowIndex];

      db += err;
      for (let idx = 0; idx < weights.length; idx += 1) {
        dw[idx] += err * matrix[rowIndex][idx];
      }
    }

    const sampleCount = matrix.length;
    weights = weights.map(
      (weight, index) =>
        weight - learningRate * (dw[index] / sampleCount + l2 * weight / sampleCount)
    );
    bias -= learningRate * (db / sampleCount);
  }

  const sampleCount = normalizedSamples.length;
  const positiveCount = labels.filter((label) => label === 1).length;
  const negativeCount = sampleCount - positiveCount;

  return {
    model: {
      enabled: true,
      mode: "hybrid",
      blendWeight: 0.6,
      version: `macro-ml-${new Date().toISOString().slice(0, 10)}`,
      weights: weights.map((weight) => round6(weight)),
      bias: round6(bias),
      means: means.map((value) => round6(value)),
      stds: stds.map((value) => round6(value)),
      featureKeys: MACRO_VECTOR_KEYS,
      featureVersion: MACRO_FEATURE_VERSION,
      rulesetVersion: MACRO_RULESET_VERSION,
    },
    stats: {
      sampleCount,
      positiveCount,
      negativeCount,
      epochs,
      learningRate,
      l2,
    },
  };
}
