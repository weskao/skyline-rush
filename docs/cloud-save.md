# Cloud save operations

GitHub Pages continues to host the website. Google sign-in and Firestore use the Firebase Spark project `skyline-rush-weskao`; Firebase Hosting is not required. The published GitHub Pages domain must remain in Firebase Authentication's authorized domains.
The game keeps versioned race results in `saves/{uid}`, permanent per-ruleset Mode/Stunt bests in `modeBests/{uid}`, and an intentionally minimal Google display name/email cache in `accounts/{uid}`. The three document paths are private by UID. Firebase Authentication remains the identity source of truth; no Google passwords or OAuth tokens are saved in Firestore. Device settings and Ghosts remain in browser storage.

## Local verification

Install Node dependencies with `npm ci`, have Java 21 or newer and Google Chrome available, then run:

```sh
npm test
npm run test:cloud
npm run build
```

`test:cloud` starts local Firebase Auth and Firestore emulators. Its Google account form uses mock identities and does not touch production data. The browser tests cover map recovery after clearing site data, account switching, export and delete, reconnect, and concurrent devices. Firestore rules tests cover owner-only reads, writes and deletion.

## Account data and safe progress restore

- Google login caches only `displayName` and `email` in `accounts/{uid}`, reading existing fields to avoid duplicate writes. Empty/invalid Google values do not wipe previously saved valid values. This uses the existing Spark database.
- Permanent mode records are synced separately from the last 50 `modeHistory` items. Private `modeBests/{uid}` contains versioned `bests` and `stunts` maps (maximum 200 entries each); device-specific Ghost traces remain local.
- The Cloud save dialog shows the current Google name, email and avatar with a fallback. The Sync now action reuses the normal transaction path; only acknowledged Firestore writes update the successful sync time.
- Switching Google identities keeps per-account local snapshots, including unsynced permanent results. Deleting cloud progress uses a single Firestore batch to delete `saves/{uid}`, `modeBests/{uid}` and `accounts/{uid}`; a local deletion marker blocks any accidental re-upload until browser cleanup has succeeded.
- Export generates a versioned JSON save with permanent records but without Google account metadata or Ghosts. Import accepts at most 1 MiB and validates the schema before merging. Neither operation upgrades the Firebase plan.
- **Production deployment is separate**: merging this branch or building the site does not deploy changed Firestore Rules. Do not test live private documents until both the published site and its rules are updated. Verify Spark quotas in Firebase Console and test with real Google accounts on Chrome and Safari.

## Spark usage and release

Check the [Firestore Usage dashboard](https://console.firebase.google.com/project/skyline-rush-weskao/firestore/usage) before publishing and periodically afterward. The [current Spark limits](https://firebase.google.com/docs/firestore/quotas) include 1 GiB stored, 50,000 reads per day, 20,000 writes per day and 20,000 deletes per day; verify the live dashboard because quotas can change. The normalized save has at most 50 entries in each history list, and the test exercises a full 50-entry mode history below 256 KiB. No frame-by-frame writes are sent to Firestore. The app checks the result of local storage writes before saying an unsynced copy exists; if both stores fail, it asks the player to keep the tab open and export the current race progress.

Publishing needs the updated `firestore.rules` and the website code. The feature branch alone does not update the live site. After an explicitly authorized release, deploy the rules and the site through the project's release process, then test with a real Google account on the published URL. Validate a second device and iPhone Safari. Until that happens, the live login, deletion and restore flow are unverified.

## Device-only data decision

Music and SFX volume, controls, graphics, language, selected paint and recent Custom choices depend on the device or are easy to choose again. Ghost traces are large and can be recreated; each Ghost store is already capped at 512 Ki characters. They stay in browser storage. The existing race-progress export does **not** include them, and there is no import button for them. If users later need them across devices, first define a separate versioned export/import format with validation and a size limit; only add cloud sync after measuring demand and Spark usage. This does not affect cloud restoration of paint **unlock eligibility**, which comes from synced stars.

## Owner handoff for the published-site check

The project branch rule requires an explicit request before merging or publishing. The owner can send: “請合併 `feature/firebase-cloud-save` 到 `main`，部署 Firestore 規則並發布 GitHub Pages。” The assistant can then run the release steps and report the deployed commit. Do not clear the only browser copy before the live site shows a successful cloud sync.

After publication:

1. Open `https://weskao.github.io/skyline-rush/` in Chrome. Open **Cloud save**, sign in with the intended Google account, and confirm the account name and “Race progress is saved to your Google account” (or the Traditional Chinese equivalent) plus a last-sync time. Export race progress as an optional extra copy.
2. In **Classic**, finish Coast in the top three so Neon unlocks. Wait for the cloud-saved message again; note the unlocked map, stars, best time and History result.
3. In Chrome DevTools, open **Application → Storage → Clear site data** for this site, then reload and sign in with the same Google account. Confirm Neon, stars, best time and History return. A fresh Chrome profile is a safer first dry run if there is old unsynced data in the original profile.
4. Open the same published URL on another device and on iPhone Safari. Sign in with the same account and confirm the same race results. Device preferences and Ghosts should remain local. Safari path for clearing only this site's data, if needed: **Settings → Apps → Safari → Advanced → Website Data → search for weskao.github.io → Delete**; menu names vary by iOS version.
5. Open the [Firestore Usage dashboard](https://console.firebase.google.com/project/skyline-rush-weskao/firestore/usage) while signed into the project owner account. Record stored data and today's document reads/writes; compare with the Spark limits above. Repeat after the real-device test. The assistant's Firebase MCP can confirm billing is disabled but does not expose this Usage dashboard's metrics.

If sign-in or restore fails, keep the original browser tab and exported JSON, then report the exact status text, device/browser, and whether the last-sync timestamp advanced. The website and the Firestore rules must both be published before testing deletion; the currently deployed rules do not yet allow it.
