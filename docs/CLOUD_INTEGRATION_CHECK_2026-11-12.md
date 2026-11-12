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

## Follow-up verification, 12 November

Fresh fetch still reports main `160dce437973eafb1cbd064348ace6710ddae5f6`.
Repeated checks: 171 unit tests passed, TypeScript and production build passed,
ESLint has no errors and three existing Fast Refresh warnings. DOM navigation
again traversed 115 topic screens successfully. The curriculum E2E helper now
walks nested topic groups, and keyboard coverage targets radial buttons rather
than the removed category tabs. README Node requirements now match package.json.
The verification workflow now runs on pushes to main as well as pull requests.

Local cloud Chromium still fails before page load because the runtime denies
its singleton socket, including a supported escalated launch. This is not a
browser acceptance pass. Windows Computer Use was separately stopped by its
URL-policy support limitation; no alternative Windows automation was attempted.

Trello card 30's HTML (added 08:00 UTC) and two reference PNGs are still not
readable through the connected metadata-only API; its supplied download URL
returns HTTP 401. Their exact replacement content has not been compared with
this candidate. No claim of completed card 30 or pedagogical listening is made.

## Card 30 follow-up correction

The later browser comparison of the attachment reported three missing contrast
labels: Ұ–У, Қ–Х and Қ–Һ. These are appended as pair-30 through pair-32, preserving
all 30 previous IDs and their saved progress. Existing К–Х and К–Һ are retained
as additional practice instead of silently relabeling their incompatible audio.
The added examples reuse the matching recorded sides from existing lessons:
мұ/му, қа/ха and қа/һа, with their existing word and sentence recordings. This
is not a claim that the prototype's particular example words were copied.
No new audio was generated and no professional pronunciation review is implied.
The consonant group is subdivided to preserve at most six choices per orbit.

The inspected prototype contains individual letters, articulatory hints and four
randomized speechSynthesis rounds, not syllable/word/sentence examples. This
implementation deliberately retains the existing app's recorded-audio,
syllable/word/sentence workflow rather than adopting browser letter-name TTS or
claiming an unverified phoneme model. It restores the missing contrast coverage,
not a pixel-identical or behavior-identical copy of that prototype.
