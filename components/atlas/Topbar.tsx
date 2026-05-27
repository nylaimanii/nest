"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SECTIONS } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import { MonoLabel } from "./MonoLabel";

export function Topbar() {
  const pathname = usePathname();
  const setSection = useAppStore((s) => s.setSection);

  return (
    <header className="sticky top-0 z-30 h-14 w-full border-b border-line bg-bone">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6">
        {/* wordmark */}
        <Link
          href="/simulation"
          className="font-serif text-[1.6rem] lowercase tracking-tight text-ink"
        >
          nest
        </Link>

        {/* section nav */}
        <nav className="flex items-center gap-7">
          {SECTIONS.map((sec) => {
            const active = pathname === sec.href;
            return (
              <Link
                key={sec.id}
                href={sec.href}
                onClick={() => setSection(sec.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative font-serif text-[1.05rem] lowercase no-underline transition-colors",
                  active ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {sec.label}
                {active ? (
                  <span className="absolute -bottom-1.5 left-0 h-[2px] w-full bg-green" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* editorial status detail */}
        <div className="flex items-center gap-2">
          <MonoLabel tone="muted">VERSION</MonoLabel>
          <span className="font-mono text-[0.75rem] text-muted">0.0.1</span>
        </div>
      </div>
    </header>
  );
}
