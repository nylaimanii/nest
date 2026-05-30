// POST /api/questions/summary → { summary, suggestions }
// summary is LLM (70b). suggestions are deterministic typescript.

import { NextResponse } from "next/server";

import { generateSummary } from "@/lib/ai/generateSummary";
import { GroqUnconfiguredError } from "@/lib/ai/groq";
import type { QuestionEntry } from "@/lib/ai/types";
import type { GapSummary } from "@/lib/sim/drift";
import { suggestSimChanges } from "@/lib/sim/suggest";
import type { SimInputs } from "@/types";

interface Body {
  history: QuestionEntry[];
  inputs: SimInputs;
  gap: GapSummary;
  /** snapshot fields the LLM references for concrete numbers. optional
   *  for backward compat — if missing, the summary falls back to gap-only
   *  prose without the precise dollar/percent anchors. */
  burdenRatio?: number;
  childcareMonthlyUsed?: number | null;
  cumulativeChildCost?: number[];
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const {
    history = [],
    inputs,
    gap,
    burdenRatio,
    childcareMonthlyUsed,
    cumulativeChildCost,
  } = body;
  if (!inputs || !gap || history.length === 0) {
    return NextResponse.json(
      { error: "missing inputs, gap, or history" },
      { status: 400 },
    );
  }

  // suggestions ALWAYS computed deterministically — they don't depend on
  // the LLM. that way even if the summary call fails we can still surface
  // them. for now we fail the whole request only if the LLM is down,
  // since the UI requires the summary.
  const suggestions = suggestSimChanges(history, inputs, gap);

  const snap =
    burdenRatio !== undefined && childcareMonthlyUsed !== undefined
      ? {
          burdenRatio,
          childcareMonthlyUsed,
          cumulativeChildCost,
        }
      : undefined;

  try {
    const summary = await generateSummary(history, inputs, gap, snap);
    return NextResponse.json({ summary, suggestions });
  } catch (err) {
    if (err instanceof GroqUnconfiguredError) {
      return NextResponse.json(
        { error: "groq key not configured" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "couldn't generate the summary." },
      { status: 500 },
    );
  }
}
