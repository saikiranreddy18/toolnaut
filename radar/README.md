# Nexus Radar — self-updating tool pipeline

A host-agnostic Node pipeline that keeps the Nexus AI tool database fresh on its
own. It scouts sources daily, enriches each new tool onto the app's catalog
schema, validates it, publishes the confident ones, turns them into courses +
skills, and routes anything uncertain to a human review queue.

```
scheduler → [1 Ingest]  scout → dedup → enrich(LLM|fallback) → validate gate
                                                       │
                              publish ◄────────────────┼──────► review queue (low confidence)
                                 │
            [2 Knowledge]  course-gen(LLM|template) + skill graph
                                 │
            [3 Serve]      personalize + plan gate → user's chart / roadmap / skills
```

Scan the world **once, globally**; personalize **on read**. Radar never runs
per-user — one shared database, filtered per person by plan + persona.

## Run it

```bash
cd radar
node run.js --dry-run   # scout + classify + report, writes nothing
node run.js             # full run: publishes, builds courses, snapshots
npm test                # pure unit tests (offline, no keys)
node seed.js            # load the app's 704-tool catalog as the starting DB
```

Node 18+ (uses global `fetch`). No dependencies, no build step.

## No keys required

With an empty environment it runs on Hacker News + GitHub (no-key public APIs)
and **deterministic fallback enrichment**. Fallback records land in the review
queue instead of auto-publishing — that graceful degradation is intentional.
Add an LLM key (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `OPENROUTER_API_KEY`)
and enriched records become confident enough to auto-publish, and courses are
LLM-written instead of templated. See `.env.example`.

## Why it doesn't break

- **Staged → validated → published** — raw scrapes never touch live data.
- **Idempotent** — every processed tool is marked *known* (keyed by slug +
  domain), so a crashed or repeated run is always safe to re-run.
- **Isolated stages** — each candidate runs in its own try/catch; one bad item,
  dead source, or LLM hiccup never aborts the run.
- **Graceful degradation** — no LLM → deterministic fallback; dead source →
  skipped, others continue.
- **Versioned snapshots** — each run snapshots the published data for rollback.

## The validate gate (the contract)

Auto-publish only if a record passes **all**: required fields present; enums
valid (`category`, `price`, `level`); `website` is a URL; confidence ≥ 0.75.
Confidence 0.4–0.75 → review queue; below → rejected. Pure, synchronous, tested
in `test/validate.test.js` — runs identically in any runtime.

## Host-agnostic by design

- **Storage** is an adapter (`store/`). Default is JSON files; add a
  Postgres/Supabase adapter with the same methods to move hosts — nothing else
  changes.
- **LLM** is provider-agnostic (`llm.js`): Anthropic → OpenAI → OpenRouter,
  whichever key is set, with a deterministic fallback if none.
- **Schema** (`schema.js`) mirrors `src/utils/toolsCatalog.js`, so the app can
  read `data/tools.json` without transformation.

## Files

| Path | Role |
|------|------|
| `schema.js` | record shapes + enums (single source of truth) |
| `sources/` | one module per source; `index.js` runs them all, isolated |
| `dedup.js` | new-vs-known classification |
| `enrich.js` | LLM enrichment + deterministic fallback classifier |
| `validate.js` | the gate — pure `validate(record)` |
| `courseGen.js` / `skills.js` | knowledge-build lane |
| `store/` | storage adapter (JSON default) |
| `pipeline.js` | the orchestrator (one full run) |
| `run.js` | CLI entry (point cron here) |
| `seed.js` | import the app's existing catalog |
