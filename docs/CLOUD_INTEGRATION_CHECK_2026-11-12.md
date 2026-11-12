# Cloud integration check (12 November 2026)

This merges the preserved desktop changes with origin/main `160dce437973eafb1cbd064348ace6710ddae5f6`, not a replacement of main. The desktop snapshot remains separately preserved.

## Preserved and integrated
- All 115 upstream curriculum lessons and 556 steps; phonetic-pair tools and breathing syllable presets.
- Upstream grade-sensitive sound recognition, three-answer instrument rounds, voice-presence activity, dance and grade selection.
- Local one-circle thematic navigation directly from each class; meaningful nested groups, no pagination. Existing mathematics door is reused.
- Immediate once-per-step rewards, minimal practice UI, guarded legacy rewards, security/API access work.
- All 49 upstream archive-sourced recordings retained with provenance (42 from the general sound archive, seven from aspaptar). The seven redundant local import copies and their separate metadata were omitted; upstream repaired drum remains unchanged. All 1,242 historical inventory files match their SHA256. Pedagogical listening/rights approval is still pending.

## Checks completed on the merged source
- `npm ci --no-audit --no-fund`: success with unchanged lock.
- Unit tests: 171 passed in 19 files.
- Production build and TypeScript: passed.
- ESLint: 0 errors; 3 existing Fast Refresh warnings.
- `node tools/check-integrated-navigation.cjs`: DOM-only traversal of 115 topic screens, exactly one orbit with at most six choices, all expected lessons without duplicates; five grade-specific instrument routes; junior grade preserved; legacy Back returns to the same topic instead of obsolete multi-ring menus.

## Remaining browser verification
The first cloud Playwright launch failed before loading any page: Chromium singleton socket was denied by the runtime. This is not a passed browser test, nor an application assertion failure. Desktop browser evidence predates the upstream merge and is not evidence for the final integration. Browser rendering, actual audio, modal behavior and adapted end-to-end tests must be rerun before claiming final acceptance.

No force push or history replacement is intended. Database changes have not been applied by this integration.
