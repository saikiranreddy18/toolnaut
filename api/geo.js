// Country for regional pricing, read from the header Vercel stamps on every
// request. No external geo service, no permission prompt, no body, and
// deliberately COARSE — the pricing page needs "India or not", never a city
// or coordinates, so nothing finer ever leaves this function.
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }
  const country = String(req.headers['x-vercel-ip-country'] || '').slice(0, 2).toUpperCase() || null
  // Cache at the CDN briefly per client; the answer changes when the person
  // travels, not per pageview.
  res.setHeader('Cache-Control', 'private, max-age=3600')
  return res.status(200).json({ country })
}
