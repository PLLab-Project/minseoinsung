export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const round2 = (value) => Math.round(value * 100) / 100;

export const round6 = (value) => Math.round(value * 1_000_000) / 1_000_000;

export const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const toNumOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  return toNumber(value, 0);
};

export function calculateAccuracy({ perfect = 0, good = 0, miss = 0, notes = null } = {}) {
  const perfectCount = Math.max(0, toNumber(perfect, 0));
  const goodCount = Math.max(0, toNumber(good, 0));
  const missCount = Math.max(0, toNumber(miss, 0));

  const inferredTotal = perfectCount + goodCount + missCount;
  const providedTotal = notes == null ? 0 : Math.max(0, toNumber(notes, 0));
  const totalNotes = Math.max(inferredTotal, providedTotal, 1);

  const rawAccuracy = ((perfectCount + goodCount * 0.7) / totalNotes) * 100;
  return round2(clamp(rawAccuracy, 0, 100));
}
