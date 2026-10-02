# Dependency security (2026-10-02)

The release updates compatible dependency ranges and the build/test toolchain.
Vite 7, Vitest 4 and React Router 7 remove advisories affecting the previous versions.
SWC 1.15.46 is pinned because 1.16.13 fails its native Windows cache ACL check on this workstation; system permissions were not weakened.

Verification after installation: `npm audit --omit=dev` reports zero vulnerabilities.
The full audit reports two high-severity entries for the same development-tool dependency chain: `@capgo/cli -> node-forge`.

## Remaining upstream advisory

[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) affects RSA PKCS#1 v1.5 signature verification in node-forge through 1.4.0. The advisory has no patched published version at verification time. Both the installed Capgo 7 CLI and the latest Capgo CLI retain this dependency. No unsafe downgrade or audit suppression is used.

The CLI is a development dependency, excluded from the web bundle and packaged application files. Its inspected application calls use Forge for key generation, CSR/certificate signing, and PKCS12 conversion; no application caller of the vulnerable RSA verification function was found. The Forge library still contains that function, so the dependency advisory is not claimed to be fixed.

Relevant upstream application sources:

- [CSR/certificate preparation](https://github.com/Cap-go/capgo/blob/main/cli/src/build/onboarding/csr.ts)
- [Android keystore preparation](https://github.com/Cap-go/capgo/blob/main/cli/src/build/onboarding/android/keystore.ts)
- [OTA cryptography using Node crypto](https://github.com/Cap-go/capgo/blob/main/cli/src/api/crypto.ts)

Recheck the full audit before publishing OTA updates and adopt the upstream patched release when available. Do not process untrusted RSA signatures using the affected Forge verification API.
