import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  computeMacroFeatures,
  labelToBinary,
  trainLogisticMacroModel,
} from "./macroIndex";
import { toNumber } from "./playMetrics";

const DEFAULT_SAMPLE_LIMIT = 1000;
const LABEL_KEYS = ["macroLabel", "label", "adminVerdict", "verdict"];

function pickLabel(data = {}) {
  for (const key of LABEL_KEYS) {
    if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== "") {
      return data[key];
    }
  }
  return null;
}

function pickFeatures(data = {}) {
  if (data.macroFeatures && typeof data.macroFeatures === "object") {
    return {
      meanAbsDelta: toNumber(data.macroFeatures.meanAbsDelta, 0),
      stdAbsDelta: toNumber(data.macroFeatures.stdAbsDelta, 0),
      perfectRate: toNumber(data.macroFeatures.perfectRate, 0),
      missRate: toNumber(data.macroFeatures.missRate, 0),
      impossiblyFastRate: toNumber(data.macroFeatures.impossiblyFastRate, 0),
      deltaAutocorr: toNumber(data.macroFeatures.deltaAutocorr, 0),
      fixedOffsetRate: toNumber(data.macroFeatures.fixedOffsetRate, 0),
    };
  }

  return computeMacroFeatures({
    perfect: data.perfect,
    good: data.good,
    miss: data.miss,
    notes: data.notes,
    comboMax: data.comboMax,
    score: data.score,
    meanAbsDeltaMs: data.meanAbsDeltaMs,
    stdAbsDeltaMs: data.stdAbsDeltaMs,
  });
}

export async function fetchLabeledMacroSamples({ sampleLimit = DEFAULT_SAMPLE_LIMIT } = {}) {
  const safeLimit = Math.min(Math.max(20, toNumber(sampleLimit, DEFAULT_SAMPLE_LIMIT)), 5000);
  const samplesQuery = query(
    collection(db, "play_results"),
    orderBy("createdAt", "desc"),
    limit(safeLimit)
  );

  const snap = await getDocs(samplesQuery);
  const samples = [];

  snap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const labelValue = pickLabel(data);
    const label = labelToBinary(labelValue);
    if (label == null) return;

    samples.push({
      id: docSnap.id,
      label,
      features: pickFeatures(data),
    });
  });

  return samples;
}

export function trainMacroModelFromSamples(samples, options = {}) {
  return trainLogisticMacroModel(samples, options);
}

export async function trainAndPublishMacroModel({
  sampleLimit = DEFAULT_SAMPLE_LIMIT,
  updatedBy = null,
  note = null,
  trainingOptions = {},
} = {}) {
  const samples = await fetchLabeledMacroSamples({ sampleLimit });
  const { model, stats } = trainLogisticMacroModel(samples, trainingOptions);

  await setDoc(
    doc(db, "macro_models", "active"),
    {
      ...model,
      updatedBy,
      note,
      trainingSampleCount: stats.sampleCount,
      trainingPositiveCount: stats.positiveCount,
      trainingNegativeCount: stats.negativeCount,
      trainedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    model,
    stats,
    sampleCount: samples.length,
  };
}
