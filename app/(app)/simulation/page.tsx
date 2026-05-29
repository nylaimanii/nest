import { MonoLabel } from "@/components/atlas";
import { RecomputeButton } from "@/components/atlas/RecomputeButton";
import { HonestPanel } from "@/components/sim/HonestPanel";
import { InputPanel } from "@/components/sim/InputPanel";
import { RegretGap } from "@/components/sim/RegretGap";
import { SimCanvas } from "@/components/sim/SimCanvas";

export default function SimulationPage() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-8 py-12">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <MonoLabel tone="muted">SECTION</MonoLabel>
          <h1 className="font-serif text-[3rem] leading-none lowercase text-ink">
            simulation
          </h1>
          <p className="font-serif italic text-muted">
            edit the inputs, then recompute to run the math.
          </p>
        </div>
        <RecomputeButton />
      </div>

      <RegretGap />

      <div className="my-2 h-px bg-line" />

      {/* two-column layout — inputs on the left, charts + honest panel
          stacked vertically on the right. the previous 3-column grid
          (360 / 1fr / 420) clipped HonestPanel at 13" laptop widths. */}
      <div className="grid grid-cols-[360px_minmax(0,1fr)] gap-0">
        <InputPanel />
        <div className="flex min-w-0 flex-col">
          <SimCanvas />
          <div className="border-t border-line">
            <HonestPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
