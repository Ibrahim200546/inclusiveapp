# Desktop, Android and OTA releases

The platform workflows use `scripts/release/version.mjs` after `npm ci`. They require a full-history checkout (`fetch-depth: 0`) and derive the same version from the exact commit:

- Version: `1.1.<git rev-list --count HEAD>`.
- Android version code: commit count + 1000.
- Versioned GitHub release: `v1.1.<count>`.

This is monotonic along main's normal fast-forward history and independent of each workflow's run number. Do not rewrite main's history; changing the version scheme requires preserving upgrade ordering. The script changes only the runner's package.json, not the committed dependency lock. Local Android builds retain their development defaults unless RELEASE_VERSION and RELEASE_VERSION_CODE are supplied.

Windows and Android publish their own assets to the same public versioned release, with concurrent creation handled by a recheck. Existing versioned tags must match the exact source commit. Windows uploads its original installer, blockmap and latest.yml so Electron's updater can locate matching artifacts. The stable `apps-latest` APK and EXE URLs remain available; that alias retains its original publication date. New versioned releases have a new publication date and are marked latest. Platform jobs complete independently, so confirm both assets before announcing a complete release.

The Android artifact remains a **debug APK**, not a signed production/store release. Its runner-generated debug signing key is not a stable update-signing identity; replacing an already-installed APK may require uninstalling it first, which can delete local app data. Do not recommend uninstalling without warning and backup guidance. Production signing requires a separately authorized persistent signing setup. Windows installers remain unsigned.

OTA always saves a downloadable ZIP as a workflow artifact. A successful ZIP build does **not** prove an OTA deployment. If CAPGO_TOKEN is absent, the job emits a warning and its summary explicitly says OTA was not published. Configuring that credential is a separate authorized action; never put it in repository files. With a token, upload errors fail the step.

Tests for the version and publication guards:

```sh
node --test scripts/release/release.test-node.mjs
```
