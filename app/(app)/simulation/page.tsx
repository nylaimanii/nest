import { MonoLabel } from "@/components/atlas";
import { HonestPanel } from "@/components/sim/HonestPanel";
import { InputPanel } from "@/components/sim/InputPanel";

export default function SimulationPage() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-8 py-12">
      <MonoLabel tone="muted">SECTION</MonoLabel>
      <h1 className="font-serif text-[3rem] leading-none lowercase text-ink">
        simulation
      </h1>
      <p className="font-serif italic text-muted">
        drag the years. watch the tradeoffs change.
      </p>

      <div className="grid grid-cols-[360px_1fr_420px] gap-0">
        <InputPanel />
        <div className="flex items-center justify-center py-24 text-center font-serif italic text-muted">
          the curves arrive in step 5.
        </div>
        <HonestPanel />
      </div>
    </div>
  );
}
