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
