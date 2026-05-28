"use client";

import { Minus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Callout } from "@/components/atlas/Callout";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { cn } from "@/lib/utils";
import { useSimStore } from "@/store/sim";
import type { GapSummary } from "@/lib/sim/drift";

// rAF-driven ease-out cubic count. animation state lives entirely in a ref
// (rafId + the latest tick value + the target we've already animated toward).
// the ref is only ever written from inside the rAF callback and the effect
// — never during render — so concurrent re-renders can't desync it.
// `initial` lets entrance animations start from a different value than
// their target so the count animates on first mount (e.g. 0 → wantedKids
// when the page loads already at revealStage 1).
function useAnimatedNumber(
  target: number,
  duration = 700,
  initial?: number,
): number {
  const [value, setValue] = useState(() => initial ?? target);
  const animRef = useRef<{
    rafId: number;
    current: number;
    targetSeen: number | null;
  }>({
    rafId: 0,
    current: initial ?? target,
    targetSeen: null,
  });

  useEffect(() => {
    // only (re)start when the requested target actually changes. this
    // distinguishes "first mount with target X" from "later re-render
    // happens to pass the same X" without depending on equality with
    // the displayed state.
    if (animRef.current.targetSeen === target) return;
    animRef.current.targetSeen = target;

    cancelAnimationFrame(animRef.current.rafId);

    const from = animRef.current.current;
    if (from === target) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * eased;
      animRef.current.current = next;
      setValue(next);
      if (t < 1) {
        animRef.current.rafId = requestAnimationFrame(tick);
      }
    };
    animRef.current.rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animRef.current.rafId);
  }, [target, duration]);

  return value;
}

// ---- the component --------------------------------------------------------

export function RegretGap() {
  const gap = useSimStore((s) => s.gap);
  const stage = useSimStore((s) => s.revealStage);
  const setStage = useSimStore((s) => s.setRevealStage);

  // stage-1 entrance: both kid counts grow from 0 → real values over 700ms.
  // initial=0 forces a count-up on first mount even when revealStage starts
  // at 1 (no 0→1 transition required).
  const wantedAnim = useAnimatedNumber(
    stage >= 1 ? gap.wantedKids : 0,
    700,
    0,
  );
  const likelyEntrance = useAnimatedNumber(
    stage >= 1 ? gap.likelyKids : 0,
    700,
    0,
  );

  // stage-3 close: likely climbs from likelyKids → wantedKids, gap → 0, 900ms.
  const likelyClosing = useAnimatedNumber(
    stage === 3 ? gap.wantedKids : gap.likelyKids,
    900,
  );
  const gapAnim = useAnimatedNumber(stage === 3 ? 0 : gap.kidGap, 900);

  if (stage === 0) {
    return <StageZero gap={gap} onAdvance={() => setStage(1)} />;
  }

  const wantedDisplay = Math.round(wantedAnim);
  const likelyDisplay =
    stage === 3 ? Math.round(likelyClosing) : Math.round(likelyEntrance);
  const gapDisplay = stage === 3 ? Math.round(gapAnim) : gap.kidGap;

  const onTrack = gap.kidGap === 0;
  const gapZero = gapDisplay === 0;

  return (
    <section className="flex flex-col gap-8 py-2">
      {/* wanted | gap | likely */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-12">
        <Column
          align="left"
          labelTone="green"
          labelText="WANTED"
          number={wantedDisplay}
          ageLabel={`@ age ${gap.wantedStartAge}`}
          fertilityLabel={`fertility ${gap.fertilityWanted}%`}
        />

        <div className="flex flex-col items-center gap-2 pt-1">
          <MonoLabel tone={gapZero ? "green" : "terracotta"}>
            {onTrack ? "NO GAP — YOU'RE ON TRACK" : "THE GAP"}
          </MonoLabel>
          <div
            className={cn(
              "font-mono text-[3.5rem] leading-none transition-colors duration-700 ease-out",
              gapZero ? "text-green" : "text-terracotta",
            )}
          >
            {gapDisplay > 0 ? `−${gapDisplay}` : "0"}
          </div>
        </div>

        <Column
          align="right"
          labelTone="terracotta"
          labelText="LIKELY ON CURRENT DRIFT"
          number={likelyDisplay}
          ageLabel={`@ age ${gap.driftStartAge}`}
          fertilityLabel={`fertility ${gap.fertilityDrift}%`}
        />
      </div>

      {/* stage 2+: frictions */}
      {stage >= 2 ? <FrictionsList frictions={gap.frictions} /> : null}

      {/* stage 3: the navigable path */}
      {stage === 3 ? <NavigablePathCallout gap={gap} /> : null}

      {/* action row */}
      <div className="flex items-baseline justify-end border-t border-line pt-4">
        {stage === 1 ? (
          <TextAction onClick={() => setStage(2)}>
            why does this happen? →
          </TextAction>
        ) : null}
        {stage === 2 ? (
          <TextAction onClick={() => setStage(3)}>
            can i close it? →
          </TextAction>
        ) : null}
        {stage === 3 ? (
          <TextAction onClick={() => setStage(0)} muted>
            ← start over
          </TextAction>
        ) : null}
      </div>
    </section>
  );
}

// ---- pieces ---------------------------------------------------------------

function Column({
  align,
  labelTone,
  labelText,
  number,
  ageLabel,
  fertilityLabel,
}: {
  align: "left" | "right";
  labelTone: "green" | "terracotta";
  labelText: string;
  number: number;
  ageLabel: string;
  fertilityLabel: string;
}) {
  const alignClass = align === "right" ? "items-end text-right" : "items-start";
  return (
    <div className={cn("flex flex-col gap-2", alignClass)}>
      <MonoLabel tone={labelTone}>{labelText}</MonoLabel>
      <div className="font-mono text-[3.5rem] leading-none text-ink">
        {number}
      </div>
      <div className="font-mono text-[0.85rem] text-muted">kids</div>
      <div className="mt-3 font-mono text-[0.85rem] text-muted">{ageLabel}</div>
      <div className="font-mono text-[0.85rem] text-muted">{fertilityLabel}</div>
    </div>
  );
}

function StageZero({
  gap,
  onAdvance,
}: {
  gap: GapSummary;
  onAdvance: () => void;
}) {
  return (
    <section className="flex flex-wrap items-baseline justify-between gap-6 py-2">
      <p className="font-serif text-[1.4rem] text-ink">
        you want{" "}
        <span className="font-mono">{gap.wantedKids}</span> kids, starting at
        age <span className="font-mono">{gap.wantedStartAge}</span>.
      </p>
      <TextAction onClick={onAdvance}>
        show me what actually happens →
      </TextAction>
    </section>
  );
}

function FrictionsList({ frictions }: { frictions: string[] }) {
  // staggered fade-in via transition-delay; revealed=true triggers on mount.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <MonoLabel>WHAT&apos;S CAUSING THE GAP</MonoLabel>
      <ul className="flex flex-col gap-2">
        {frictions.map((f, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-3 font-serif text-[0.98rem] leading-relaxed text-ink transition-opacity duration-500 ease-out",
              revealed ? "opacity-100" : "opacity-0",
            )}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <Minus
              className="mt-2 h-3.5 w-3.5 shrink-0 text-terracotta"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NavigablePathCallout({ gap }: { gap: GapSummary }) {
  const benefits = gap.benefitsLeftOnTable.toLocaleString("en-US");
  const firstLine =
    gap.kidGap > 0
      ? `start when you planned — age ${gap.wantedStartAge} — and the ${gap.kidGap}-kid gap closes.`
      : `you're already on the path you planned — age ${gap.wantedStartAge}.`;

  return (
    <Callout label="THE NAVIGABLE PATH">
      <ul className="flex flex-col gap-2 font-serif leading-relaxed text-ink">
        <li>{firstLine}</li>
        <li>claim the ${benefits}/yr you&apos;re entitled to.</li>
        <li>this is the difference between drifting and deciding.</li>
      </ul>
    </Callout>
  );
}

function TextAction({
  onClick,
  children,
  muted = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "font-serif text-[0.95rem] italic transition-colors",
        muted ? "text-muted hover:text-ink" : "text-green hover:text-green-2",
      )}
    >
      {children}
    </button>
  );
}
