import { MonoLabel } from "@/components/atlas";
import { AtlasMap } from "@/components/atlas/AtlasMap";
import { AtlasSidebar } from "@/components/atlas/AtlasSidebar";
import { CityHonestPanel } from "@/components/atlas/CityHonestPanel";
import { RecomputeButton } from "@/components/atlas/RecomputeButton";

export default function AtlasViewPage() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-8 py-12">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <MonoLabel tone="muted">SECTION</MonoLabel>
          <h1 className="font-serif text-[3rem] leading-none lowercase text-ink">
            atlas
          </h1>
          <p className="font-serif italic text-muted">
            find cities that match what your family needs.
          </p>
        </div>
        <RecomputeButton />
      </div>

      <div className="grid grid-cols-[280px_minmax(640px,1fr)_420px] gap-0">
        <AtlasSidebar />
        <div className="min-h-[560px] border-x border-line">
          <AtlasMap />
        </div>
        <CityHonestPanel />
      </div>
    </div>
  );
}
