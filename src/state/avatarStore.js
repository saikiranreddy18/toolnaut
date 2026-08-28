// The explorer avatar the user picked, by id from components/app/Avatar.jsx.
//
// localStorage like the rest of the profile, so it survives a reload and costs
// nothing until accounts exist. When the backend lands this becomes one column
// on the profile row and the function surface below is what it implements.
//
// No default is assigned: an unpicked avatar renders as the initial-letter
// badge instead. Auto-assigning one would put a face on a profile the person
// never chose, and they would have no idea it was random rather than theirs.
import { AVATAR_IDS } from '../components/app/Avatar'

const KEY = 'exus_avatar_v1'

// The picker lives in ME and the portrait also renders in AppShell, which is a
// sibling that never re-renders when ME's state changes. Rather than lift the
// value into a context for one string, the store announces its own writes and
// the shell subscribes. Same-tab only, which is the case that was broken —
// `storage` fires in OTHER tabs, never the one that wrote.
export const AVATAR_EVENT = 'toolnaut:avatar'

export function loadAvatar() {
  try {
    const id = localStorage.getItem(KEY)
    return AVATAR_IDS.includes(id) ? id : null
  } catch {
    return null
  }
}

export function setAvatar(id) {
  try {
    if (id && AVATAR_IDS.includes(id)) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
  } catch { /* storage blocked */ }
  const next = loadAvatar()
  try { window.dispatchEvent(new CustomEvent(AVATAR_EVENT, { detail: next })) } catch { /* SSR/no window */ }
  return next
}
