import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { isNewTool } from '../../utils/newTools'
import { isCatalogNoise } from '../../utils/prominence'
import { galaxyState } from '../../state/galaxyStore'

// Every star in the galaxy is a real tool. There is no decorative dust: one
// point per catalog entry, laid out along a spiral, so the galaxy grows when the
// catalog does. Hovering any star names it; flagships and the newest arrivals
// also carry an in-scene nameplate that fades in as the camera gets close.
//
// All stars are ONE draw call (a Points object with a small shader) rather than
// a sprite each. A sprite per tool was ~1,000 objects walked by the renderer
// every frame; a single buffer is the same picture for a fraction of the work.

function makeNameTexture(name, isNew) {
  const w = 1024
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  let size = isNew ? 104 : 116
  ctx.font = `600 ${size}px "Inter", system-ui, sans-serif`
  while (ctx.measureText(name).width > w - 120 && size > 44) {
    size -= 6
    ctx.font = `600 ${size}px "Inter", system-ui, sans-serif`
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const y = isNew ? h / 2 + 26 : h / 2
  ctx.shadowColor = 'rgba(255,255,255,0.8)'
  ctx.shadowBlur = 36
  ctx.fillStyle = '#ffffff'
  ctx.fillText(name, w / 2, y)
  ctx.shadowBlur = 0
  ctx.fillText(name, w / 2, y)

  if (isNew) {
    ctx.font = '800 44px "Inter", system-ui, sans-serif'
    ctx.fillText('★ NEW', w / 2, 44)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// Flagships that get in-scene name sprites.
const FLAGSHIP_NAMES = new Set([
  'ChatGPT', 'Claude', 'Claude Code', 'Cursor', 'Copilot', 'GitHub Copilot',
  'Gemini', 'Perplexity', 'Midjourney', 'Runway', 'ElevenLabs', 'Suno',
  'NotebookLM', 'n8n', 'Zapier', 'Grammarly', 'Notion AI', 'Figma AI',
  'Windsurf', 'Replit', 'v0', 'Lovable', 'Canva', 'Adobe Firefly',
  'Stable Diffusion', 'Hugging Face', 'LangChain', 'Jasper', 'Synthesia',
  'DeepL', 'Pika', 'Descript', 'Otter', 'Whisper', 'Llama', 'Mistral',
])

// Cosmic tint for the landing galaxy only. The app keeps its monochrome
// category greys (CATEGORY_META); here each domain gets a soft nebula hue so
// the arms read as a real, living sky.
const COSMIC = {
  code: '#7dd3fc',
  design: '#f0abfc',
  writing: '#c4b5fd',
  data: '#93c5fd',
  automation: '#fcd9a8',
  learning: '#99f6e4',
}

const RADIUS = 13
// A classic two-arm barred spiral, like the Milky Way: the brightest tools sit
// on a short central bar, and two long arms leave its ends and wind about one
// and a quarter turns out to the rim.
const BAR = 2.6
const TURNS = 1.25
const REVEAL_FAR = 7
const REVEAL_NEAR = 3.2
const HOVER_PX = 18

// The opening: every tool starts as loose dust scattered through space, then
// all of them are pulled in along a swirl and settle into the spiral. The hero
// copy waits for this to finish (the 'toolnaut:galaxy-formed' event).
const INTRO_DELAY = 0.7
const INTRO_SECONDS = 4
export const GALAXY_FORMED_EVENT = 'toolnaut:galaxy-formed'

// Deterministic 0..1 hash so a tool keeps its place between visits.
function hash(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aIndex;
  attribute vec3 aColor;
  attribute vec3 aStart;
  uniform float uTime;
  uniform float uIntro;
  uniform float uHover;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    // Stars leave in a staggered wave so the spiral assembles, not snaps.
    float k = clamp(uIntro * 1.25 - aPhase * 0.25, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - k, 3.0);
    // Swirl the dust around the core while it falls in.
    float swirl = (1.0 - e) * 1.6;
    float cs = cos(swirl);
    float sn = sin(swirl);
    vec3 from = vec3(aStart.x * cs - aStart.z * sn, aStart.y, aStart.x * sn + aStart.z * cs);
    vec3 p = mix(from, position, e);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float breathe = 0.88 + 0.12 * sin(uTime * (0.6 + aPhase * 0.25) + aPhase * 6.2831);
    float glint = max(0.0, sin(uTime * 0.31 + aPhase * 23.0) - 0.97) * 30.0;
    float hovered = abs(aIndex - uHover) < 0.5 ? 1.0 : 0.0;
    // While flying in, each star is a touch larger and fully lit, so the
    // formation reads as bright light gathering, not faint dust.
    float flying = 1.0 - e;
    float size = aSize * (1.0 + glint * 0.5 + hovered * 1.6 + flying * 0.35);
    // Size from the star's FINAL depth, not where it is mid-flight: a star far
    // out in the dust cloud would otherwise shrink to a speck and look dim
    // until it arrived. Every star is its settled size and brightness from the
    // first frame.
    float settledDepth = max(-(modelViewMatrix * vec4(position, 1.0)).z, 1.0);
    gl_PointSize = size * uPixelRatio * (75.0 / settledDepth);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    // Full brightness from the first frame: the stars are bright while they
    // fly in, not only once the spiral has settled.
    vAlpha = min(1.0, breathe + glint + hovered + flying);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.18, 0.0, d);
    float halo = smoothstep(0.5, 0.0, d) * 0.85;
    vec3 col = mix(vColor, vec3(1.0), core);
    gl_FragColor = vec4(col, (core + halo) * vAlpha);
  }
`

export default function ToolStars() {
  const pointsRef = useRef()
  const nameRefs = useRef([])
  const worldPos = useRef(new THREE.Vector3())
  const ndc = useRef(new THREE.Vector3())
  const pointer = useRef({ x: -9999, y: -9999 })
  const introStart = useRef(null)
  const formed = useRef(false)
  const [tools, setTools] = useState([])

  useEffect(() => {
    // Load the live cleaned catalog from public/tools.json instead of the bundled catalog
    fetch('/tools.json')
      .then((r) => r.json())
      .then(setTools)
      .catch((e) => {
        console.error('Failed to load tools.json:', e)
        setTools([])
      })
  }, [])

  useEffect(() => {
    function onMove(e) {
      // Sections painted over the galaxy opt out of star hovering via
      // [data-galaxy-block], so names do not fire through opaque content.
      const over = document.elementFromPoint(e.clientX, e.clientY)
      if (over && over.closest('[data-galaxy-block]')) {
        pointer.current.x = -9999
        pointer.current.y = -9999
        return
      }
      pointer.current.x = e.clientX
      pointer.current.y = e.clientY
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const items = useMemo(() => {
    if (!tools.length) return []

    // Nameplates for the freshest dozen REAL tools: short, name-shaped titles
    // only, so a radar-ingested sentence never floats in space as a label.
    const looksLikeAName = (t) =>
      t.name.length <= 24 && t.name.split(/\s+/).length <= 3 && !t.name.includes(',')
    const newSlugs = new Set(
      tools.filter((t) => isNewTool(t) && !isCatalogNoise(t) && looksLikeAName(t))
        .sort((a, b) => (b.discoveredAt || 0) - (a.discoveredAt || 0))
        .slice(0, 12)
        .map((t) => t.slug),
    )

    // Flagships first so they sit in the bright inner arms; the rest by name,
    // so placement is stable from one visit to the next.
    const sorted = [...tools].sort((a, b) => {
      const fa = FLAGSHIP_NAMES.has(a.name) ? 0 : 1
      const fb = FLAGSHIP_NAMES.has(b.name) ? 0 : 1
      return fa - fb || a.name.localeCompare(b.name)
    })
    const total = sorted.length

    return sorted.map((tool, i) => {
      const h1 = hash(i + 1)
      const h2 = hash(i + 101)
      const h3 = hash(i + 211)
      const h4 = hash(i + 307)

      // Radius grows with rank, with a little noise so rings do not show.
      const t = (i + h1 * 0.9) / total
      const r = 0.2 + Math.pow(t, 0.8) * (RADIUS - 0.2)
      const arm = i % 2
      let x
      let z
      if (r < BAR) {
        // On the bar: a straight line through the core, slightly thickened.
        const along = (arm ? -1 : 1) * r
        x = along
        z = (h2 - 0.5) * (0.35 + r * 0.12)
      } else {
        // On an arm: winds out from the end of the bar. The angle grows with
        // the log of the radius, which is the shape real spiral arms follow.
        const u = Math.log(r / BAR) / Math.log(RADIUS / BAR)
        const theta = arm * Math.PI + u * TURNS * Math.PI * 2
        // Arms are narrow where they leave the bar and fan out at the rim.
        const spread = 0.22 + u * 1.1
        const rr = r + (h3 - 0.5) * spread
        const th = theta + ((h2 - 0.5) * spread) / r
        x = Math.cos(th) * rr
        z = Math.sin(th) * rr
      }
      const y = (h4 - 0.5) * (0.45 - (r / RADIUS) * 0.3)

      const isFlagship = FLAGSHIP_NAMES.has(tool.name)
      return {
        tool,
        color: COSMIC[tool.category] || '#c4b5fd',
        isFlagship,
        isNew: newSlugs.has(tool.slug),
        position: [x, y, z],
        size: isFlagship ? 3.4 : 1.6 + h1 * 1.2,
        phase: h2,
      }
    })
  }, [tools])

  const geometry = useMemo(() => {
    const n = items.length
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const size = new Float32Array(n)
    const phase = new Float32Array(n)
    const index = new Float32Array(n)
    const start = new Float32Array(n * 3)
    const c = new THREE.Color()
    items.forEach((it, i) => {
      pos.set(it.position, i * 3)
      c.set(it.color)
      col.set([c.r, c.g, c.b], i * 3)
      size[i] = it.size
      phase[i] = it.phase
      index[i] = i
      // Start as scattered dust: every tool at a random spot across the whole
      // view, then the intro pulls them all together into the spiral.
      const a = hash(i + 401) * Math.PI * 2
      const d = 2 + Math.sqrt(hash(i + 503)) * 20
      start[i * 3] = Math.cos(a) * d
      start[i * 3 + 1] = (hash(i + 601) - 0.5) * 12
      start[i * 3 + 2] = Math.sin(a) * d
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
    g.setAttribute('aIndex', new THREE.BufferAttribute(index, 1))
    g.setAttribute('aStart', new THREE.BufferAttribute(start, 3))
    return g
  }, [items])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uHover: { value: -1 },
          uIntro: { value: 0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

  const nameTextures = useMemo(
    () => items.map((it) => (it.isNew || it.isFlagship ? makeNameTexture(it.tool.name, it.isNew) : null)),
    [items],
  )

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
    nameTextures.forEach((tex) => tex && tex.dispose())
  }, [geometry, material, nameTextures])

  useFrame(({ clock, camera, gl }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    // Track the renderer's CURRENT pixel ratio. The scene lowers its resolution
    // when a device struggles; with a fixed ratio every star then doubled in
    // size and went soft a few seconds after load.
    material.uniforms.uPixelRatio.value = gl.getPixelRatio()
    const pts = pointsRef.current
    if (!pts) return

    if (!formed.current) {
      // Reduced motion, or the galaxy was already formed this visit: no intro.
      const skip = galaxyState.formed || window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (introStart.current === null) introStart.current = clock.elapsedTime
      const p = skip ? 1 : (clock.elapsedTime - introStart.current - INTRO_DELAY) / INTRO_SECONDS
      material.uniforms.uIntro.value = Math.min(1, Math.max(0, p))
      if (p < 1) return
      formed.current = true
      galaxyState.formed = true
      window.dispatchEvent(new Event(GALAXY_FORMED_EVENT))
    }
    const tooltip = document.getElementById('tool-tooltip')
    const w = window.innerWidth
    const h = window.innerHeight
    const matrix = pts.matrixWorld
    let best = -1
    let bestDist = HOVER_PX
    let bestX = 0
    let bestY = 0

    for (let i = 0; i < items.length; i++) {
      const p = items[i].position
      worldPos.current.set(p[0], p[1], p[2]).applyMatrix4(matrix)

      ndc.current.copy(worldPos.current).project(camera)
      if (ndc.current.z < 1) {
        const sx = ((ndc.current.x + 1) / 2) * w
        const sy = ((1 - ndc.current.y) / 2) * h
        const dPx = Math.hypot(sx - pointer.current.x, sy - pointer.current.y)
        if (dPx < bestDist) {
          best = i
          bestDist = dPx
          bestX = sx
          bestY = sy
        }
      }

      const nameSprite = nameRefs.current[i]
      if (nameSprite) {
        const d = camera.position.distanceTo(worldPos.current)
        const reveal = THREE.MathUtils.clamp((REVEAL_FAR - d) / (REVEAL_FAR - REVEAL_NEAR), 0, 1)
        nameSprite.material.opacity = i === best ? Math.max(0.9, reveal) : reveal * reveal
      }
    }

    material.uniforms.uHover.value = best
    // GalaxyExplorer's click-vs-drag handler reads this to resolve a tap —
    // same hit test the tooltip already runs, just also exposed off-frame.
    galaxyState.hoveredTool = best >= 0 ? items[best].tool : null
    if (tooltip) {
      if (best >= 0) {
        tooltip.textContent = items[best].tool.name
        tooltip.style.borderColor = `${items[best].color}99`
        tooltip.style.left = `${bestX}px`
        tooltip.style.top = `${bestY - 18}px`
        tooltip.style.opacity = '1'
      } else {
        tooltip.style.opacity = '0'
      }
    }
  })

  return (
    <group>
      <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
      {items.map((item, i) =>
        nameTextures[i] ? (
          <sprite
            key={item.tool.slug}
            ref={(el) => (nameRefs.current[i] = el)}
            position={[item.position[0], item.position[1] + 0.34, item.position[2]]}
            scale={[2.3, 0.575, 1]}
          >
            <spriteMaterial map={nameTextures[i]} transparent opacity={0} depthWrite={false} />
          </sprite>
        ) : null,
      )}
    </group>
  )
}
