# Reconstruction of unavailable Windows working changes

This is a reconstruction from the user's requirements, not a byte-for-byte recovery.
The previous cloud checkout and its untracked `playwright.cloud.config.ts` were preserved.
The checkout was fast-forwarded from 404ca73 to remote main
5ce273b56a4715be4caaa9210a6f65998bc0c3ad before editing. No upstream edits were discarded.
No repository AGENTS.md or .agents/skills instructions were present in the inspected workspace.

## Changes

- Removed junior class dropdowns and the teacher class dropdown. Classes 2–4 retain their existing menu doors.
- Combined 0–1 catalog exposes both variants, including `one-breath-extended` as a navigation alias. Original lesson IDs, grades, tables, content and storage identities remain unchanged. Duplicate-content variants are retained too, so existing progress remains addressable. The upstream sound-discrimination replacement is retained.
- Removed the landing home bottom navigation; the app's navigation remains. Other landing routes, including download, did not contain that navigation.
- Materials links to functioning exercises and no longer promises future audio. Program describes available pathways and goals without asserting full curriculum coverage. Contact removes invented details. Results distinguishes learning goals, observed choices, teacher observations and speech quality.
- Rhythm stores the current level, pattern, rounds, completed levels and the last 100 evaluated attempts per local learner/context. In-flight tapping restarts from listening after reopening; completed attempts are retained. Silent audio unlock is preserved.
- Breathing has kk/ru UI, local syllable/row restoration, separate viewed and teacher-observed records, and one teacher observation per syllable/context. It does not score pronunciation or require a microphone. Teacher marking is an observation control, not authenticated teacher authorization.
- Both embedded tasks use host identity/context; direct openings use the host's existing local account identity convention, otherwise guest. The merged section is identified as 0–1, not an invented grade. Parent identity changes invalidate the old iframe session; histories are not reassigned between learners.

## Verification

Passed after final edits:
- `npm run build`
- `npx tsc -b --noEmit`
- `npm run lint`: zero errors; three existing fast-refresh warnings
- `npm test`: 20 files, 176 tests
- `node --test scripts/release/release.test-node.mjs`: 4 tests
- `git diff --check`

New unit tests exercise restoration, learner isolation, separate teacher observation,
idempotent marking, original curriculum storage identities, and both breathing variants.

Seven targeted Playwright cases were added in `e2e/restored-work.spec.ts` for kk/ru,
360/1440 width, landing routes including download, application navigation, merged
curriculum, breathing restoration/teacher marks, learner switching, and exact rhythm sample/replay beats.
**They have not run against a browser successfully.** All seven failed at browser launch,
before application assertions: system Chromium reports
`socket() failed: Operation not permitted (1)` in process_singleton_posix.cc.
The alternative Playwright headless-shell installation failed with a truncated/non-ZIP download.
The cloud browser also could not reach the local Vite URL (`ERR_HTTP_RESPONSE_CODE_FAILURE`).
These are environment failures, not passed UI checks. Mobile/desktop appearance and actual
audio timing still require a working browser; the new browser test code itself is unverified.

## Publication gate and remaining acceptance

Do not push this reconstruction to main until the targeted browser checks and relevant
existing curriculum/learning regressions pass in a functioning browser environment.
Fetch main again and integrate any new work without force-pushing. No release or manual
deployment was performed. No CI exists for the unpublished reconstruction.
The baseline remote commit's Vercel status checks were success; GitHub workflow lookup
returned an internal connector error. These baseline checks do not validate this reconstruction.

The original program has not been located. Full curricular correspondence is not asserted.
Breathing content and both kk/ru formulations still need methodological acceptance.
Progress is browser-local; it does not recover data from the inaccessible Windows device,
provide cloud synchronization, or certify pronunciation quality.
