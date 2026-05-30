// LLM-driven summary that FUSES what the user said with what the math
// shows. the prompt explicitly forbids the therapist-paraphrase mode the
// earlier version drifted into ("it seems like you're navigating…"); it
// requires concrete numbers and ends with a structural observation.

import type { GapSummary } from "@/lib/sim/drift";
import type { SimInputs } from "@/types";
import { askDeep } from "./groq";
import type { QuestionEntry } from "./types";

const SYSTEM = `You are a planning assistant integrated into NEST. The user has just answered 5 questions about having children. You ALSO have the user's full simulation state: their gap, their drift age, their fertility at start age, their income, their kid-cost projection, their field, their city, their childcare burden.

Your job: write 3-5 sentences that fuse what they said with what the math shows, into a claim they could not reach on their own. Reference SPECIFIC numbers from their simulation. Do not paraphrase what they said back to them — they know what they said.

Rules:
- NEVER use "it seems like," "you're navigating," "at the same time," "it's like you're."
- NEVER use therapist-cosplay verbs ("weighing," "struggling to reconcile," "caught between").
- DO use concrete numbers: ages, dollars, percentages.
- DO name the specific tradeoff with both costs labeled.
- DO end with a structural observation, not a feeling.

Format: plain serif prose. Two or three sentences max. No bullet points, no headers. Lowercase.

Example of the right output:
"you said the third kid is tied to who you are. the math says that kid costs you the senior IC track in new york — childcare alone eats 27% of your take-home through year 7. the only version where you keep both starts at 33, not 36 — three years is the whole problem, and three years is fixable."

Example of the wrong output (what NOT to do):
"it seems like you're navigating significant uncertainty around how to balance family and career. you appear to be weighing tradeoffs between different paths..."`;

const usd = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** the single sharpest friction phrase from the simulation, used to anchor
 *  the LLM on a concrete number it should reference. picks the one most
 *  likely to drive the prose: childcare burden when steep, else delay
 *  years when large, else benefits-left-on-table. */
function topFriction(gap: GapSummary, inputs: SimInputs, snap: {
  burdenRatio: number;
  childcareMonthlyUsed: number | null;
}): string {
  if (snap.childcareMonthlyUsed !== null && snap.burdenRatio >= 0.2) {
    return `childcare burden peaks at ${pct(snap.burdenRatio)} of take-home`;
  }
  const delay = gap.driftStartAge - inputs.startAge;
  if (delay >= 2) {
    return `drift adds ${delay} years before they actually start`;
  }
  if (gap.benefitsLeftOnTable >= 4000) {
    return `${usd(gap.benefitsLeftOnTable)}/yr of benefits unclaimed`;
  }
  return `gap is ${gap.kidGap} of ${gap.wantedKids} kids`;
}

export async function generateSummary(
  history: QuestionEntry[],
  inputs: SimInputs,
  gap: GapSummary,
  snap?: {
    burdenRatio: number;
    childcareMonthlyUsed: number | null;
    cumulativeChildCost?: number[];
  },
): Promise<string> {
  // user answers + the model's classification of each one — both go in,
  // labeled cleanly so the LLM knows which is the user's voice vs ours.
  const exchangeBlock = history
    .map((h, i) => {
      const stance = h.classification?.stance ?? "uncertain";
      const tags = (h.classification?.surface_tags ?? []).join(", ");
      return [
        `q${i + 1} (theme: ${h.theme}): ${h.question}`,
        `a${i + 1}: ${h.answer}`,
        `(classified: ${stance}${tags ? `; ${tags}` : ""})`,
      ].join("\n");
    })
    .join("\n\n");

  // the full sim-state context the prompt promised. uses real numbers from
  // the snapshot when available; falls back to gap-only when callers
  // haven't threaded the snapshot through.
  const burdenLine =
    snap && snap.childcareMonthlyUsed !== null
      ? `peak childcare burden: ${pct(snap.burdenRatio)} of take-home; monthly childcare ${usd(snap.childcareMonthlyUsed)}`
      : `peak childcare burden: unknown for this city`;
  const tenYearCost = snap?.cumulativeChildCost
    ? `10-year cumulative kid cost: ${usd(snap.cumulativeChildCost[9] ?? 0)}`
    : "10-year cumulative kid cost: unavailable";
  const friction = snap
    ? topFriction(gap, inputs, {
        burdenRatio: snap.burdenRatio,
        childcareMonthlyUsed: snap.childcareMonthlyUsed,
      })
    : `gap is ${gap.kidGap} of ${gap.wantedKids} kids`;

  const stateBlock = [
    `WANTED: ${gap.wantedKids} kids starting age ${gap.wantedStartAge} (fertility ${gap.fertilityWanted}%)`,
    `DRIFT: ${gap.likelyKids} kids starting age ${gap.driftStartAge} (fertility ${gap.fertilityDrift}%)`,
    `GAP: ${gap.kidGap} of ${gap.wantedKids} kids`,
    `INCOME: ${usd(inputs.householdIncome)} household, ${inputs.field} in ${inputs.city}`,
    burdenLine,
    tenYearCost,
    `BIGGEST FRICTION: ${friction}`,
  ].join("\n");

  const user = `the five exchanges:\n\n${exchangeBlock}\n\nthe simulation state:\n\n${stateBlock}\n\nwrite the summary now. follow the rules.`;
  const { text } = await askDeep({ system: SYSTEM, user });
  return text.trim();
}
