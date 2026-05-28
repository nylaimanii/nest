import Link from "next/link";

import { AtlasCard } from "@/components/atlas/Card";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { LandingScrollLink } from "@/components/landing/LandingScrollLink";

const GITHUB_URL = "https://github.com/nylaimanii/nest";
const GITHUB_PROFILE = "https://github.com/nylaimanii";
// portfolio + linkedin are placeholders for now — fill in when ready.
const PORTFOLIO_URL = "#";
const LINKEDIN_URL = "#";

const VIEWS = [
  {
    label: "—  SIMULATION",
    name: "the simulation",
    body:
      "drag the years. watch the tradeoffs change. net household cash, fertility by start age, cumulative cost — modeled deterministically, never invented. shows the gap between the family you want and the one your current drift most likely yields, then animates the gap closing.",
  },
  {
    label: "—  ATLAS",
    name: "the atlas",
    body:
      "type any city. nest scores it on cost of living, schools, safety, green space, and how well it matches your career — and writes a single honest tradeoff line, never a happy score. compare a roster of places on a map rendered in the same calm palette as the rest of the tool.",
  },
  {
    label: "—  QUESTIONS",
    name: "the questions",
    body:
      "five conversations the rest of the internet won't have with you. an ai-led sequence grounded in your actual numbers — your gap, your timeline, your income — that surfaces what you're avoiding and offers concrete changes to the simulation when it learns something.",
  },
] as const;

const STATS = [
  { label: "WANTED FERTILITY", value: "2.5", tone: "ink" as const },
  { label: "ACTUAL FERTILITY (US)", value: "1.6", tone: "ink" as const },
  { label: "THE GAP", value: "0.9", tone: "green" as const },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bone text-ink">
      {/* ──────────────── header strip ──────────────── */}
      <header className="h-16">
        <div className="mx-auto flex h-full max-w-[920px] items-center justify-between px-8">
          <Link
            href="/"
            className="font-serif text-[1.5rem] lowercase text-ink"
          >
            nest
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[0.8rem] text-muted transition-colors hover:text-ink"
          >
            github
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[920px] flex-1 px-8">
        {/* ──────────────── 1. hero ──────────────── */}
        <section
          className="flex flex-col justify-center"
          style={{ minHeight: "calc(100vh - 64px)" }}
        >
          <MonoLabel tone="muted">
            AN INSTRUMENT FOR FAMILY PLANNING
          </MonoLabel>
          <h1
            className="mt-8 max-w-[16ch] font-serif font-medium leading-[0.95] tracking-tight lowercase text-ink"
            style={{ fontSize: "clamp(2.8rem, 6vw, 5.2rem)" }}
          >
            {"close the gap between the family you want and the family you actually have."}
          </h1>
          <p className="mt-8 max-w-[52ch] text-[1.25rem] italic leading-relaxed text-muted">
            {"the numbers, the timing, the honest tradeoffs — and the questions nobody asks you. an instrument for the most certain decision you'll ever make."}
          </p>
          <div className="mt-14 flex flex-wrap items-center gap-8">
            <Link
              href="/simulation"
              className="rounded-[2px] bg-green px-7 py-3.5 font-serif text-[1.05rem] italic text-bone transition-colors hover:bg-green-2"
            >
              begin a scenario →
            </Link>
            <LandingScrollLink
              targetId="how-it-works"
              label="SEE HOW IT WORKS ↓"
            />
            <Link
              href="/partners"
              className="border-b border-line pb-0.5 font-serif text-[0.95rem] italic text-muted transition-colors hover:border-green hover:text-ink"
            >
              partner with nest
            </Link>
          </div>
        </section>

        {/* ──────────────── 2. the reframe ──────────────── */}
        <section id="reframe" className="pt-32 pb-32">
          <div className="grid grid-cols-[180px_1fr] gap-16">
            <MonoLabel tone="muted">01 · THE REFRAME</MonoLabel>
            <div>
              <h2 className="max-w-[24ch] font-serif text-[2.2rem] leading-[1.15] lowercase text-ink">
                {"it's not a crisis of desire. it's a crisis of logistics."}
              </h2>
              <p className="mt-6 max-w-[60ch] text-[1.05rem] leading-[1.7] text-ink">
                {"every developed country is told the same story: people stopped wanting kids. the data disagrees. survey after survey shows people consistently want more children than they end up having. the shortfall isn't desire — it's money, timing, support, and the total absence of any tool that helps you plan the family you want the way you'd plan anything else that matters."}
              </p>
              <p className="mt-4 font-serif text-[1.1rem] italic text-green">
                every closed gap is a future that would not otherwise exist.
              </p>
            </div>
          </div>
        </section>

        {/* ──────────────── 3. what it does ──────────────── */}
        <section id="how-it-works" className="pt-32 pb-32">
          <div className="grid grid-cols-[180px_1fr] gap-16">
            <MonoLabel tone="muted">02 · WHAT IT DOES</MonoLabel>
            <div>
              <h2 className="font-serif text-[2.2rem] leading-[1.15] lowercase text-ink">
                three views. one honest decision.
              </h2>
              <div className="mt-6 flex flex-col gap-12">
                {VIEWS.map((v) => (
                  <div key={v.name} className="flex gap-8">
                    <div className="w-[180px] shrink-0 pt-2">
                      <span className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted">
                        {v.label}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif text-[1.4rem] lowercase text-ink">
                        {v.name}
                      </h3>
                      <p className="mt-2 max-w-[52ch] text-[1rem] leading-[1.6] text-muted">
                        {v.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────── 4. why now ──────────────── */}
        <section className="pt-32 pb-32">
          <div className="grid grid-cols-[180px_1fr] gap-16">
            <MonoLabel tone="muted">03 · WHY NOW</MonoLabel>
            <div>
              <h2 className="font-serif text-[2.2rem] leading-[1.15] lowercase text-ink">
                the most certain problem on any list.
              </h2>
              <p className="mt-6 max-w-[60ch] text-[1.05rem] leading-[1.7] text-ink">
                {"the people who'll be seventy in 2045 are already alive and countable. most of the developed world plus china is heading into a demographic crunch — fewer workers supporting more retirees, strained healthcare, strained pensions. every other intervention fights over a fixed or shrinking pool of humans. closing the gap between what people want and what they end up with is the only lever that grows the pool — without changing what anyone wants."}
              </p>

              <div className="mt-10 grid grid-cols-3 gap-8">
                {STATS.map((s) => (
                  <div key={s.label} className="flex flex-col gap-2">
                    <MonoLabel tone="muted">{s.label}</MonoLabel>
                    <span
                      className={
                        s.tone === "green"
                          ? "font-mono text-[2.4rem] leading-none text-green"
                          : "font-mono text-[2.4rem] leading-none text-ink"
                      }
                    >
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-4 font-serif text-[0.85rem] italic text-muted">
                us general social survey + cdc, illustrative averages. nest
                models the gap for the individual.
              </p>
            </div>
          </div>
        </section>

        {/* ──────────────── 5. who's building this ──────────────── */}
        <section className="pt-32 pb-32">
          <div className="grid grid-cols-[180px_1fr] gap-16">
            <MonoLabel tone="muted">04 · WHO</MonoLabel>
            <div>
              <h2 className="font-serif text-[2.2rem] leading-[1.15] lowercase text-ink">
                built solo by nyla.
              </h2>
              <p className="mt-6 max-w-[60ch] text-[1.05rem] leading-[1.7] text-ink">
                {"first-year computer science student at camden county college. two summer 2026 software internships in new york city — both stemming from a solo build at yhack at yale. six hackathons. nest is what happens when the most interesting problem i can find runs into a tool i actually want to make."}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-6 font-mono text-[0.85rem] text-muted">
                <a
                  href={GITHUB_PROFILE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b border-transparent transition-colors hover:border-line hover:text-ink"
                >
                  github → nylaimanii
                </a>
                <span aria-hidden>·</span>
                <a
                  href={PORTFOLIO_URL}
                  className="border-b border-transparent transition-colors hover:border-line hover:text-ink"
                >
                  portfolio →
                </a>
                <span aria-hidden>·</span>
                <a
                  href={LINKEDIN_URL}
                  className="border-b border-transparent transition-colors hover:border-line hover:text-ink"
                >
                  linkedin →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────── 6. partner CTA ──────────────── */}
        <section className="pt-24 pb-32">
          <AtlasCard tone="green" label="FOR DESIGN PARTNERS">
            <h2 className="mt-1 max-w-[40ch] font-serif text-[1.8rem] leading-[1.2] lowercase text-ink">
              {"if you're an employer, an insurer, or a policymaker — we want to talk."}
            </h2>
            <p className="mt-6 max-w-[58ch] text-[1.05rem] leading-[1.6] text-ink">
              {"nest is being built openly. if you're navigating family benefits, demographic policy, or insurance design and want to pilot the tool with your population — write to us. v1 is a planning instrument; v2 becomes the intelligence layer between people and the family infrastructure the world is about to build."}
            </p>
            <Link
              href="/partners"
              className="mt-6 inline-block rounded-[2px] bg-green px-6 py-3 font-serif text-[1rem] italic text-bone transition-colors hover:bg-green-2"
            >
              open the partner letter →
            </Link>
          </AtlasCard>
        </section>
      </main>

      {/* ──────────────── footer ──────────────── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex h-20 max-w-[920px] items-center justify-between px-8 font-mono text-[0.75rem] text-muted">
          <span>v0.1 · built solo by nyla wilson</span>
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-ink"
            >
              github
            </a>
            <span aria-hidden>·</span>
            <a
              href={LINKEDIN_URL}
              className="transition-colors hover:text-ink"
            >
              linkedin
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
