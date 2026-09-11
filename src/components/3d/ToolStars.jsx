import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TOOLS, CATEGORY_META } from '../../utils/toolsCatalog'
import { isNewTool } from '../../utils/newTools'
import { isCatalogNoise } from '../../utils/prominence'

// The galaxy hosts ALL 704 catalog tools as star sprites. Each domain gets a
// distinct color from CATEGORY_META, so the spiral arms literally colour by
// tool category. The pointer-hover tooltip resolves any star's name.
// In-scene name sprites are rendered only for a small flagship subset — 704
// text canvases would eat hundreds of MB, so most tools rely on the tooltip.

function makeStarTexture(color) {
  const s = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = s
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, `${color}dd`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeNameTexture(name, color) {
  const w = 1024
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  let size = 116
  ctx.font = `700 ${size}px "Space Grotesk", system-ui, sans-serif`
  while (ctx.measureText(name).width > w - 120 && size > 48) {
    size -= 6
    ctx.font = `700 ${size}px "Space Grotesk", system-ui, sans-serif`
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = color
  ctx.shadowBlur = 42
  ctx.fillStyle = '#ffffff'
  ctx.fillText(name, w / 2, h / 2)
  ctx.shadowBlur = 0
  ctx.fillText(name, w / 2, h / 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// Same canvas label with a lime NEW tag over the name — the daily arrivals.
function makeNewNameTexture(name, color) {
  const w = 1024
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  let size = 104
  ctx.font = `700 ${size}px "Space Grotesk", system-ui, sans-serif`
  while (ctx.measureText(name).width > w - 120 && size > 44) {
    size -= 6
    ctx.font = `700 ${size}px "Space Grotesk", system-ui, sans-serif`
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = color
  ctx.shadowBlur = 42
  ctx.fillStyle = '#ffffff'
  ctx.fillText(name, w / 2, h / 2 + 26)
  ctx.shadowBlur = 0
  ctx.fillText(name, w / 2, h / 2 + 26)

  ctx.font = '900 44px "Space Grotesk", system-ui, sans-serif'
  ctx.shadowColor = '#a3ff2e'
  ctx.shadowBlur = 24
  ctx.fillStyle = '#a3ff2e'
  ctx.fillText('★ NEW', w / 2, 44)
  ctx.shadowBlur = 0
  ctx.fillText('★ NEW', w / 2, 44)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// Flagships that get in-scene name sprites (memory-safe subset)
const FLAGSHIP_NAMES = new Set([
  'ChatGPT', 'Claude', 'Claude Code', 'Cursor', 'Copilot', 'GitHub Copilot',
  'Gemini', 'Perplexity', 'Midjourney', 'Runway', 'ElevenLabs', 'Suno',
  'NotebookLM', 'n8n', 'Zapier', 'Grammarly', 'Notion AI', 'Figma AI',
  'Windsurf', 'Replit', 'v0', 'Lovable', 'Canva', 'Adobe Firefly',
  'Stable Diffusion', 'Hugging Face', 'LangChain', 'Jasper', 'Synthesia',
  'DeepL', 'Pika', 'Descript', 'Otter', 'Whisper', 'Llama', 'Mistral',
])

const RADIUS = 12
const BRANCHES = 5
const SPIN = 1.15
const REVEAL_FAR = 7
const REVEAL_NEAR = 3.2
const HOVER_PX = 24

// Cache one star texture per unique color (7 max) so all 704 sprites share
// the same GPU textures — cheap in memory, no visual difference.
const STAR_TEX_CACHE = new Map()
function getStarTex(color) {
  if (!STAR_TEX_CACHE.has(color)) STAR_TEX_CACHE.set(color, makeStarTexture(color))
  return STAR_TEX_CACHE.get(color)
}

export default function ToolStars() {
  const starRefs = useRef([])
  const nameRefs = useRef([])
  const worldPos = useRef(new THREE.Vector3())
  const ndc = useRef(new THREE.Vector3())
  const pointer = useRef({ x: -9999, y: -9999 })
  const hovered = useRef(-1)

  useEffect(() => {
    function onMove(e) {
      // Sections painted over the galaxy (e.g. the contact band) opt out of
      // star hovering via [data-galaxy-block] — otherwise tool names and the
      // tooltip fire "through" opaque content the user is actually pointing at.
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
    // The stars that get a NEW nameplate: the freshest dozen REAL tools.
    // Unfiltered, isNewTool matched 94 entries after a busy radar week —
    // ninety-four floating labels is not a galaxy, it is a spreadsheet —
    // and several were HN posts and repos, which isCatalogNoise already
    // exists to keep out of everything the app recommends. Newest first,
    // so "added today" genuinely reads as today.
    // A nameplate needs a NAME. isCatalogNoise catches repo slugs and
    // "Show HN:" prefixes, but the radar also ingests sentence-shaped HN
    // titles ("I built an AI music generator with some harnesses") that
    // pass it — a fine catalogue entry, a ridiculous star label. Products
    // are called Edify, CaptureAgent, Headless Tools: short, few words,
    // no clauses. Display gate only — recommendation filtering is
    // prominence.js's job, and this does not touch it.
    const looksLikeAName = (t) =>
      t.name.length <= 24 && t.name.split(/\s+/).length <= 3 && !t.name.includes(',')

    const newSlugs = new Set(
      TOOLS.filter((t) => isNewTool(t) && !isCatalogNoise(t) && looksLikeAName(t))
        .sort((a, b) => (b.discoveredAt || 0) - (a.discoveredAt || 0))
        .slice(0, 12)
        .map((t) => t.slug),
    )

    // Deterministic order — sort by name so branch assignment is stable.
    const sorted = [...TOOLS].sort((a, b) => a.name.localeCompare(b.name))
    const total = sorted.length
    return sorted.map((tool, i) => {
      const color = CATEGORY_META[tool.category]?.color || 'var(--cyan)'
      // Push most tools out into the arms; leave a sparse core.
      const t = i / total
      const r = 3.4 + Math.sqrt(t) * (RADIUS - 3.4)
      const branchAngle = ((i % BRANCHES) / BRANCHES) * Math.PI * 2
      const spinAngle = r * SPIN
      // Deterministic per-tool jitter using a hash of the index
      const h1 = ((i * 2654435761) >>> 0) / 4294967296 - 0.5
      const h2 = ((i * 40503) >>> 0) / 4294967296 - 0.5
      const h3 = ((i * 2246822519) >>> 0) / 4294967296 - 0.5
      const spread = 0.4 + r * 0.09
      return {
        tool,
        color,
        isFlagship: FLAGSHIP_NAMES.has(tool.name),
        // The radar stamps discoveredAt on every nightly find. Nothing to
        // configure — a tool added today rises here with its name on,
        // automatically, and rotates out as newer arrivals displace it.
        isNew: newSlugs.has(tool.slug),
        position: [
          Math.cos(branchAngle + spinAngle) * r + h1 * spread,
          h2 * spread * 0.6,
          Math.sin(branchAngle + spinAngle) * r + h3 * spread,
        ],
        phase: (i * 1.7) % (Math.PI * 2),
        speed: 0.6 + ((i * 37) % 10) / 10,
      }
    })
  }, [])

  const starTextures = useMemo(
    () => items.map((it) => getStarTex(it.color)),
    [items],
  )

  const nameTextures = useMemo(
    () => items.map((it) =>
      it.isNew ? makeNewNameTexture(it.tool.name, it.color)
      : it.isFlagship ? makeNameTexture(it.tool.name, it.color)
      : null),
    [items],
  )

  // Material.dispose() leaves textures in `map` behind — drop the per-flagship
  // name canvases explicitly. (Star textures are module-cached and shared.)
  useEffect(() => () => {
    nameTextures.forEach((tex) => tex && tex.dispose())
  }, [nameTextures])

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime
    const tooltip = document.getElementById('tool-tooltip')
    let best = -1
    let bestDist = HOVER_PX
    let bestX = 0
    let bestY = 0

    for (let i = 0; i < items.length; i++) {
      const star = starRefs.current[i]
      if (!star) continue

      star.getWorldPosition(worldPos.current)

      // screen-space hit test against the pointer
      ndc.current.copy(worldPos.current).project(camera)
      if (ndc.current.z < 1) {
        const sx = ((ndc.current.x + 1) / 2) * window.innerWidth
        const sy = ((1 - ndc.current.y) / 2) * window.innerHeight
        const dPx = Math.hypot(sx - pointer.current.x, sy - pointer.current.y)
        if (dPx < bestDist) {
          best = i
          bestDist = dPx
          bestX = sx
          bestY = sy
        }
      }

      // twinkle: slow breathing plus an occasional sharp glint
      const { phase, speed } = items[i]
      const breathe = 0.55 + 0.35 * Math.sin(t * speed + phase)
      const glint = Math.max(0, Math.sin(t * 0.31 + phase * 3.7) - 0.965) * 14
      const isHover = i === hovered.current
      star.material.opacity = isHover ? 1 : Math.min(1, breathe + glint)
      const s = (isHover ? 0.45 : 0.22) + glint * 0.2
      star.scale.set(s, s, 1)

      // reveal the in-scene name only for flagships when the camera is close
      const nameSprite = nameRefs.current[i]
      if (nameSprite && nameTextures[i]) {
        const d = camera.position.distanceTo(worldPos.current)
        const reveal = THREE.MathUtils.clamp((REVEAL_FAR - d) / (REVEAL_FAR - REVEAL_NEAR), 0, 1)
        nameSprite.material.opacity = isHover ? Math.max(0.9, reveal) : reveal * reveal
      }
    }

    hovered.current = best
    if (tooltip) {
      if (best >= 0) {
        tooltip.textContent = items[best].tool.name
        tooltip.style.borderColor = `${items[best].color}88`
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
      {items.map((item, i) => (
        <group key={item.tool.slug} position={item.position}>
          <sprite
            ref={(el) => (starRefs.current[i] = el)}
            scale={[0.22, 0.22, 1]}
          >
            <spriteMaterial
              map={starTextures[i]}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          {(item.isFlagship || item.isNew) && nameTextures[i] && (
            <sprite
              ref={(el) => (nameRefs.current[i] = el)}
              position={[0, 0.34, 0]}
              scale={[2.3, 0.575, 1]}
            >
              <spriteMaterial
                map={nameTextures[i]}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </sprite>
          )}
        </group>
      ))}
    </group>
  )
}
