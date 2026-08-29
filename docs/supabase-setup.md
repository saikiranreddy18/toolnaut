# Supabase setup — real Google sign-in

The code is already written and shipped. It runs on a simulated local session
until two values exist, then switches to real Google auth with no further code
change. This is the checklist for producing those two values.

**No SQL is required for sign-in.** Supabase Auth stores users in its own
built-in `auth.users` table. Tables are only needed later, when localStorage
progress moves to the server.

---

## 1. Create the Supabase project

supabase.com → New project. Free tier, no card. Pick a region close to your
users — `ap-south-1` (Mumbai) for an India-first audience.

The project URL is generated here and looks like
`https://abcdefghijklmnop.supabase.co`. It does not exist until the project
does, which is why this step comes first: Google's redirect URI is built from
it.

## 2. Create Google OAuth credentials

console.cloud.google.com

1. **APIs & Services → OAuth consent screen** → External → app name, support
   email, developer email. Publish it, or add yourself as a test user — an
   unpublished app rejects everyone not on the test list.
2. **Credentials → Create credentials → OAuth client ID → Web application**
3. **Authorised redirect URI** — the one people get wrong:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Supabase shows this exact string on its Google provider page. Copy it from
   there rather than typing it; a trailing slash or a missing `/v1` fails with
   `redirect_uri_mismatch`.

## 3. Connect them

Supabase → Authentication → Providers → Google → enable → paste the Client ID
and Client Secret from step 2.

## 4. Set the URLs

Supabase → Authentication → URL Configuration:

- **Site URL:** `https://toolnaut.xyz`
- **Redirect URLs:** add both
  - `https://toolnaut.xyz/**`
  - `http://localhost:5173/**`

Without the localhost entry, sign-in works in production and fails silently in
development.

## 5. Give the app the two values

Supabase → Settings → API. Copy **Project URL** and the **anon public** key.

Both are safe in the browser. Unlike the Featherless key — which had to move
into a serverless function — the anon key is designed to ship in client code.
What protects your data is Row Level Security on the tables, not secrecy of the
key.

**If you used the Supabase → Vercel integration**, this is already done. It
injects `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`vite.config.js` is configured to read that prefix as well as `VITE_`.

**Setting them by hand instead**, in Vercel → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Redeploy. That is the whole switch-over.

> **Never expose `SUPABASE_SERVICE_ROLE_KEY`.** The Vercel integration may inject
> it. It bypasses Row Level Security entirely and has full read/write on every
> table. `vite.config.js` deliberately does not include a `SUPABASE_` env prefix
> for this reason — adding one would bake that key into the public bundle.

---

## Verifying it worked

1. Open `/auth/login`. The line under the email field should read
   *"We'll email you a sign-in link"* rather than *"Dev preview — sign-in is
   simulated locally"*. That sentence is driven by `isSupabaseConfigured`, so it
   is a reliable indicator.
2. Click **Continue with Google**. The browser should leave for Google's account
   chooser. If it does not, the env vars are not reaching the build.
3. After choosing an account you land back in the app, and Supabase →
   Authentication → Users shows the account.

## What is still on localStorage after this

Sign-in becomes real; the data does not move. Stack, roadmap, streak, favourites
and community threads all stay in the browser, exactly as before — nothing is
lost, but nothing syncs across devices yet either.

That migration is the next piece of work, and it is where these become real:

- the leaderboard, which cannot rank anyone while scores are per-device
- the explorer and subscriber counts, currently seeded in
  `src/utils/communityStats.js`

Do the migration on first sign-in, so that someone who has already built a stack
as a guest keeps it when they create an account. Signing in and finding an empty
stack is how you lose the users who liked it enough to sign up.

---

## Real explorer count (optional, one-time)

The landing page's "Explorers" figure is a live count of signed-up accounts.
Until the table below exists it shows **nothing** — deliberately, because the
alternative is inventing a number.

Run `supabase/migrations/0001_explorers.sql` once in **Supabase → SQL Editor**.
It creates:

- `public.explorers` — one row per account, holding only the auth id and a
  timestamp. No name, no email. A public counter is not a reason to store
  anything about anyone.
- An insert-only RLS policy checking `auth.uid() = id`, so an account can
  register itself and nothing else.
- **No select policy at all** — the rows are unreadable, even by their owner.
- `public.explorer_count()`, a `security definer` aggregate, so the total is
  public while membership stays private.
- A backfill of existing `auth.users`, so switching over does not reset to zero.

The app registers on every arrival through `watchSession`, which is the only
place that sees the return trip from Google. The insert is idempotent on the
primary key, so signing in repeatedly costs one rejected row and never
double-counts.

**Expect the number to be small.** `/app` is open to guests, so most visitors
never sign in. That is the honest figure; the previous 1,300 was not.
