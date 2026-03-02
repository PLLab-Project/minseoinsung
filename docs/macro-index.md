# Macro Index

## 1) Rule-based score (current baseline)

The macro index is a suspiciousness score from `0` to `100` (higher means more suspicious).

Current rule score is continuous (not just step increments), so sessions below the threshold
also get a calculated value. Very low-risk sessions can be `0`.

Rules are in `src/api/macroIndex.js` (`MACRO_RULE_CONFIG`):

- `stdAbsLowMs = 8`
- `stdAbsWarnMs = 12`
- `fastRateWarn = 0.2`
- `fastRateHigh = 0.35`
- `perfectRateWarn = 0.95`
- `perfectRateHigh = 0.98`
- `autocorrHigh = 0.6`
- `fixedOffsetWindowMs = 3`
- `fixedOffsetRateHigh = 0.7`
- `pendingScore = 60`

Feature definition:

- `meanAbsDelta`: average absolute timing error (ms)
- `stdAbsDelta`: standard deviation of absolute timing error (ms)
- `perfectRate`: perfect hits / total notes
- `missRate`: misses / total notes
- `impossiblyFastRate`: ratio of hits with `|delta| <= 10ms`
- `deltaAutocorr`: lag-1 autocorrelation of signed delta
- `fixedOffsetRate`: ratio of hits within ±`fixedOffsetWindowMs` from mean signed delta
- `weightedAccuracy`: `(perfect + 0.7 * good) / totalNotes`
- `comboRate`: `comboMax / totalNotes`

Sparse timing fallback:

- If timing signal is missing/sparse for a session, rule score falls back to note pattern
  (`weightedAccuracy`, `missRate`, `comboRate`, `perfectRate-goodRate`) so each session still
  gets a rule-based macro score from available per-session data.

## 2) ML score (optional)

If a valid model exists at Firestore `macro_models/active`, runtime will use:

- `mode: "rule"` -> rule score only
- `mode: "ml"` -> ML score only
- `mode: "hybrid"` -> blend rule + ML with `blendWeight`

Auto switch rule (implemented):

- If labeled data is insufficient, score uses `RULES` only.
- If labeled data is sufficient, configured model mode (`ml`/`hybrid`) is used.
- Default sufficiency threshold:
  - `trainingSampleCount >= 200`
  - `trainingPositiveCount >= 40`
  - `trainingNegativeCount >= 40`
- You can override thresholds with model fields:
  - `minSampleCountForMl`
  - `minClassCountForMl`

Model schema:

- `enabled: boolean`
- `mode: "rule" | "ml" | "hybrid"`
- `blendWeight: number (0..1)`
- `version: string`
- `weights: number[7]`
- `bias: number`
- `means: number[7]`
- `stds: number[7]`

Vector order:

1. `meanAbsDelta`
2. `stdAbsDelta`
3. `perfectRate`
4. `missRate`
5. `impossiblyFastRate`
6. `deltaAutocorr`
7. `fixedOffsetRate`

## 3) Data persistence in play_results

Each play stores:

- `macroScore` (final)
- `macroSuspicious` (`macroScore >= macroThreshold`)
- `macroThreshold` (default `60`)
- `macroRuleScore`
- `macroMlScore`
- `macroDetector` (`RULES`, `ML`, `HYBRID`)
- `macroReasons`
- `macroFeatures`
- `macroModelVersion`
- `macroFeatureVersion`
- `macroRulesetVersion`

## 4) Training flow

1. Label sessions in Firestore (`macroLabel` / `label` / `adminVerdict` / `verdict`).
2. Use `src/api/macroTrainingApi.js`:
   - `fetchLabeledMacroSamples()`
   - `trainMacroModelFromSamples()`
   - `trainAndPublishMacroModel()`
3. Saved model is written to `macro_models/active`.
4. New sessions automatically apply the model in `savePlayResult`.
