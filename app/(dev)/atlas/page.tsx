import { AtlasCard, Callout, MonoLabel, Stat } from "@/components/atlas";

// dev-only inspection page — not part of the product. reachable at /atlas.
export default function AtlasSmokeTest() {
  return (
    <main className="min-h-screen bg-bone px-6 py-16 md:px-12 md:py-24">
      <div className="mx-auto flex max-w-3xl flex-col gap-12">
        {/* 1 + 2 — display header + tagline */}
        <header className="flex flex-col gap-4">
          <h1 className="font-serif text-[5rem] leading-[0.95] lowercase text-ink">
            nest
          </h1>
          <p className="font-serif text-2xl italic text-green">
            the operating system for actually having the family you planned
          </p>
        </header>

        {/* 3 — problem line: mono label + sans-body value */}
        <div className="flex flex-wrap items-baseline gap-3">
          <MonoLabel>PROBLEM</MonoLabel>
          <span className="text-ink">
            aging populations + shrinking workforces
          </span>
        </div>

        {/* 4 — the reframe (green callout) */}
        <Callout label="the reframe">
          <p className="leading-relaxed text-ink">
            the developed world isn’t facing a fertility crisis of desire —
            it’s facing a fertility crisis of logistics. people want the
            families they planned; what stands in the way is cost, timing, and
            information. nest closes that gap with real numbers and honest
            timelines.
          </p>
        </Callout>

        {/* 5 — stat row */}
        <div className="grid grid-cols-3 gap-4">
          <AtlasCard>
            <Stat label="10-yr childcare cost" value="$248,000" />
          </AtlasCard>
          <AtlasCard>
            <Stat label="fertility @ start" value="86%" />
          </AtlasCard>
          <AtlasCard>
            <Stat label="lifetime earnings Δ" value="−$190k" />
          </AtlasCard>
        </div>

        {/* 6 — handle with care (terracotta callout) */}
        <Callout label="handle with care" tone="terracotta">
          <p className="leading-relaxed text-ink">
            fertility and family-building touch real, sometimes painful
            territory. tone is supportive and humble; medical information is
            informational, not advice.
          </p>
        </Callout>

        {/* 7 — version strip */}
        <div className="flex items-baseline gap-2 border-t border-border pt-4">
          <MonoLabel>VERSION</MonoLabel>
          <span className="font-mono text-[0.75rem] text-muted">
            0.0.1 — atlas tokens online
          </span>
        </div>
      </div>
    </main>
  );
}
