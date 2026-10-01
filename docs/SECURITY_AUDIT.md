# Dependency audit — 2026-10-01

The repository lockfile was checked with npm audit and npm audit --omit=dev. These are advisory entries in a dependency tree, not proven exploitable application defects.

## Result

- Baseline all dependencies: 39 entries (2 critical, 30 high, 5 moderate, 2 low)
- After compatible targeted patches: {"info":0,"low":0,"moderate":5,"high":1,"critical":0,"total":6}
- Remaining production tree: {"info":0,"low":0,"moderate":2,"high":0,"critical":0,"total":2}
- No force update, overrides, new credentials or major migration. Runtime Electron packaging and native updater operation have not been exercised here; web build, typecheck and tests are rerun.

## Selected updated locked packages

- electron: 42.11.10
- electron-builder: 26.15.3
- electron-updater: 6.8.9
- postcss: 8.5.28
- react-router-dom: 6.30.6
- tar: 7.5.22
- vite: 5.4.21
- vitest: 3.2.7
- rollup: 4.63.6
- ws: 8.22.0
- lodash: 4.18.1

## Remaining entries

| Package | Locked version | Severity | Scope | npm proposed fix |
| --- | --- | --- | --- | --- |
| @vitest/mocker | 3.2.7 | moderate | development/test/build | vitest 5.0.3 (major) |
| esbuild | 0.21.5 | moderate | development/test/build | vite 8.3.2 (major) |
| react-router | 6.30.6 | moderate | production dependency | react-router-dom 7.18.4 (major) |
| react-router-dom | 6.30.6 | moderate | production dependency | react-router-dom 7.18.4 (major) |
| vite | 5.4.21 | high | development/test/build | vite 8.3.2 (major) |
| vitest | 3.2.7 | moderate | development/test/build | vitest 5.0.3 (major) |

The remaining Vite/esbuild development-server, Vitest mocking, and React Router entries require major migrations in the current dependency graph. Those require an available browser and a dedicated compatibility pass. Do not expose development/test servers to untrusted networks. The app uses client-side routes; that observation does not establish that every Router advisory is exploitable or inapplicable.

## Advisory references

- [Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)
- [esbuild enables any website to send any requests to the development server and read the response](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
- [React Router: Open redirect via backslash in <Link> and useNavigate (CVE-2025-68470 bypass)](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6)
- [React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration](https://github.com/advisories/GHSA-337j-9hxr-rhxg)
- [Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)
- [launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)
- [vite: `server.fs.deny` bypass on Windows alternate paths](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)
