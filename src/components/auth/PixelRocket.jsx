// Naut's ship, drawn as actual pixel art.
//
// The pixels are REAL: a 30x50 grid is filled cell by cell and emitted as
// integer-coordinate rects, so every edge lands on a pixel boundary and the
// diagonals stair-step the way the reference does. Drawing this as SVG paths
// with shape-rendering="crispEdges" would have been a third of the code and
// wrong — crispEdges only removes anti-aliasing, so the steps come out one
// device pixel tall and the whole thing reads as a smooth vector at any real
// display size. Chunky pixels have to be authored chunky.
//
// The grid is computed rather than typed as a sprite string. A hand-authored
// 1500-character map is unreadable and impossible to nudge; here the hull is a
// triangle plus a capsule, the porthole is a circle test, and the lime edge is
// TRACED — any empty cell touching the hull becomes outline. That last part is
// why the outline is unbroken around the fins and nose without anyone having to
// draw it twice.

const W = 34
const H = 50

// palette. Lime and the alien follow the active play mode; everything
// structural is fixed so the ship still reads as metal under every theme.
const C = {
  edge: 'var(--lime)',
  hull: '#4b515d',
  shade: '#3a404a',
  lit: '#5f6675',
  nose: '#2f343d',
  ring: '#a8bccd',
  ringDark: '#7089a0',
  glass: '#16273a',
  skin: 'var(--lime)',
  skinDark: '#7bbf1f',
  white: '#ffffff',
  pupil: '#12131b',
  smile: '#12131b',
}

function build() {
  const g = Array.from({ length: H }, () => Array(W).fill(null))
  const put = (x, y, c) => {
    if (x >= 0 && x < W && y >= 0 && y < H && c) g[y][x] = c
  }
  const solid = (x, y) => g[y] && g[y][x] && g[y][x] !== C.edge

  // Hull spans x 9..22 — 14 wide, half-width 7. It has to be wider than the
  // porthole's outer bead (6) or the window bulges past the body and the traced
  // outline balloons around it, which is what made the first cut read as a
  // balloon on a stick rather than a ship.
  const L = 9
  const R = 22
  const CX = 15.5

  // ── nose cone
  for (let y = 0; y < 13; y += 1) {
    const half = Math.max(1, Math.round(((y + 1) / 13) * 7))
    for (let x = Math.round(CX - half); x <= Math.round(CX + half) - 1; x += 1) {
      put(x, y, x > CX + half - 3 ? '#23272e' : C.nose)
    }
  }

  // ── hull
  for (let y = 13; y <= 38; y += 1) {
    for (let x = L; x <= R; x += 1) {
      let c = C.hull
      if (x <= L + 1) c = C.lit
      else if (x >= R - 1) c = C.shade
      put(x, y, c)
    }
  }

  // seam where the cone meets the hull
  for (let x = L; x <= R; x += 1) put(x, 13, C.edge)

  // ── fins. They start OUTSIDE the hull edge and sweep back, so they read as
  // bolted-on plates instead of the body flaring into a skirt. Kept short and
  // low: spanning half the hull they turned the ship into a delta wing.
  for (let y = 30; y <= 38; y += 1) {
    const out = Math.round(((y - 30) / 8) * 4)
    for (let k = 1; k <= out; k += 1) {
      put(L - k, y, k >= out - 1 ? C.shade : C.hull)
      put(R + k, y, k >= out - 1 ? '#33383f' : C.shade)
    }
  }

  // ── engine: a flat nozzle, not a taper. Tapering to a point made a dart tail.
  for (let y = 39; y <= 42; y += 1) {
    for (let x = L + 2; x <= R - 2; x += 1) put(x, y, y >= 41 ? '#2b3038' : C.shade)
  }

  // ── porthole
  const cy = 22
  for (let y = 15; y <= 29; y += 1) {
    for (let x = 8; x <= 23; x += 1) {
      const d = Math.hypot(x + 0.5 - CX, y + 0.5 - cy)
      if (d <= 4.0) put(x, y, C.glass)
      else if (d <= 5.2) put(x, y, y < cy ? C.ring : C.ringDark)
      else if (d <= 6.0) put(x, y, '#0e1014')
    }
  }

  // ── Naut at the glass. Antennae first so the head overlaps their stems.
  put(13, 17, C.skin); put(13, 18, C.skin); put(12, 16, C.skin)
  put(18, 17, C.skin); put(18, 18, C.skin); put(19, 16, C.skin)

  for (let y = 19; y <= 25; y += 1) {
    const half = (y <= 19 || y >= 25) ? 2 : 3
    for (let x = Math.round(CX - half); x <= Math.round(CX + half) - 1; x += 1) {
      put(x, y, x >= CX + half - 2 ? C.skinDark : C.skin)
    }
  }
  // Eyes are 2x2 with the pupil in one corner. At one pixel wide they were
  // just specks at this scale and the face read as blank.
  put(13, 21, C.white); put(14, 21, C.white); put(13, 22, C.white); put(14, 22, C.pupil)
  put(16, 21, C.white); put(17, 21, C.white); put(17, 22, C.white); put(16, 22, C.pupil)
  // Smile, dropped in the middle. A flat four-pixel bar read as a straight line.
  put(13, 24, C.smile); put(17, 24, C.smile)
  put(14, 25, C.smile); put(15, 25, C.smile); put(16, 25, C.smile)

  // ── trace the lime edge
  const edge = []
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (g[y][x]) continue
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        edge.push([x, y])
      }
    }
  }
  edge.forEach(([x, y]) => put(x, y, C.edge))

  return g
}

const GRID = build()

// Crop to what was actually drawn. Guessing H by hand left blank rows under the
// engine, and the plume mounts to the bottom of this sprite — so those blank
// rows showed up as a gap between the nozzle and its own flame.
const BOX = (() => {
  let top = GRID.length
  let bottom = -1
  let left = W
  let right = -1
  GRID.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return
    if (y < top) top = y
    if (y > bottom) bottom = y
    if (x < left) left = x
    if (x > right) right = x
  }))
  return { top, bottom, left, right, w: right - left + 1, h: bottom - top + 1 }
})()

// Merge each row into horizontal runs so the ship is ~180 rects instead of 900.
const RUNS = (() => {
  const out = []
  for (let y = BOX.top; y <= BOX.bottom; y += 1) {
    let x = BOX.left
    while (x <= BOX.right) {
      const c = GRID[y][x]
      if (!c) { x += 1; continue }
      let n = 1
      while (x + n <= BOX.right && GRID[y][x + n] === c) n += 1
      out.push({ x: x - BOX.left, y: y - BOX.top, w: n, c })
      x += n
    }
  }
  return out
})()

export default function PixelRocket({ width = 150, className = '', style }) {
  return (
    <svg
      className={className}
      style={style}
      width={width}
      height={(width / BOX.w) * BOX.h}
      viewBox={`0 0 ${BOX.w} ${BOX.h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {RUNS.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  )
}

export { BOX as ROCKET_BOX }
