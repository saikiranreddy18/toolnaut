# Review Bot — Automated Tool Quality Control

The review bot is an automated quality-control system that validates every tool **daily** before it's published to the Toolnaut catalog. It's the second gate after the initial pipeline validation.

## What It Checks

### Hard Blocks (Tool gets rejected if ANY fail)
- ✗ **Website Unreachable** — HTTP HEAD request fails or times out
- ✗ **Invalid URL** — Malformed or reserved domain (example.com, localhost, etc.)
- ✗ **Spam/Scam Detected** — Known fraud patterns (viagra, casino, crypto scams, etc.)
- ✗ **Duplicate Found** — Fuzzy match against existing tools (>85% similar)
- ✗ **Low Confidence** — Enrichment confidence score < 0.5

### Soft Warnings (Lower approval score but don't auto-reject)
- ⚠ **Blurb Too Short** — Less than 20 characters
- ⚠ **Insufficient Tags** — Fewer than 2 tags
- ⚠ **Suspicious Domain** — Very short hostname or known spam TLDs
- ⚠ **Too Many Redirects** — Website redirects >3 times

## How It Works

### 1. Pipeline Integration
```
Collect → Filter → Enrich → Validate ↓
                              ↓
                          Review Bot ← NEW
                              ↓
                        Publish/Review/Reject
```

Every candidate that passes `validate()` also goes through `reviewTool()` before publishing.

### 2. Decision Logic
```
┌─────────────────────────────────────┐
│ Validation + Review Bot Results    │
├─────────────────────────────────────┤
│ ✅ Validate PASS + Bot APPROVE     │
│    → PUBLISH immediately           │
├─────────────────────────────────────┤
│ ⚠ Validate REVIEW + Bot APPROVE   │
│    → REVIEW QUEUE (human check)   │
├─────────────────────────────────────┤
│ ❌ Validate REJECT OR Bot REJECT  │
│    → REJECT (save for next run)   │
└─────────────────────────────────────┘
```

## Running the Review Bot

### Manual Daily Review
```bash
node radar/daily-review.js
```

Outputs:
- Review report (# approved, # rejected)
- Issues found in rejected tools
- Saves report to `data/review-reports.json`

### Automated Cron Schedule (Linux/macOS)

Add to crontab:
```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/toolnaut && node radar/daily-review.js

# Or run every 6 hours
0 */6 * * * cd /path/to/toolnaut && node radar/daily-review.js
```

### Vercel Cron Job (Recommended)
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/review",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Then in `api/review.js`:
```javascript
import { runDailyReview } from '../radar/review-bot.js'

export default async (req, res) => {
  const results = await runDailyReview(store)
  res.json(results)
}
```

## Quality Score Calculation

Each tool gets a score (0-1):
```
Base = validation confidence (0.5-0.9)
Score -= issues.length * 0.15      // Hard blocks
Score -= warnings.length * 0.05    // Soft warnings
Score += bonus for good metadata   // Tags, audience, dev info
Result = Math.max(0, Math.min(1, score))
```

**Publication thresholds:**
- ≥ 0.75 → Publish immediately
- 0.4–0.75 → Send to review queue
- < 0.4 → Reject

## Example Output

```
Review complete: 42 approved, 3 rejected

Issues found in 3 tools:
  some-tool-123: website-unreachable: HTTP 404, duplicate-of: existing-tool
  another-tool-456: low-confidence: 0.35 (need >= 0.5)
  spam-detector-789: spam-pattern: /crypto.*scam/i
```

## Customizing Checks

Edit `radar/review-bot.js` to add/modify checks:

```javascript
// Add custom validator
function checkCustom(record) {
  if (badPattern.test(record.name)) {
    return { ok: false, reason: 'custom-rule-violation' }
  }
  return { ok: true }
}

// Add to reviewTool()
const customCheck = checkCustom(record)
if (!customCheck.ok) {
  issues.push(`custom: ${customCheck.reason}`)
}
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `website-unreachable: HTTP 404` | Tool moved/deleted | Manually fix URL or reject |
| `duplicate-of: existing-tool` | Very similar tool already exists | Check if it's a real duplicate |
| `blurb-too-short` | Auto-generated description | Improve enrichment prompt |
| `spam-pattern: /viagra/` | False positive | Adjust spam patterns |

## Monitoring

Check daily reviews:
```bash
# View latest review report
tail -1 radar/data/review-reports.json

# All reports
cat radar/data/review-reports.json
```

## Future Enhancements

- [ ] Website content scraping (verify tool actually exists)
- [ ] Screenshot verification (no redirect-to-blog)
- [ ] Price validation (check pricing page)
- [ ] Social proof (GitHub stars, upvotes)
- [ ] ML-based fraud detection
- [ ] Rate limiting per source (HackerNews vs GitHub)
