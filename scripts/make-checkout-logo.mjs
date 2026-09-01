// Renders public/icon.svg to a PNG for Razorpay Checkout.
//
// Razorpay's `image` option is unreliable with SVG - it is fetched and drawn by
// their page, not ours, and an SVG that renders perfectly in a browser tab can
// come out blank in the modal. A PNG always works.
//
// 256px because the slot is displayed small but on retina screens, and the file
// is a few KB either way.
//
// Run after changing icon.svg:  node scripts/make-checkout-logo.mjs
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SIZE = 256
const svg = readFileSync('public/icon.svg', 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: SIZE, height: SIZE },
  deviceScaleFactor: 1,
})
// The icon carries its own dark rounded plate, so the page behind it stays
// transparent rather than painting a second background under it.
await page.setContent(
  `<body style="margin:0;background:transparent">
     <div style="width:${SIZE}px;height:${SIZE}px">${svg.replace(/width="\d+"/, `width="${SIZE}"`).replace(/height="\d+"/, `height="${SIZE}"`)}</div>
   </body>`,
  { waitUntil: 'networkidle' },
)
await page.screenshot({
  path: resolve('public/checkout-logo.png'),
  omitBackground: true,
})
await browser.close()

const bytes = readFileSync('public/checkout-logo.png').length
console.log(`wrote public/checkout-logo.png  ${SIZE}x${SIZE}  ${bytes} bytes`)
