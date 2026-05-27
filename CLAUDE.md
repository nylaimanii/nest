# nest — claude code rules

## what nest is
the operating system for actually having the family you planned. closes the gap between the families people want and the families they have. honest tool with a spine — real numbers, real timelines, the hard questions.

## stack (locked)
next.js 16 app router · ts · turbopack · tailwind v4 · shadcn/ui (new york, neutral) · zustand · groq sdk (llama-3.3-70b-versatile for hard questions + navigation, llama-3.1-8b-instant for fast classification) · recharts · maplibre gl + react-map-gl · vercel via github main.

## aesthetic — scientific atlas (non-negotiable)
- bg bone `#FAF8F4`, ink `#1A1A17`, muted `#6B655C`
- accent deep green `#1F4D3A` primary, `#2E6F52` lighter
- hard-truth callouts only: terracotta `#9C3B2E`
- cards: fill `#F2EEE6`, border `#D8D2C8`
- type: refined serif (Fraunces) for display + lowercase nav, sans (Newsreader/system) body, MONO (JetBrains Mono/ui-monospace) for ALL numbers, stat labels, allcaps small labels
- layout: left sidebar (scenarios) · center explorable piece · right honest-details panel · optional bottom compare cards
- never Inter, never pure white, never rounded-full pills for primary actions, never emoji in UI

## determinism rule
money/timing/fertility math is CODE in `lib/sim/`, never AI-generated. LLM handles conversation, hard questions, benefit navigation — never numbers.

## tone
lowercase in nav + section headers. body sentence case. never preachy, never coercive, never cheerful-app energy. supportive, humble, factual. sensitive topics framed as informational, never medical advice.

## build rules
- never leave `npm run dev` running. start, verify, kill.
- no features outside the current step.
- no palette/font invention beyond what's listed here.
- commit at the end of every step: `step N: <short summary>`.
- if a step conflicts with this file, HALT and ask.
