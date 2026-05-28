"use client";

interface LandingScrollLinkProps {
  /** id of the section to scroll to (without #). */
  targetId: string;
  label: string;
  className?: string;
}

/**
 * Tiny client-side smooth-scroll button used by the landing hero's
 * secondary CTA. plain button (not a link) — no href, no hash in url,
 * no full-page jump on no-js.
 */
export function LandingScrollLink({
  targetId,
  label,
  className,
}: LandingScrollLinkProps) {
  return (
    <button
      type="button"
      onClick={() => {
        document
          .getElementById(targetId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className={
        className ??
        "font-mono text-[0.75rem] uppercase tracking-[0.15em] text-muted transition-colors hover:text-ink"
      }
    >
      {label}
    </button>
  );
}
