// adaptive 5-question routing. theme selection is pure deterministic
// typescript — only the answer classifier touches the LLM.

import type { GapSummary } from "@/lib/sim/drift";
import type { SimInputs } from "@/types";
import { askFast } from "./groq";
import type { AnswerClassification, Theme } from "./types";

// fall-back priority order, lowest index = highest priority.
const PRIORITY: Theme[] = [
  "drift_awareness",
  "regret_horizon",
  "money_pressure",
  "partner_alignment",
  "support_system",
  "the_second_kid",
  "career_tradeoffs",
  "identity_after",
];

const MONEY_TAG_RE = /(money|cost|afford|budget|expensive|broke|tight|finan)/i;

/** deterministic — picks the next theme given the run so far. */
export function pickNextTheme(
  asked: Theme[],
  classifications: AnswerClassification[],
  inputs: SimInputs,
  gap: GapSummary,
): Theme | null {
  if (asked.length >= 5) return null;

  // Q1 — opener hits the user's actual situation.
  if (asked.length === 0) {
    return gap.kidGap >= 1 ? "drift_awareness" : "regret_horizon";
  }

  const last = classifications[classifications.length - 1];

  // boost: if the last answer dodged or conflicted around money, surface it.
  if (
    last &&
    (last.stance === "avoidant" || last.stance === "conflicted") &&
    last.surface_tags.some((t) => MONEY_TAG_RE.test(t)) &&
    !asked.includes("money_pressure")
  ) {
    return "money_pressure";
  }

  // force support_system by Q3 — too important to skip.
  if (asked.length === 2 && !asked.includes("support_system")) {
    return "support_system";
  }

  // save the_second_kid for late slots when ≥2 kids are wanted.
  if (
    inputs.kidsWanted >= 2 &&
    !asked.includes("the_second_kid") &&
    asked.length >= 3
  ) {
    return "the_second_kid";
  }

  for (const t of PRIORITY) {
    if (!asked.includes(t)) return t;
  }
  return null;
}

// ---- classification (LLM) ------------------------------------------------

const CLASSIFY_SYSTEM = `you classify a single answer to a sensitive question about family planning. return ONLY a JSON object with keys "stance" and "surface_tags". stance is one of: confident, uncertain, avoidant, conflicted. surface_tags is an array of 1-3 short lowercase phrases (each ≤ 4 words) capturing what the answer reveals. no other prose, no markdown fences. example: {"stance":"avoidant","surface_tags":["money worry","no backup plan"]}`;

const FALLBACK: AnswerClassification = {
  stance: "uncertain",
  surface_tags: [],
};

const STANCES = new Set(["confident", "uncertain", "avoidant", "conflicted"]);

export async function classifyAnswer(
  question: string,
  answer: string,
): Promise<AnswerClassification> {
  const { text } = await askFast({
    system: CLASSIFY_SYSTEM,
    user: `question: ${question}\nanswer: ${answer}`,
  });

  // strip code fences in case the model adds them despite instructions.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "stance" in parsed &&
      "surface_tags" in parsed
    ) {
      const p = parsed as {
        stance: unknown;
        surface_tags: unknown;
      };
      const stance =
        typeof p.stance === "string" && STANCES.has(p.stance)
          ? (p.stance as AnswerClassification["stance"])
          : "uncertain";
      const tags = Array.isArray(p.surface_tags)
        ? p.surface_tags
            .filter((t): t is string => typeof t === "string")
            .slice(0, 3)
            .map((t) => t.toLowerCase().trim())
            .filter((t) => t.length > 0)
        : [];
      return { stance, surface_tags: tags };
    }
  } catch {
    // fall through
  }
  return FALLBACK;
}
