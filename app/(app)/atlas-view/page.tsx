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

      {/* responsive layout: at viewport ≥1400px the detail panel sits
          inline as the third column; below that it drops to a full-width
          band under the map so it isn't clipped on 13" laptop screens.
          col-span-2 on the panel under 1400px makes it span both row 1
          columns; the min-[1400px] variant reverts to its natural single
          column in the wider 3-col grid. */}
      <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-0 min-[1400px]:grid-cols-[280px_minmax(540px,1fr)_420px]">
        <AtlasSidebar />
        <div className="min-h-[560px] border-x border-line">
          <AtlasMap />
        </div>
        <div className="col-span-2 border-t border-line min-[1400px]:col-span-1 min-[1400px]:border-t-0">
          <CityHonestPanel />
        </div>
      </div>
    </div>
  );
}
