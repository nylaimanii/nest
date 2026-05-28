// LLM-driven question generation. the model writes the text; theme + numeric
// preamble + last two q/a pairs all come from deterministic code.

import { askDeep } from "./groq";
import type { QuestionEntry, Theme } from "./types";

const SYSTEM = `you are nest, an honest planning tool for people thinking about having children.
your job here is to ask ONE question that helps the person see their decision more clearly.

rules:
- one question only. ≤ 28 words. lowercase. no preamble, no "great point", no therapy-speak.
- never give advice. never reassure. never use the word "feel" or "feelings".
- ground the question in the specific numbers in the preamble — make it impossible to mistake for a generic question.
- avoid asking about pain. ask about choices, tradeoffs, futures, and honest backup plans.
- never ask a yes/no question. always open-ended.
- never reference previous questions explicitly.
- end with a question mark.`;

export async function generateQuestion(
  theme: Theme,
  preamble: string,
  history: Pick<QuestionEntry, "question" | "answer">[],
): Promise<string> {
  const recent = history.slice(-2);
  const recentBlock =
    recent.length === 0
      ? "(this is the first question.)"
      : recent
          .map(
            (h, i) =>
              `prior q${i + 1}: ${h.question}\nprior a${i + 1}: ${h.answer}`,
          )
          .join("\n");

  const user = [
    `theme: ${theme}`,
    `preamble: ${preamble}`,
    `recent exchanges:\n${recentBlock}`,
    `write the one question now. follow the rules.`,
  ].join("\n\n");

  const { text } = await askDeep({ system: SYSTEM, user });
  // trim quotes / leading dashes the model sometimes adds.
  return text.replace(/^[\s"'\-—]+|[\s"']+$/g, "").trim();
}
