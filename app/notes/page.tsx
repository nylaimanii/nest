import Link from "next/link";

import { MonoLabel } from "@/components/atlas/MonoLabel";

const GITHUB_REPO = "https://github.com/nylaimanii/nest";

const NOTES = [
  {
    title: "the determinism rule.",
    line: "why the numbers are code, never ai-generated, and why that line matters.",
  },
  {
    title: "the regret-gap reframe.",
    line:
      "the crisis is logistics, not desire — and what changes when you build for that.",
  },
  {
    title: "what 'honest' meant in practice.",
    line:
      "every place the tool had to refuse to lie, even when the prettier answer was available.",
  },
];

export default function NotesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bone text-ink">
      <header className="h-16">
        <div className="mx-auto flex h-full max-w-[920px] items-center justify-between px-8">
          <Link
            href="/"
            className="font-serif text-[1.5rem] lowercase text-ink"
          >
            nest
          </Link>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[0.8rem] text-muted transition-colors hover:text-ink"
          >
            github
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[680px] flex-1 px-8 py-32">
        <MonoLabel tone="muted">NOTES FROM THE BUILD</MonoLabel>
        <h1 className="mt-6 font-serif text-[2.2rem] leading-[1.2] lowercase text-ink">
          notes on building nest.
        </h1>
        <p className="mt-4 font-serif text-[1.05rem] italic text-muted">
          draft — these notes are still being written. nyla.
        </p>

        <div className="mt-6 flex flex-col gap-8">
          {NOTES.map((n) => (
            <div key={n.title} className="flex flex-col gap-2">
              <h2 className="font-serif text-[1.3rem] lowercase text-ink">
                {n.title}
              </h2>
              <p className="font-serif text-[1rem] italic leading-[1.55] text-muted">
                {n.line}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/"
          className="mt-8 inline-block font-mono text-[0.85rem] text-muted transition-colors hover:text-ink"
        >
          ← back to nest
        </Link>
      </main>
    </div>
  );
}
