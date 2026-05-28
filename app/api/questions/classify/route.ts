// POST /api/questions/classify → AnswerClassification
// uses askFast (llama-3.1-8b-instant) inside classifyAnswer.

import { NextResponse } from "next/server";

import { GroqUnconfiguredError } from "@/lib/ai/groq";
import { classifyAnswer } from "@/lib/ai/router";

interface Body {
  question: string;
  answer: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { question = "", answer = "" } = body;
  if (!question || !answer) {
    return NextResponse.json(
      { error: "missing question or answer" },
      { status: 400 },
    );
  }

  try {
    const classification = await classifyAnswer(question, answer);
    return NextResponse.json(classification);
  } catch (err) {
    if (err instanceof GroqUnconfiguredError) {
      return NextResponse.json(
        { error: "groq key not configured" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "couldn't classify the answer." },
      { status: 500 },
    );
  }
}
