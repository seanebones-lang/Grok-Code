# CANONICAL SYSTEM — THE ONLY VERSION

**Last updated:** 2026-02-26  
**Commit:** `37bd6e8`  
**Tag:** `canonical-2026-02-26`

---

## CRITICAL: This Is The Only Version

The system running at **http://localhost:3000** from this directory is the **only** canonical version. There is no other. Do not create alternate versions, deployment variants, or "improved" forks. All work happens here.

---

## Location & Identity

| Property | Value |
|----------|-------|
| **Path** | `/Users/nexteleven/grokcode/Grok-Code/Grok-Code` |
| **Git commit** | `37bd6e8a4c458e0beaaf9faa7563b9fbf38740c3` |
| **Commit date** | 2026-02-26 00:49:24 -0600 |
| **Description** | feat(chat+tts): perfect chatbot (stream/md/history/agents) + EVE ElevenLabs TTS w/ waveform |

---

## How to Run Locally

```bash
cd /Users/nexteleven/grokcode/Grok-Code/Grok-Code
npm run dev
```

Opens at **http://localhost:3000**.

---

## What This System Contains

- **ChatPane** — Full chatbot with streaming, markdown, history, agents
- **EVE ElevenLabs TTS** — Text-to-speech with waveform visualization
- **Sidebar** — Connect repo, sessions, agents, health
- **Header** — Top bar
- **useTTS** — Hook for stream/fallback/waveform (Canvas-based, no extra deps)

Entry point: `src/app/page.tsx` (Header + Sidebar + ChatPane).

---

## What NOT to Do (Lessons From Past Failures)

1. **Do NOT** treat the parent repo (`/Users/nexteleven/grokcode/Grok-Code`) as the source of truth. It is a separate repo with different history. Deployment work there previously broke this system.
2. **Do NOT** merge, sync, or copy from the parent into this directory without explicit instruction.
3. **Do NOT** remove `@tailwindcss/typography` from dependencies — it is required by `tailwind.config.js`.
4. **Do NOT** refactor, simplify, or "improve" the layout without explicit user approval. The current structure (Sidebar + ChatPane + Header) is intentional.
5. **Do NOT** create alternate app structures, deployment variants, or "clean" rewrites. This is the system.

---

## Parent vs Child Repo (Historical Context)

| Repo | Path | Purpose | Status |
|------|------|---------|--------|
| **Child (CANONICAL)** | `Grok-Code/Grok-Code` | Local development, the only system | ✅ Use this |
| **Parent** | `Grok-Code` | Was used for Vercel deployment | ⚠️ Superseded; code archived in `archive/` |

The parent caused confusion: deploy attempts modified it, breaking the local system. The parent's code as of `83ff171` is archived in `archive/dead-code-parent-83ff171/` for reference only.

---

## Restoring This Version

If the repo drifts:

```bash
cd /Users/nexteleven/grokcode/Grok-Code/Grok-Code
git checkout canonical-2026-02-26
# or
git reset --hard 37bd6e8
npm install
npm run dev
```

---

## Dependencies to Keep

- `@tailwindcss/typography` (devDependencies) — Required by `tailwind.config.js`
- `@elevenlabs/elevenlabs-js` — TTS
- `@monaco-editor/react` — Editor (if used)
- All other deps in `package.json`

---

## Archive Layout

```
archive/
  dead-code-parent-83ff171/   # Parent repo src as of 2026-02-26 (superseded)
  README.md                   # What's archived and why
```

These are snapshots of superseded code. Do not use for development.
