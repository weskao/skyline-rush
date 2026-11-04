# Local all-unlocked preview

Run from the project root:

```sh
make dev-unlocked
# alias:
make test-unlocked
```

Open the **local URL** Vite prints (normally http://127.0.0.1:5173).

This special development-server configuration substitutes `src/access/dev-unlocked.ts`
for `src/access/production.ts` at Vite module resolution / transformation time.
The local preview unlocks **all tracks** and **all Garage paints** currently defined in
`RACE_TRACKS` and `PAINTS`. As those catalogs grow, the local preview picks up additions
without manually listing identifiers.

**Coming Soon / readiness gate:** A teaser image, animated 3D home scene or even a
registered race runtime is not proof that the full course is playable. Any ID in
`UPCOMING_TRACKS` defaults to `preview`; `development` also remains unenterable.
Only an explicitly reviewed `playable` entry in `upcomingReadiness()`, **and**
a resolvable `raceTrack(id)`, may START under `make dev-unlocked` or
`make dev-feature`. Currently only Frostbite Canyon has that status.
All other Coming Soon cards stay disabled in all modes, even if a developer
registers their unfinished runtime. Never promote status based solely on artwork.

Normal `make dev`, `main` release builds and future release builds using this
policy show every `UPCOMING_TRACKS` card as **COMING SOON** with START disabled,
including Frostbite. Releasing a map requires a separate, reviewed promotion out
of the Coming Soon catalog after full CI and real gameplay acceptance.

It **does not** fabricate medals, daily leaderboards, personal-best times, NITRO
earnings, or extra features that have not been implemented. It does not write unlock
values to `localStorage`, so normal progression returns when you switch to `make`.
Existing genuine saved progress is preserved.

To preview one remote feature branch without checking it out in this working tree:

```sh
make dev-feature world-tour-landmark-boost-polish
```

The argument is the suffix after `feature/`. A `feature/` prefix on that argument is removed. The command fetches `origin/feature/<name>`,
creates `.claude/worktrees/<name>` when that worktree is not already present, fast-forwards
it, and serves that checkout with the same all-unlocked config. The URL is HTTPS on
localhost, normally https://127.0.0.1:5443. The certificate is self-signed for
`127.0.0.1`; the browser asks once before continuing. The server binds to localhost only.

To run the standard application:

```sh
make
```

For production:

```sh
npm run build
# validates dist/ contains no dev-only unlock marker
```

The production Vite config always aliases to the normal progression implementation.
The alternate `vite.unlocked.config.js` explicitly refuses build commands and binds
only to localhost. The GitHub Pages workflow uses the normal production build, never
the local all-unlocked configuration.

**Security boundary / future paid product:** This isolates developer testing code
from production bundles, but the **current game still stores unlock progression in
client-side localStorage** and uses browser-side checks. That is **not tamper-resistant**.
For paid content, add authenticated **server-side entitlements**, verify purchases on
the server, and deliver protected assets or session-specific rights only after server
authorization. Bundling minification, local flags, and client storage are not licensing
security controls.
