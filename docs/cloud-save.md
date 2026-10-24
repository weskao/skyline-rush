# Cloud save operations

Google sign-in and Firestore use the Firebase Spark project `skyline-rush-weskao`.
The game keeps race results in `saves/{uid}` and device settings and Ghosts in browser storage.

## Local verification

Install Node dependencies with `npm ci`, have Java 21 or newer and Google Chrome available, then run:

```sh
npm test
npm run test:cloud
npm run build
```

`test:cloud` starts local Firebase Auth and Firestore emulators. Its Google account form uses mock identities and does not touch production data. The browser tests cover map recovery after clearing site data, account switching, export and delete, reconnect, and concurrent devices. Firestore rules tests cover owner-only reads, writes and deletion.

## Spark usage and release

Check the [Firestore Usage dashboard](https://console.firebase.google.com/project/skyline-rush-weskao/firestore/usage) before publishing and periodically afterward. The [current Spark limits](https://firebase.google.com/docs/firestore/quotas) include 1 GiB stored, 50,000 reads per day, 20,000 writes per day and 20,000 deletes per day; verify the live dashboard because quotas can change. The normalized save has at most 50 entries in each history list, and the test exercises a full 50-entry mode history below 256 KiB. No frame-by-frame writes are sent to Firestore.

Publishing needs the updated `firestore.rules` and the website code. The feature branch alone does not update the live site. After an explicitly authorized release, deploy the rules and the site through the project's release process, then test with a real Google account on the published URL. Validate a second device and iPhone Safari. Until that happens, the live login, deletion and restore flow are unverified.
