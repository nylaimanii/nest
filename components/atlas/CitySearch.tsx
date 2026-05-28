"use client";

import { useState } from "react";

import { findCityByName, makePartialCity } from "@/lib/atlas/cities";
import { geocodeCity } from "@/lib/atlas/geocode";
import { useAtlasStore } from "@/store/atlas";

type Status = "idle" | "locating" | "not-found";

export function CitySearch() {
  const addCity = useAtlasStore((s) => s.addCity);
  const setActiveCity = useAtlasStore((s) => s.setActiveCity);
  const roster = useAtlasStore((s) => s.roster);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;

    setStatus("idle");

    // 1) dataset hit?
    const local = findCityByName(query);
    if (local) {
      if (roster.some((r) => r.id === local.id)) {
        setActiveCity(local.id);
      } else {
        addCity(local);
      }
      setQ("");
      return;
    }

    // 2) fall through to geocode for partial-data record
    setStatus("locating");
    const geo = await geocodeCity(query);
    if (geo) {
      const partial = makePartialCity(geo.name, geo.lat, geo.lng);
      if (roster.some((r) => r.id === partial.id)) {
        setActiveCity(partial.id);
      } else {
        addCity(partial);
      }
      setQ("");
      setStatus("idle");
      return;
    }

    setStatus("not-found");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1">
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.currentTarget.value);
          if (status === "not-found") setStatus("idle");
        }}
        placeholder="add a city —"
        aria-label="add a city"
        className="w-full rounded-[2px] border-b border-line bg-transparent py-2 font-serif italic text-ink placeholder:text-muted focus:border-ink focus:outline-none"
      />
      {status === "locating" ? (
        <span className="font-mono text-[0.7rem] text-muted">locating…</span>
      ) : null}
      {status === "not-found" ? (
        <span className="font-mono text-[0.7rem] text-muted">
          not found — try a major US metro.
        </span>
      ) : null}
    </form>
  );
}
