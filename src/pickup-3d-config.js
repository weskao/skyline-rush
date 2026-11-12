// Build-time switch shared by every course's pickup renderer and the guide.
// Makefile exports VITE_PICKUP_3D=1 only for an explicit 3d=1 invocation.
export const PICKUP_3D_ENABLED = import.meta.env?.VITE_PICKUP_3D === '1';
