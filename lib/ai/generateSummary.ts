// LLM-driven reflection summary. NO numbers, NO advice — just a calm
// through-line of what the user said.

import type { GapSummary } from "@/lib/sim/drift";
import type { SimInputs } from "@/types";
import { askDeep } from "./groq";
import type { QuestionEntry } from "./types";

const SYSTEM = `you are nest. the user just finished a 5-question reflection. your job is to reflect back what you heard.

rules:
- 3-5 sentences. lowercase. serif voice — calm, plain, honest.
- no advice. no platitudes. no "the most important thing is..."
- quote NO numbers and offer NO solutions. you are reflecting, not analyzing.
- the goal is for them to read it and think "yes, that's what i said."
- do not summarize question by question. find the through-line.
- end with one short sentence pointing back to the tradeoff they seem to care most about — not as advice, as a noticing.`;

export async function generateSummary(
  history: QuestionEntry[],
  _inputs: SimInputs,
  _gap: GapSummary,
): Promise<string> {
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

  const user = `the five exchanges:\n\n${exchangeBlock}\n\nwrite the reflection now. follow the rules.`;
  const { text } = await askDeep({ system: SYSTEM, user });
  return text.trim();
}
