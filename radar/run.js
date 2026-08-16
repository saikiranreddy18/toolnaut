import './env.js'
import { createStore } from './store/index.js'
import { runPipeline } from './pipeline.js'
import { hasLLM } from './config.js'
import { log } from './util/logger.js'

// CLI entry point. Point a cron / scheduled function at this file:
//   node run.js            → full daily run (writes to the store)
//   node run.js --dry-run  → compute the report, write nothing
const dryRun = process.argv.includes('--dry-run')

async function main() {
  log.info(`starting — LLM: ${hasLLM() ? 'on' : 'off (deterministic fallback)'}, dryRun: ${dryRun}`)
  const store = createStore()
  log.info(`store has ${store.countTools()} published tools before run`)
  const report = await runPipeline({ store, dryRun })
  log.info('run complete', report.counts)
  console.log(JSON.stringify(report.counts, null, 2))
}

main().catch((e) => {
  log.error('pipeline fatal', e.stack || e.message)
  process.exit(1)
})
