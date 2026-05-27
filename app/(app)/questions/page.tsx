import { MonoLabel } from "@/components/atlas";

export default function QuestionsPage() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-8 py-12">
      <MonoLabel tone="muted">SECTION</MonoLabel>
      <h1 className="font-serif text-[3rem] leading-none lowercase text-ink">
        the questions
      </h1>
      <p className="font-serif italic text-muted">
        the conversations nobody helps you have.
      </p>
      <MonoLabel tone="green" className="self-end">
        UNDER CONSTRUCTION
      </MonoLabel>
    </div>
  );
}
