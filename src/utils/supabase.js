import { createClient } from '@supabase/supabase-js'

// The Supabase client, or null when the project is not configured.
//
// Null is a supported state, not a failure. Until VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY exist, the app keeps running on the simulated session
// it has always used — so local dev, Vercel previews and anyone who clones this
// repo work with no credentials at all. Nothing calls this without checking.
//
// These two values are SAFE in the browser, unlike the Featherless key which
// had to be moved to a serverless function. The anon key is designed to ship in
// client code; what protects the data is Row Level Security on the tables, not
// secrecy of the key. Get both from Supabase → Settings → API.

// Two naming schemes on purpose. VITE_* is what you would set by hand; the
// NEXT_PUBLIC_* pair is what Supabase's Vercel integration injects, because it
// assumes a Next.js app. Accepting both means the integration works with no
// manual env setup at all, and a hand-set value still takes precedence.
const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// One client for the tab. createClient sets up storage listeners and a refresh
// timer, so building a second one silently doubles both.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Google sends the user back with the tokens in the URL; this consumes
        // them and cleans the address bar without any callback route of our own.
        detectSessionInUrl: true,
      },
    })
  : null
