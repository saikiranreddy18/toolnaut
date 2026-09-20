// Extracted verbatim from AppShell.jsx, which had the only working "Skip to
// content" link in the app — every route outside /app/* had none. WCAG 2.4.1
// ("Bypass Blocks") requires a way to skip repeated header/nav chrome before
// reaching page content; targetId lets each shell/page point at its own main
// landmark.
export default function SkipLink({ targetId = 'main-content' }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--lime)] focus:px-4 focus:py-2 focus:font-display focus:text-sm focus:font-semibold focus:text-black"
    >
      Skip to content
    </a>
  )
}
