// alternates discovery — given a target city + the user's weighted score
// context, returns the cities from the pool that score equally well or
// better than the target. used by /atlas-view to surface "where else
// fits what you want" without making the user manually compare.
//
// determinism rule (CLAUDE.md): pure code; no LLM, no async.

import type { CityRecord } from "./cities";
import { scoreCity, type CityScore, type ScoreContext } from "./score";

const NEAR_THRESHOLD = 5;   // first pass: targetTotal - 5
const BROAD_THRESHOLD = 10; // second pass: targetTotal - 10
const MAX_RESULTS = 8;

interface ScoredCity {
  city: CityRecord;
  score: CityScore;
}

/**
 * three-tier fallback so the alternates list is never empty for a useful
 * target:
 *   1. cities scoring within 5 points of the target
 *   2. if <3 hits, broaden to within 10
 *   3. if still <3 hits, return the top 3 from the pool regardless of
 *      threshold (handles partial-data targets where targetTotal is 0)
 * always sorted highest-score first; capped at 8.
 */
export function findAlternates(
  target: CityRecord,
  pool: CityRecord[],
  ctx: ScoreContext,
): CityRecord[] {
  const targetScore = scoreCity(target, ctx);
  const tt = targetScore.total ?? 0;

  const scored: ScoredCity[] = pool
    .filter((c) => c.id !== target.id)
    .map((c) => ({ city: c, score: scoreCity(c, ctx) }))
    .filter(
      (s) =>
        s.score.confidence !== "unknown" &&
        s.score.total !== null,
    );

  let matches = scored.filter((s) => (s.score.total as number) >= tt - NEAR_THRESHOLD);

  if (matches.length < 3) {
    matches = scored.filter(
      (s) => (s.score.total as number) >= tt - BROAD_THRESHOLD,
    );
  }

  if (matches.length < 3) {
    matches = [...scored].sort(
      (a, b) => (b.score.total as number) - (a.score.total as number),
    );
  } else {
    matches.sort(
      (a, b) => (b.score.total as number) - (a.score.total as number),
    );
  }

  return matches.slice(0, MAX_RESULTS).map((m) => m.city);
}
