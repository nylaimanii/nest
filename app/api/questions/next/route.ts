// POST /api/questions/next  → { theme, question }
// pickNextTheme is deterministic; generateQuestion is LLM (70b).

import { NextResponse } from "next/server";

import { generateQuestion } from "@/lib/ai/generateQuestion";
import { GroqUnconfiguredError } from "@/lib/ai/groq";
import { pickNextTheme } from "@/lib/ai/router";
import { preambleFor } from "@/lib/ai/themes";
import type { AnswerClassification, Theme } from "@/lib/ai/types";
import type { GapSummary } from "@/lib/sim/drift";
import type { SimInputs } from "@/types";

interface Body {
  history: { question: string; answer: string; classification: AnswerClassification | null }[];
  inputs: SimInputs;
  gap: GapSummary;
  asked: Theme[];
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { history = [], inputs, gap, asked = [] } = body;
  if (!inputs || !gap) {
    return NextResponse.json({ error: "missing inputs or gap" }, { status: 400 });
  }

  const classifications: AnswerClassification[] = history
    .map((h) => h.classification)
    .filter((c): c is AnswerClassification => c !== null);

  const theme = pickNextTheme(asked, classifications, inputs, gap);
  if (!theme) {
    return NextResponse.json({ error: "no themes remaining" }, { status: 409 });
  }

  try {
    const preamble = preambleFor(theme, inputs, gap);
    const question = await generateQuestion(
      theme,
      preamble,
      history.map((h) => ({ question: h.question, answer: h.answer })),
    );
    return NextResponse.json({ theme, question });
  } catch (err) {
    if (err instanceof GroqUnconfiguredError) {
      return NextResponse.json(
        { error: "groq key not configured" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "couldn't generate the question." },
      { status: 500 },
    );
  }
}
