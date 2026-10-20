# App icon and installation

The icon extends the game's forward-slant orange mark with a navy background,
warm highlights and cool speed trails. The regular icons have rounded corners;
the Apple touch icon and Android maskable icon have opaque square backgrounds
so the operating system can apply its own shape without a second inset border.
The primary mark stays inside the maskable icon's central safe circle.

## Install the website

After these assets are deployed over HTTPS:

- **iPhone / iPad:** open the site in Safari, then Share → Add to Home Screen.
- **Android:** open the site in Chrome, then the menu → Install app / Add to Home screen.
- **Windows:** open the site in Chrome or Edge, then use the install option in the address bar or browser menu.
- **macOS:** open the site in Safari (macOS Sonoma or newer), then File → Add to Dock. Chrome's install option also works.

Menu wording and the final icon mask depend on the browser and operating system.
An existing installation may cache its previous icon; remove and add it again
after deployment if needed. iOS also keeps the status-bar style an icon was
added with: icons added before v0.12.0 stay in `black-translucent` mode and keep
a 62 pt band at the bottom that only the page background can reach. Remove and
add those icons again to get the full screen. Installation requires a supported browser. This
change supplies online web-app installation metadata, not offline gameplay or
native app-store packages.

## Assets

- `public/icons/app-icon.svg`: editable vector master and modern favicon.
- `public/icons/favicon-32.png`: PNG favicon fallback.
- `public/icons/apple-touch-icon.png`: 180 × 180 opaque Apple touch icon.
- `public/icons/icon-192.png` and `icon-512.png`: rounded regular app icons.
- `public/icons/icon-maskable-512.png`: opaque Android adaptive icon.
- `public/manifest.webmanifest`: app name, relative scope/start URL and icon declarations.

With dependencies and Chrome installed, regenerate the PNGs using the project's
existing Playwright dependency; no additional image package is required:

```sh
node scripts/generate-icons.mjs
npm run test:browser -- tests/app-icon-browser.spec.js
```

Vite rewrites the HTML links for its configured base path. Manifest URLs are
relative to the manifest itself, including `id`, `start_url` and `scope`, so the
same files support both `/` and the GitHub Pages `/skyline-rush/` deployment.

Platform references: [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable),
[Apple touch icons](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html),
[WebKit web apps on Mac](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/).
