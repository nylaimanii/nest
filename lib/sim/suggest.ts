// DETERMINISTIC. maps classification themes + tags to specific SimInputs
// changes the user can opt into after the reflection. no LLM — every
// number / new value is computed here in code (CLAUDE.md determinism).
//
// design rule (post-review): mourning-the-gap signals NEVER reduce
// kidsWanted. uncertainty about a particular kid means "what would it
// take to keep that kid?" — which is earlier startAge or higher work
// intensity, not cutting the wanted target. kidsWanted is the user's
// explicit declared goal on /simulation; the suggestion engine doesn't
// override it. money pressure alone is also not a reason to cut kids.

import type { QuestionEntry } from "@/lib/ai/types";
import type { GapSummary } from "./drift";
import type { SimInputs } from "@/types";

export interface SimSuggestion {
  field: keyof SimInputs;
  from: SimInputs[keyof SimInputs];
  to: SimInputs[keyof SimInputs];
  /** lowercase, one-sentence rationale to surface in the UI. */
  reason: string;
}

const MONEY_TAG_RE = /(money|cost|afford|budget|expensive|broke|tight|finan)/i;
const NO_BACKUP_RE = /(no backup|no help|no support|alone|on my own|nobody)/i;
const SURPRISE_RE = /(didn'?t know|surprise|had no idea|i didn'?t realize|news to me)/i;

function entryHasTheme(h: QuestionEntry[], theme: QuestionEntry["theme"]) {
  return h.find((e) => e.theme === theme);
}

function hasTagMatching(entry: QuestionEntry, re: RegExp): boolean {
  return (
    re.test(entry.answer) ||
    (entry.classification?.surface_tags ?? []).some((t) => re.test(t))
  );
}

/** propose an earlier startAge by `years` (capped at userAge — can't
 *  start before you exist). returns null if the move would be a no-op
 *  (already at userAge, or `years` <= 0). */
function earlierStartSuggestion(
  inputs: SimInputs,
  years: number,
  reason: string,
): SimSuggestion | null {
  if (years <= 0) return null;
  if (inputs.startAge <= inputs.userAge) return null;
  const next = Math.max(inputs.userAge, inputs.startAge - years);
  if (next === inputs.startAge) return null;
  return { field: "startAge", from: inputs.startAge, to: next, reason };
}

export function suggestSimChanges(
  history: QuestionEntry[],
  inputs: SimInputs,
  gap: GapSummary,
): SimSuggestion[] {
  const out: SimSuggestion[] = [];
  const usedFields = new Set<keyof SimInputs>();

  const push = (s: SimSuggestion | null) => {
    if (s === null) return;
    if (out.length >= 3) return;
    if (usedFields.has(s.field)) return;
    if (s.from === s.to) return;
    usedFields.add(s.field);
    out.push(s);
  };

  // 1) repeated money worry → bump work intensity up (capped at 70hrs).
  //    intentionally does NOT touch kidsWanted — "I'm worried about money"
  //    is not "I want fewer kids," it's "I need more income for the kids
  //    I want."
  const moneyHits = history.filter(
    (h) =>
      (h.classification?.stance === "avoidant" ||
        h.classification?.stance === "conflicted") &&
      hasTagMatching(h, MONEY_TAG_RE),
  );
  if (moneyHits.length >= 2 && inputs.workIntensity < 60) {
    const next = Math.min(70, inputs.workIntensity + 15);
    if (next !== inputs.workIntensity) {
      push({
        field: "workIntensity",
        from: inputs.workIntensity,
        to: next,
        reason:
          "you flagged money pressure repeatedly; modeling more intense work shows what that path looks like.",
      });
    }
  }

  // 2) no-backup support signal → model earlier start to close the gap
  //    without cutting the wanted kid count. previously this branch
  //    suggested kidsWanted - 1, which contradicted "the user knows what
  //    they want" — fix per post-review.
  const support = entryHasTheme(history, "support_system");
  if (support && hasTagMatching(support, NO_BACKUP_RE) && gap.kidGap > 0) {
    push(
      earlierStartSuggestion(
        inputs,
        3,
        "no clear support backup makes the drift delay costlier; starting 3 years earlier closes the gap without cutting kids.",
      ),
    );
  }

  // 3) uncertain on the second kid → the right read is "what would it
  //    take to keep that second kid?", not "cut to one." propose an
  //    earlier start so the fertility window includes the second arrival.
  const secondKid = entryHasTheme(history, "the_second_kid");
  if (
    secondKid &&
    (secondKid.classification?.stance === "uncertain" ||
      secondKid.classification?.stance === "avoidant") &&
    gap.kidGap > 0
  ) {
    push(
      earlierStartSuggestion(
        inputs,
        3,
        "your uncertainty about the second kid maps to the timing — starting 3 years earlier puts both arrivals inside the fertility window.",
      ),
    );
  }

  // 4) drift surprise → earlier start by 2.
  const drift = entryHasTheme(history, "drift_awareness");
  if (drift && hasTagMatching(drift, SURPRISE_RE)) {
    push(
      earlierStartSuggestion(
        inputs,
        2,
        "since the drift surprised you, modeling two years earlier shows what active planning buys.",
      ),
    );
  }

  return out;
}
