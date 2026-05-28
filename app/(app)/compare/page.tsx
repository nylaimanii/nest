import { MonoLabel } from "@/components/atlas";
import { CompareView } from "@/components/compare/CompareView";

export default function ComparePage() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-8 py-12">
      <MonoLabel tone="muted">SECTION</MonoLabel>
      <h1 className="font-serif text-[3rem] leading-none lowercase text-ink">
        compare
      </h1>
      <p className="font-serif italic text-muted">
        see two futures next to each other.
      </p>

      <CompareView />
    </div>
  );
}
