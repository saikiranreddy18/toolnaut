// Mutable frame-loop state shared between React UI and the three.js scene.
// Read every frame by CameraController; written by GalaxyExplorer inputs.
export const galaxyState = {
  explore: false,
  zoom: 11, // orbit distance in explore mode
  rotY: 0.6, // azimuth
  rotX: 0.45, // elevation, clamped in the controller
  scrollP: 0, // damped scroll progress [0,1] — written by CameraController each frame
  hoveredTool: null, // tool nearest the pointer per ToolStars' per-frame hit test; read by GalaxyExplorer to resolve a click
}

export const GALAXY_CENTER = [0, -3.1, 0]

if (import.meta.env.DEV) window.__galaxyState = galaxyState
