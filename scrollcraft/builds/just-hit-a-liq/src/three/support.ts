// Tiny, dependency-free capability check, so pages can decide whether to
// fetch the 3D bundle at all.
export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
