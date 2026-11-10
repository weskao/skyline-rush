// Dev-server half of `make <dev target> 3d=1` (DEV_3D=1): the bare app root redirects to the GLB Roadster + Coast look
// gates (`?model=roadster&look=3d`, see src/garage-model.ts and src/look-gate.ts), so every URL a dev server hands out
// (desktop, phone, Telegram) shows the 3D scene. Serve only, never a build; the gates themselves stay opt-in query params.
export const DEV_3D_QUERY = 'model=roadster&look=3d';

/** Redirect target for a request URL, or null to let it through. Only the bare root is rewritten; an explicit `model` or `look` wins. */
export function dev3dRedirect(url = '') {
  const parsed = new URL(url, 'http://localhost');
  if (parsed.pathname !== '/' || parsed.searchParams.has('model') || parsed.searchParams.has('look')) return null;
  return `/?${[parsed.search.slice(1), DEV_3D_QUERY].filter(Boolean).join('&')}`;
}

export function dev3dPlugin() {
  return {
    name: 'dev-3d-redirect',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const to = req.method === 'GET' ? dev3dRedirect(req.url) : null;
        if (!to) return next();
        res.statusCode = 302;
        res.setHeader('Location', to);
        res.end();
      });
    },
  };
}
