import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BRAND } from '../config'
import { BrandLogo } from '../components/ui/Mascot'
import { loadSession } from '../state/authStore'
import { loadQuiz } from '../state/quizStore'
import { generatePersona } from '../utils/personaGenerator'
import { planLabel } from '../utils/planData'
import ChatPanel from '../components/app/ChatPanel'
import InstallPrompt from '../components/app/InstallPrompt'
import { StackIcon, DiscoverIcon, LearningIcon, CommunityIcon, SettingsIcon, ChatIcon } from '../components/app/icons'

const NAV = [
  { to: '/app/stack', label: 'STACK', Icon: StackIcon },
  { to: '/app/discover', label: 'FIND', Icon: DiscoverIcon },
  { to: '/app/learning', label: 'LEARN', Icon: LearningIcon },
  { to: '/app/community', label: 'SQUAD', Icon: CommunityIcon },
  { to: '/app/settings', label: 'ME', Icon: SettingsIcon },
]

const UI_KEY = 'exus_ui_v1'

function loadChatOpen() {
  try { return !!JSON.parse(localStorage.getItem(UI_KEY))?.chatOpen } catch { return false }
}

function saveChatOpen(open) {
  try { localStorage.setItem(UI_KEY, JSON.stringify({ chatOpen: open })) } catch { /* storage blocked */ }
}

// Authed shell for /app/*: bottom nav + CSS starfield ambience (mobile-first),
// left sidebar on desktop — the WebGL galaxy never mounts here (APP-FLOW.md §1);
// the starfield keeps the "in space" feeling at zero GPU cost.
export default function AppShell() {
  const location = useLocation()
  const session = loadSession()
  const [chatOpen, setChatOpen] = useState(loadChatOpen)

  if (!session) {
    return <Navigate to={`/auth/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  const quiz = loadQuiz()
  const persona = quiz.completed ? generatePersona(quiz.answers) : null

  function toggleChat(open) {
    setChatOpen(open)
    saveChatOpen(open)
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 font-display text-sm font-black uppercase tracking-widest transition-all ${
      isActive
        ? 'border-black bg-[var(--lime)] text-black shadow-[3px_3px_0_#000]'
        : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
    }`

  return (
    <div className="relative flex min-h-dvh">
      <div className="starfield" aria-hidden="true" />

      {/* left sidebar — desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/10 px-4 py-5 lg:flex">
        <Link to="/" className="px-4" aria-label={BRAND}>
          <BrandLogo size={30} />
        </Link>

        <div className="sticker mt-6 p-4">
          <p className="font-display text-[10px] font-black uppercase tracking-widest text-lime-400">
            {persona ? '▸ Your persona' : '▸ No persona yet'}
          </p>
          <p className="mt-1 font-display text-sm font-black uppercase italic text-white">
            {persona ? persona.name : 'Take the quiz'}
          </p>
          {persona ? (
            <p className="mt-1 text-xs font-bold text-cyan-300">Plan: {planLabel(session.plan)}</p>
          ) : (
            <Link to="/quiz" className="mt-1 inline-block text-xs font-bold text-cyan-300 underline decoration-2 underline-offset-2 hover:text-white">
              60 seconds →
            </Link>
          )}
        </div>

        <nav className="mt-6 flex flex-col gap-1" aria-label="Sidebar">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={navLinkClass}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-4 text-xs text-slate-600">
          Signed in as {session.user.name}
        </div>
      </aside>

      {/* main content */}
      <main className="relative z-10 min-w-0 flex-1 pb-24 lg:pb-0">
        {/* mobile top bar — respects the notch */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#0a0a0f]/85 px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md lg:hidden">
          <Link to="/" aria-label={BRAND}>
            <BrandLogo size={26} />
          </Link>
          {persona && (
            <span className="rounded-full border border-exus-purple/50 bg-exus-purple/10 px-3 py-1 font-display text-xs text-cyan-300">
              {persona.name}
            </span>
          )}
        </div>
        {/* warp-in: each screen arrives from deeper space */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* right chat panel — desktop */}
      <AnimatePresence initial={false}>
        {chatOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-l border-white/10 lg:block"
          >
            <div className="h-full w-[340px]">
              <ChatPanel personaName={persona?.name} onClose={() => toggleChat(false)} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <InstallPrompt />

      {/* chat launcher (both breakpoints when closed) */}
      {!chatOpen && (
        <button
          onClick={() => toggleChat(true)}
          aria-label="Open AI assistant"
          className="nb-btn fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center !rounded-full !p-0 lg:bottom-6 lg:right-6"
        >
          <ChatIcon />
        </button>
      )}

      {/* chat bottom sheet — mobile */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-50 h-[75dvh] rounded-t-2xl border-t border-white/10 bg-[#12121c] lg:hidden"
            role="dialog"
            aria-label="AI assistant"
          >
            <ChatPanel personaName={persona?.name} onClose={() => toggleChat(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom nav — arcade (chunky lime border-top, uppercase labels, lime active glow) */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 bg-[#0a0a0f]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        style={{ borderTop: '2px solid var(--lime)' }}
      >
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `press relative flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-black tracking-widest uppercase transition-colors ${
                  isActive ? 'text-lime-300' : 'text-slate-500'
                }`
              }
              style={({ isActive }) => isActive ? { color: 'var(--lime)' } : {}}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-glow"
                      className="absolute -top-[2px] h-1 w-14 rounded-full"
                      style={{ background: 'var(--lime)', boxShadow: '0 0 14px var(--lime), 0 0 32px rgba(163,255,46,0.6)' }}
                      aria-hidden="true"
                    />
                  )}
                  <Icon />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
