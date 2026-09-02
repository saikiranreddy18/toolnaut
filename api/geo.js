// Tells the browser which country the edge resolved it to, so the UI can avoid
// advertising an offer the visitor cannot buy.
//
// This endpoint grants nothing. The country it reports is the same one
// create-order reads for itself from the same header — a caller who lies to
// this endpoint, or ignores it entirely, still hits the server-side rule.
import { countryOf } from './_razorpay.js'

export default function handler(req, res) {
  // NEVER a shared cache. This response is per-visitor, and `public` put it in
  // Vercel's CDN — which then served the FIRST caller's country to everyone in
  // the world for an hour. That is why a VPN changed nothing: the price was
  // read from a cached "IN" no matter where the request came from.
  //
  // The client caches it per page load anyway, so this costs one invocation per
  // visit rather than one per component.
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ country: countryOf(req) || null })
}
