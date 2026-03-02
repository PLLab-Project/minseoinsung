import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { isValidMacroModel, MACRO_VECTOR_KEYS } from "./macroIndex";
import { toNumber } from "./playMetrics";

const MODEL_COLLECTION = "macro_models";
const ACTIVE_MODEL_DOC = "active";
const CACHE_TTL_MS = 60 * 1000;
const DEFAULT_MIN_SAMPLE_COUNT_FOR_ML = 200;
const DEFAULT_MIN_CLASS_COUNT_FOR_ML = 40;

let cachedModel = null;
let cachedAt = 0;

const toNumberArray = (value, expectedLength) => {
  if (!Array.isArray(value) || value.length !== expectedLength) return null;
  return value.map((item) => toNumber(item, 0));
};

function normalizeMacroModel(raw = {}) {
  const vectorSize = MACRO_VECTOR_KEYS.length;
  const weights = toNumberArray(raw.weights, vectorSize);
  const means = toNumberArray(raw.means, vectorSize);
  const stds = toNumberArray(raw.stds, vectorSize);

  const model = {
    enabled: raw.enabled !== false,
    mode: raw.mode ?? "hybrid",
    blendWeight: toNumber(raw.blendWeight, 0.6),
    version: raw.version ?? null,
    weights,
    bias: toNumber(raw.bias, 0),
    means,
    stds,
    featureKeys: Array.isArray(raw.featureKeys) ? raw.featureKeys : MACRO_VECTOR_KEYS,
    featureVersion: raw.featureVersion ?? null,
    rulesetVersion: raw.rulesetVersion ?? null,
    trainingSampleCount: Math.max(0, toNumber(raw.trainingSampleCount, 0)),
    trainingPositiveCount: Math.max(0, toNumber(raw.trainingPositiveCount, 0)),
    trainingNegativeCount: Math.max(0, toNumber(raw.trainingNegativeCount, 0)),
    minSampleCountForMl: Math.max(
      20,
      toNumber(raw.minSampleCountForMl, DEFAULT_MIN_SAMPLE_COUNT_FOR_ML)
    ),
    minClassCountForMl: Math.max(
      10,
      toNumber(raw.minClassCountForMl, DEFAULT_MIN_CLASS_COUNT_FOR_ML)
    ),
  };

  return isValidMacroModel(model) ? model : null;
}

export function clearMacroModelCache() {
  cachedModel = null;
  cachedAt = 0;
}

export async function fetchActiveMacroModel({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && cachedModel && now - cachedAt < CACHE_TTL_MS) {
    return cachedModel;
  }

  const snap = await getDoc(doc(db, MODEL_COLLECTION, ACTIVE_MODEL_DOC));
  if (!snap.exists()) {
    clearMacroModelCache();
    return null;
  }

  const normalized = normalizeMacroModel(snap.data());
  if (!normalized) {
    clearMacroModelCache();
    return null;
  }

  cachedModel = normalized;
  cachedAt = now;
  return normalized;
}

export async function upsertActiveMacroModel(
  model,
  { updatedBy = null, note = null } = {}
) {
  const normalized = normalizeMacroModel(model);
  if (!normalized) {
    throw new Error("invalid-macro-model");
  }

  await setDoc(
    doc(db, MODEL_COLLECTION, ACTIVE_MODEL_DOC),
    {
      ...normalized,
      updatedBy,
      note,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  clearMacroModelCache();
  return normalized;
}

export function resolveMacroScoringModel(model) {
  if (!isValidMacroModel(model)) {
    return {
      modelForScoring: null,
      readyForMl: false,
      reason: "No valid active model",
      minSampleCountForMl: DEFAULT_MIN_SAMPLE_COUNT_FOR_ML,
      minClassCountForMl: DEFAULT_MIN_CLASS_COUNT_FOR_ML,
      trainingSampleCount: 0,
      trainingPositiveCount: 0,
      trainingNegativeCount: 0,
    };
  }

  const minSampleCountForMl = Math.max(
    20,
    toNumber(model.minSampleCountForMl, DEFAULT_MIN_SAMPLE_COUNT_FOR_ML)
  );
  const minClassCountForMl = Math.max(
    10,
    toNumber(model.minClassCountForMl, DEFAULT_MIN_CLASS_COUNT_FOR_ML)
  );

  const trainingSampleCount = Math.max(0, toNumber(model.trainingSampleCount, 0));
  const trainingPositiveCount = Math.max(0, toNumber(model.trainingPositiveCount, 0));
  const trainingNegativeCount = Math.max(0, toNumber(model.trainingNegativeCount, 0));

  const readyForMl =
    trainingSampleCount >= minSampleCountForMl &&
    trainingPositiveCount >= minClassCountForMl &&
    trainingNegativeCount >= minClassCountForMl;

  if (readyForMl) {
    return {
      modelForScoring: model,
      readyForMl: true,
      reason: "ML-ready",
      minSampleCountForMl,
      minClassCountForMl,
      trainingSampleCount,
      trainingPositiveCount,
      trainingNegativeCount,
    };
  }

  return {
    modelForScoring: null,
    readyForMl: false,
    reason: "Insufficient labeled data for ML. Using rules.",
    minSampleCountForMl,
    minClassCountForMl,
    trainingSampleCount,
    trainingPositiveCount,
    trainingNegativeCount,
  };
}
