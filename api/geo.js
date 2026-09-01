// Tells the browser which country the edge resolved it to, so the UI can avoid
// advertising an offer the visitor cannot buy.
//
// This endpoint grants nothing. The country it reports is the same one
// create-order reads for itself from the same header — a caller who lies to
// this endpoint, or ignores it entirely, still hits the server-side rule.
import { countryOf } from './_razorpay.js'

export default function handler(req, res) {
  // Short cache: a visitor's country does not change between page views, and
  // this should not cost a function invocation on every mount.
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.status(200).json({ country: countryOf(req) || null })
}
