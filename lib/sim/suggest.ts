// DETERMINISTIC. maps classification themes + tags to specific SimInputs
// changes the user can opt into after the reflection. no LLM — every
// number / new value is computed here in code (CLAUDE.md determinism).

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

export function suggestSimChanges(
  history: QuestionEntry[],
  inputs: SimInputs,
  _gap: GapSummary,
): SimSuggestion[] {
  const out: SimSuggestion[] = [];
  const usedFields = new Set<keyof SimInputs>();

  const push = (s: SimSuggestion) => {
    if (out.length >= 3) return;
    if (usedFields.has(s.field)) return;
    if (s.from === s.to) return;
    usedFields.add(s.field);
    out.push(s);
  };

  // 1) repeated money worry → bump career track up.
  const moneyHits = history.filter(
    (h) =>
      (h.classification?.stance === "avoidant" ||
        h.classification?.stance === "conflicted") &&
      hasTagMatching(h, MONEY_TAG_RE),
  );
  if (moneyHits.length >= 2 && inputs.careerTrack !== "demanding") {
    push({
      field: "careerTrack",
      from: inputs.careerTrack,
      to: "demanding",
      reason:
        "you flagged money pressure repeatedly; modeling a more demanding earnings track shows what that path looks like.",
    });
  }

  // 2) support_system answer suggests no backup → fewer kids modeled.
  const support = entryHasTheme(history, "support_system");
  if (support && hasTagMatching(support, NO_BACKUP_RE) && inputs.kidsWanted > 0) {
    const next = Math.max(1, inputs.kidsWanted - 1);
    if (next !== inputs.kidsWanted) {
      push({
        field: "kidsWanted",
        from: inputs.kidsWanted,
        to: next,
        reason:
          "with no clear support backup, modeling one fewer kid surfaces the load honestly.",
      });
    }
  }

  // 3) hesitation on the second kid → model one.
  const secondKid = entryHasTheme(history, "the_second_kid");
  if (
    secondKid &&
    (secondKid.classification?.stance === "uncertain" ||
      secondKid.classification?.stance === "avoidant") &&
    inputs.kidsWanted >= 2
  ) {
    push({
      field: "kidsWanted",
      from: inputs.kidsWanted,
      to: 1,
      reason:
        "your answer about the second kid was uncertain; modeling one shows that path clearly.",
    });
  }

  // 4) drift surprise → earlier start.
  const drift = entryHasTheme(history, "drift_awareness");
  if (
    drift &&
    hasTagMatching(drift, SURPRISE_RE) &&
    inputs.startAge > inputs.userAge
  ) {
    const next = Math.max(inputs.userAge, inputs.startAge - 2);
    if (next !== inputs.startAge) {
      push({
        field: "startAge",
        from: inputs.startAge,
        to: next,
        reason:
          "since the drift surprised you, modeling two years earlier shows what active planning buys.",
      });
    }
  }

  return out;
}
