import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SignInModal from '../../components/auth/SignInModal'
import { loadSession, watchSession } from '../../state/authStore'

// /auth/login renders the sign-in dialog.
//
// WHY THIS SUBSCRIBES RATHER THAN CHECKING ONCE
// It used to be `if (loadSession()) return <Navigate/>`, evaluated once during
// render. Coming back from Google, the tokens arrive in the URL and Supabase
// parses them asynchronously — so at first render the session genuinely is not
// there yet, and nothing re-rendered the page once it appeared. The visitor sat
// on the sign-in screen while being fully signed in, which reads as a failed
// login even though it worked.
//
// Subscribing fixes the class of bug rather than the instance: any route that
// establishes a session late now redirects when it actually lands.
export default function Login() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  const next = searchParams.get('next') || '/app/stack'

  useEffect(() => {
    // Already signed in — nothing to do here.
    if (loadSession()) {
      navigate(next, { replace: true })
      return
    }
    // Otherwise wait for one to arrive, which is what a redirect back from a
    // provider looks like. No-op when Supabase is unconfigured.
    return watchSession((session) => {
      if (session) navigate(next, { replace: true })
    })
  }, [navigate, next])

  return (
    <SignInModal
      open={open}
      next={next}
      onClose={() => { setOpen(false); navigate('/', { replace: true }) }}
    />
  )
}
