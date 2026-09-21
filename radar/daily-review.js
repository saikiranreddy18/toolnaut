#!/usr/bin/env node

// Daily review cron job: Runs every day to audit all published/staged tools
// Checks: website availability, metadata quality, spam, duplicates
// Can be run with: node radar/daily-review.js
// Or scheduled via cron: 0 2 * * * cd /path/to/toolnaut && node radar/daily-review.js

import { createStore } from './store/index.js'
import { runDailyReview } from './review-bot.js'
import { log } from './util/logger.js'

async function main() {
  try {
    const store = createStore()
    log.info('Starting daily review...')

    const results = await runDailyReview(store)

    log.info(`Review complete: ${results.approved} approved, ${results.rejected} rejected`)

    if (results.issues.length > 0) {
      log.warn(`Issues found in ${results.issues.length} tools:`)
      results.issues.forEach(issue => {
        log.warn(`  ${issue.slug}: ${issue.issues.join(', ')}`)
      })
    }

    // Save report
    const report = {
      at: new Date().toISOString(),
      ...results,
    }
    store.appendToFile('data/review-reports.json', report)

    process.exit(results.rejected > 0 ? 1 : 0) // Exit with error if any rejected
  } catch (e) {
    log.error('Daily review failed', e.message)
    process.exit(1)
  }
}

main()
