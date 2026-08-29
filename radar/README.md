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

## The scorecard (what earns a place on the radar)

The validate gate asks "is this record clean?". The scorecard (`scorecard.js`)
asks the different, harder question: **does this tool create a repeatable
improvement in a real workflow?** One weighted rubric is applied to every tool
— 10 criteria, weights summing to 100 — and reported as **two scores that are
never averaged together**:

| | Question it answers | Weight |
|---|---|---|
| **Utility** | how much value does it create for its intended user? | 62 |
| **Trust** | how safe, stable and maintainable is it? | 38 |

```
utility high + trust high → strong recommendation
utility high + trust low  → test it, keep it out of critical workflows
utility low  + trust high → mature, but not compelling for this job
utility low  + trust low  → skip, or keep on the watchlist
```

Every tool also gets a readiness label — `watchlist` → `experiment` →
`builder-ready` → `production-ready` → `category-leader` — so an early GitHub
project never competes head-to-head with a stable hosted product.

**Two rules the module enforces, because they are what make the scores worth
reading:**

- **Nothing is invented.** A criterion is scored only from a *measured* signal
  (a real number from a source API — push recency, license, stars, declared
  topics) or an *explicit* model estimate. Anything else stays unscored and is
  excluded; the weights renormalise over what was actually judged and
  `coverage` reports how much of the rubric that was. Below 0.5 coverage the
  label is `unrated` — a tool nobody has evidence about scores nothing, not 50%.
- **Every score carries its basis.** `measured` vs `estimated` and the evidence
  behind it travel with each criterion, all the way into `public/tools.json`.
  Never render a score without its `coverage` and `label` beside it.

The **automation test** is a gate, not a tiebreak: unless the model can state a
tool's *trigger → input → AI step → action → outcome*, the label is capped at
`watchlist` however well it scored. A tool whose workflow nobody can describe is
interesting, not radar-worthy.

Scoring never blocks publication — most records are `unrated` (no LLM key means
no assessment), and gating the catalog on a score the pipeline cannot compute
would silently empty the site.

### What reaches the app

`publicScorecard()` is the contract. Every criterion ships — scored or not —
carrying its own `weight`, `label`, `basis` and `evidence`, so the app never
keeps a second copy of the rubric that can drift out of step with this file. An
unscored criterion ships `score: null` and `basis: 'unscored'`; a zero would
read as a negative finding. `automationFit.complete` is pre-computed here
because it is a scoring rule, not a display choice.

The app renders it through `src/utils/radarDisplay.js`, which owns one rule the
UI must not lose: **numeric scores appear only when the pipeline was willing to
label the tool.** Below that, coverage leads and the partial analysis is shown
as evidence rather than as a verdict.

```bash
node scripts/rescore.js --dry-run   # re-score the whole store offline
```

Half the rubric is time-sensitive, so re-score on a schedule: a repo that was
pushed yesterday at discovery has been silent for six months by spring, and its
momentum and maturity have to fall on their own.

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
| `scorecard.js` | the rubric — utility/trust scores, evidence, readiness label |
| `courseGen.js` / `skills.js` | knowledge-build lane |
| `store/` | storage adapter (JSON default) |
| `pipeline.js` | the orchestrator (one full run) |
| `run.js` | CLI entry (point cron here) |
| `seed.js` | import the app's existing catalog |
