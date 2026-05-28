// SERVER-ONLY. this module reads GROQ_API_KEY and instantiates the SDK —
// never import from a client component. the runtime guard below throws
// loudly if it ever does end up in a client bundle, so the bug is obvious
// instead of silently bundling the SDK + an empty key.

if (typeof window !== "undefined") {
  throw new Error(
    "lib/ai/groq.ts is server-only — do not import from client components",
  );
}

import Groq from "groq-sdk";

/** thrown when GROQ_API_KEY is missing. api routes turn this into 503. */
export class GroqUnconfiguredError extends Error {
  constructor() {
    super("groq key not configured");
    this.name = "GroqUnconfiguredError";
  }
}

// lazy singleton — the key is checked at first request, not module load,
// so dev/build keep working when .env.local is empty.
let _client: Groq | null = null;
function client(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new GroqUnconfiguredError();
  if (!_client) _client = new Groq({ apiKey: key });
  return _client;
}

interface AskArgs {
  system: string;
  user: string;
}

/** llama-3.3-70b-versatile — questions + reflection summary. */
export async function askDeep(args: AskArgs): Promise<{ text: string }> {
  const res = await client().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.6,
    max_tokens: 400,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  });
  const text = res.choices[0]?.message?.content?.trim() ?? "";
  return { text };
}

/** llama-3.1-8b-instant — answer classification + routing helpers. */
export async function askFast(args: AskArgs): Promise<{ text: string }> {
  const res = await client().chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.2,
    max_tokens: 200,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  });
  const text = res.choices[0]?.message?.content?.trim() ?? "";
  return { text };
}
