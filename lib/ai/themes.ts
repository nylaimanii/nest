// theme registry + factual preambles. the LLM never picks topics — it
// gets a theme + a one-line numeric preamble + the last two q/a pairs,
// and writes a question grounded in those numbers.

import type { GapSummary } from "@/lib/sim/drift";
import type { SimInputs } from "@/types";
import { THEME_LIST, type Theme } from "./types";

export const THEMES = THEME_LIST;
export type { Theme };

function k(n: number): string {
  return `${Math.round(n / 1000)}k`;
}

/** one factual sentence the LLM uses to ground the question. */
export function preambleFor(
  theme: Theme,
  inputs: SimInputs,
  gap: GapSummary,
): string {
  const income = k(inputs.householdIncome);
  const city = inputs.city;
  const fert = gap.fertilityWanted;

  switch (theme) {
    case "money_pressure":
      return `user wants ${inputs.kidsWanted} kids on $${income}/yr in ${city}. childcare runs roughly $${(2000 * 12).toLocaleString("en-US")}/yr per kid in the region; capturable benefits ~$${gap.benefitsLeftOnTable.toLocaleString("en-US")}/yr.`;
    case "partner_alignment":
      return `user is ${inputs.userAge}, partner is ${inputs.partnerAge ?? "n/a"}; both planning to start trying at age ${inputs.startAge}, wanting ${inputs.kidsWanted} kids.`;
    case "support_system":
      return `user lives in ${city}, planning ${inputs.kidsWanted} kids starting at age ${inputs.startAge}. assume no nearby family unless told otherwise.`;
    case "career_tradeoffs":
      return `${inputs.workIntensity}hr/wk in ${inputs.field}, household income $${income}/yr.`;
    case "regret_horizon":
      return `user is ${inputs.userAge} now, wants ${inputs.kidsWanted} kids beginning at age ${inputs.startAge}. fertility at that start age is ~${fert}%.`;
    case "drift_awareness":
      return `wanted: ${gap.wantedKids} kids at age ${gap.wantedStartAge} (fertility ${gap.fertilityWanted}%). drift puts them at ${gap.likelyKids} kids at age ${gap.driftStartAge} (fertility ${gap.fertilityDrift}%). gap: ${gap.kidGap}.`;
    case "identity_after":
      return `${inputs.workIntensity}hr/wk in ${inputs.field}; ${inputs.kidsWanted} kids planned starting age ${inputs.startAge}.`;
    case "the_second_kid":
      return `${inputs.kidsWanted} kids planned. first arrival around age ${inputs.startAge}, second roughly ${inputs.startAge + 3}.`;
  }
}
