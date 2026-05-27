import { MonoLabel } from "@/components/atlas";

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
      <MonoLabel tone="green" className="self-end">
        UNDER CONSTRUCTION
      </MonoLabel>
    </div>
  );
}
