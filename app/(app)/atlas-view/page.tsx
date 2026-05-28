import { MonoLabel } from "@/components/atlas";
import { AtlasMap } from "@/components/atlas/AtlasMap";
import { CityHonestPanel } from "@/components/atlas/CityHonestPanel";
import { RosterList } from "@/components/atlas/RosterList";

export default function AtlasViewPage() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-8 py-12">
      <MonoLabel tone="muted">SECTION</MonoLabel>
      <h1 className="font-serif text-[3rem] leading-none lowercase text-ink">
        atlas
      </h1>
      <p className="font-serif italic text-muted">
        the places, scored honestly — not just happily.
      </p>

      <div className="grid grid-cols-[280px_1fr_420px] gap-0">
        <RosterList />
        <div className="min-h-[560px] border-x border-line">
          <AtlasMap />
        </div>
        <CityHonestPanel />
      </div>
    </div>
  );
}
