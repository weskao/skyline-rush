# Adaptive road pickup visibility

Approved scope: all graphics qualities and all four road pickups. Work on feature/adaptive-pickup-visibility from develop; no merge or deployment.

1. Add projection math tests covering near, far, short landscape, invalid viewport, smooth transitions and caps.
2. Enlarge base model scales; adjust ground lift and reuse the existing guide/absorption pose.
3. Cache camera projection and logical CSS viewport once per race frame; apply bounded model/halo compensation in the shared instanced renderer. Keep guide framing and procedural/GLB fallbacks.
4. Add real Three.js marker regression covering four tiers, ground position, LOD continuity and halo. Preserve collection and physics code.
5. Document the shared rules. Run focused tests, full regression CI, and review real desktop/phone WebGL frames before integration.

Decisions: no extra road ring pool or new real lights; existing aura handles visibility without another draw call. Target 24 CSS px, or 28 in short landscape, subject to caps.
