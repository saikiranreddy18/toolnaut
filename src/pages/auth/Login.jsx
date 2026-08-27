import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import SignInModal from '../../components/auth/SignInModal'
import { loadSession } from '../../state/authStore'

// /auth/login now renders the modal rather than its own form.
//
// The route is kept because it is linked from the app, bookmarked, and used by
// the ?next= redirect the guards rely on. Closing the dialog here has to go
// somewhere, so it goes home — on a route whose only content is the dialog,
// dismissing it cannot just leave an empty page.
export default function Login() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  const next = searchParams.get('next') || '/app/stack'

  if (loadSession()) return <Navigate to={next} replace />

  return (
    <SignInModal
      open={open}
      next={next}
      onClose={() => { setOpen(false); navigate('/', { replace: true }) }}
    />
  )
}
