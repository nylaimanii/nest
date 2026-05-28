import Link from "next/link";

import { MonoLabel } from "@/components/atlas/MonoLabel";

export default function NotesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bone text-ink">
      <header className="h-16">
        <div className="mx-auto flex h-full max-w-[920px] items-center px-8">
          <Link
            href="/"
            className="font-serif text-[1.5rem] lowercase text-ink"
          >
            nest
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[680px] flex-1 px-8 py-32">
        <MonoLabel tone="muted">NOTES FROM THE BUILD</MonoLabel>
        <h1 className="mt-6 font-serif text-[2.4rem] leading-[1.1] lowercase text-ink">
          notes on building nest.
        </h1>
        <p className="mt-2 font-serif text-[0.95rem] italic text-muted">
          by nyla. written during the build.
        </p>

        <h2 className="mt-12 font-serif text-[1.4rem] lowercase text-ink">
          the determinism rule.
        </h2>
        <p className="mt-2 font-serif text-[1.05rem] leading-[1.7] text-ink">
          {"every number in nest comes from typescript, not from the language model. the simulation math, the fertility curve, the city scores — all code. the model writes the questions. the model writes the summary. but the model never writes a number. that line was drawn early and i held it the whole build. the reason matters more than the rule: people will trust this tool with one of the most expensive decisions they ever make. if a number on the screen came from a chatbot pattern-matching against a prompt, it shouldn't be there. honest tool, honest math."}
        </p>

        <h2 className="mt-8 font-serif text-[1.4rem] lowercase text-ink">
          the regret-gap reframe.
        </h2>
        <p className="mt-2 font-serif text-[1.05rem] leading-[1.7] text-ink">
          {"the demographic crunch is usually framed as people not wanting kids anymore. the data disagrees. every survey shows people want more children than they actually have. the shortfall isn't desire — it's money, timing, support, and the absence of any tool that helps people plan the family they want the way they'd plan anything else important. that shift in framing changed the whole product. you can't make people want kids. but you can help people who already do. that's a problem worth solving."}
        </p>

        <h2 className="mt-8 font-serif text-[1.4rem] lowercase text-ink">
          {"what 'honest' meant in practice."}
        </h2>
        <p className="mt-2 font-serif text-[1.05rem] leading-[1.7] text-ink">
          {"an honest tool refuses to lie even when the prettier answer is right there. nest does this in small specific places. it shows null for cities it doesn't have data on, instead of inventing a score. it tells you the fertility number drops as you wait, instead of softening it. it shows the gap between what you want and what you're likely to get, instead of skipping to a comforting summary. it asks the question you've been avoiding. none of that is hard to build. it's hard to commit to — every cheerful default in modern software pushes the other way. but the moment a tool stops being honest, it stops being useful for a decision this big."}
        </p>

        <p className="mt-12 font-serif text-[1rem] italic text-muted">
          more notes might land here as i keep building. — n.
        </p>

        <Link
          href="/"
          className="mt-8 inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted transition-colors hover:text-ink"
        >
          ← back to nest
        </Link>
      </main>
    </div>
  );
}
