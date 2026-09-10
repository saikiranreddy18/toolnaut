import React from 'react'
import { reportError, REPORTING_CONFIGURED } from '../utils/errorReporting'
import { CONTACT_EMAIL } from '../config'

// The last line of defence. A throw during render unmounts the whole React tree
// and leaves an empty <div id="root"> — a white page with nothing to click and
// nothing in the console the visitor would ever look at. This catches that, and
// is what makes a crash reportable rather than merely invisible.
//
// Styles are inline on purpose. A boundary that depends on the stylesheet is a
// boundary that renders unstyled in exactly the case where the stylesheet is
// what failed to load.
const wrap = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#0a0a0f', color: '#e7e7f0', padding: '24px',
  fontFamily: "'Inter', system-ui, sans-serif",
}
const card = { maxWidth: '460px', textAlign: 'center' }
const btn = {
  marginTop: '20px', padding: '11px 22px', borderRadius: '10px', border: 0,
  background: '#7c3aed', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
}
const muted = { color: '#9a9ab0', fontSize: '14px', lineHeight: 1.6 }

export default class AppErrorBoundary extends React.Component {
  state = { failed: false, ref: null }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    // Generated here rather than taken from Sentry's event id, which is not
    // available synchronously once the SDK is loaded on demand. Sent as context
    // so the code the visitor quotes is searchable in the issue itself.
    const ref = Math.random().toString(36).slice(2, 10)
    // componentStack is the one piece of context the global handler cannot get:
    // which component threw, not merely which bundled line did.
    reportError(error, { ref, componentStack: info?.componentStack })
    this.setState({ ref })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛰️</div>
          <h1 style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: '24px', margin: '0 0 10px' }}>
            Something broke on our side
          </h1>
          <p style={muted}>
            Not your fault, and nothing you did is lost. Reloading usually clears it.
          </p>
          <button style={btn} onClick={() => window.location.reload()}>Reload the page</button>
          <p style={{ ...muted, marginTop: '18px', fontSize: '13px' }}>
            Still stuck? <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#06b6d4' }}>{CONTACT_EMAIL}</a>
            {REPORTING_CONFIGURED && this.state.ref ? <><br />Reference: <code>{this.state.ref}</code></> : null}
          </p>
        </div>
      </div>
    )
  }
}
