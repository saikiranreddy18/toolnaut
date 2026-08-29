// Probing for WebGL costs a real context, and Chrome only hands out ~16 before
// it starts killing the oldest ones — so release the probe immediately.
export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

// Is this renderer likely to struggle with a heavy point cloud?
//
// The scene picked its quality tier from viewport width alone, which says
// nothing about the hardware: a wide window on a software renderer still asked
// for 70,000 points and delivered 8 frames a second. Runtime monitoring does
// eventually walk the budget down, but it takes seconds — and those seconds are
// the first impression. This lets the scene start low instead of degrading in
// front of the user.
//
// Deliberately conservative: it only reports true on evidence (a known software
// renderer, or a very small machine). An unknown GPU is assumed capable, since
// wrongly starting low costs quality for everyone with a normal card.
export function weakRenderer() {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (!gl) return true

    let name = ''
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    if (dbg) name = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
    if (!name) name = String(gl.getParameter(gl.RENDERER) || '')
    gl.getExtension('WEBGL_lose_context')?.loseContext()

    // SwiftShader / llvmpipe / Mesa softpipe are CPU rasterisers; ANGLE's
    // Direct3D11 software fallback reports "Microsoft Basic Render Driver".
    if (/swiftshader|llvmpipe|softpipe|basic render|software/i.test(name)) return true

    // Very small machines. Both are advisory and often absent, so each is only
    // trusted when it is present and clearly low.
    const cores = navigator.hardwareConcurrency
    if (typeof cores === 'number' && cores > 0 && cores <= 2) return true
    const mem = navigator.deviceMemory
    if (typeof mem === 'number' && mem > 0 && mem <= 2) return true

    return false
  } catch {
    return true
  }
}
