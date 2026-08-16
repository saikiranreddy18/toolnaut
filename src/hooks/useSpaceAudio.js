import { useCallback, useRef, useState } from 'react'

// Warm, musical deep-space ambience, synthesized in the browser:
// a slowly-breathing suspended chord, a whisper of filtered air, and
// occasional pentatonic star chimes echoing through a long delay.
// Built lazily on first toggle — browsers require a user gesture anyway.

const CHORD = [98, 146.83, 174.61, 220, 293.66] // G2 · D3 · F3 · A3 · D4 (Dm9, no root-3rd) — deeper, more mysterious than the old Asus4
const PENTATONIC = [587.33, 698.46, 783.99, 880, 1046.5] // D minor pentatonic — darker chime color

function buildEngine() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // soften everything: one shared lowpass before the destination — pulled
  // down from 1400Hz so the pad reads darker and more distant
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 1050
  tone.connect(master)

  // breathing chord pad — sine voices (was triangle) for a rounder, less
  // reedy tone; each swells on its own slow cycle
  CHORD.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const voice = ctx.createGain()
    voice.gain.value = 0.013
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.035 + i * 0.014
    const depth = ctx.createGain()
    depth.gain.value = 0.008
    lfo.connect(depth).connect(voice.gain)
    osc.connect(voice).connect(tone)
    osc.start()
    lfo.start()
  })

  // faint stellar air: narrow band of noise, barely audible — centered lower
  // for a hollower, more cavernous whisper
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = buf
  noise.loop = true
  const air = ctx.createBiquadFilter()
  air.type = 'bandpass'
  air.frequency.value = 520
  air.Q.value = 0.5
  const airGain = ctx.createGain()
  airGain.gain.value = 0.006
  noise.connect(air).connect(airGain).connect(tone)
  noise.start()

  // chime space: longer feedback delay shared by the twinkle voice, for a
  // more spacious, slower-decaying echo
  const delay = ctx.createDelay(2)
  delay.delayTime.value = 0.62
  const fb = ctx.createGain()
  fb.gain.value = 0.42
  delay.connect(fb).connect(delay)
  const wet = ctx.createGain()
  wet.gain.value = 0.6
  delay.connect(wet).connect(tone)

  function twinkle() {
    const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)]
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = note
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.016, t + 0.06)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6)
    osc.connect(g)
    g.connect(tone)
    g.connect(delay)
    osc.start(t)
    osc.stop(t + 3)
  }

  const twinkleTimer = setInterval(() => {
    if (ctx.state === 'running' && Math.random() < 0.65) twinkle()
  }, 4600)

  return { ctx, master, twinkleTimer }
}

export function useSpaceAudio() {
  const [on, setOn] = useState(false)
  const engineRef = useRef(null)

  const toggle = useCallback(() => {
    let engine = engineRef.current
    if (!engine) {
      engine = engineRef.current = buildEngine()
    }
    const { ctx, master } = engine
    const next = !on
    if (next) {
      ctx.resume()
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2.5)
    } else {
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
      setTimeout(() => ctx.suspend(), 700)
    }
    setOn(next)
  }, [on])

  return { on, toggle }
}
