# All tasks / radial navigation verification (2026-11-12)

- Removed curriculum catalogue pagination. All matching tasks are mounted at once in scrollable radial groups (up to four readable choices per group), not hidden pages.
- Added default All tasks filter, title search and result count in Kazakh/Russian. Category and class filters remain available.
- Moved All tasks entry into each level's radial menu; removed the separate non-radial catalogue entry.
- Task launch remains on radial buttons. Back/restart and in-lesson step progression are retained; these are not catalogue pagination.
- Preserved lesson IDs, progress persistence and curriculum content.

Verified locally:
- Vite production build: pass.
- TypeScript `tsc -b --noEmit`: pass.
- JS syntax check: pass.
- Changed E2E files lint: no errors (public legacy JS is excluded by repository ESLint configuration).
- 7 focused Playwright tests: pass. Search/reset/all classes in kk/ru; level entry/return; radial geometry and clickable controls at 320, 844, 1440 px; all 115 grade/lesson combinations accessible without pagination.
- Full Vitest suite after audio worker completed changes: 17 files / 151 tests pass.
- Initial UI run was interrupted by Vite EBUSY while audio files were being copied; rerun passed. An intermediate unit test run saw an incomplete audio change; final run passed.

Scope: local working copy only. No commit, push, deployment or native app installation. Full auth/native app checks and every lesson's audio completion workflow were not rerun for this navigation change.

## Expanded catalogue follow-up
- Added existing exercise actions from each level's radial menus, including instruments, syllables, spatial/voice games, articulation and all five listening modes.
- Exercise entry delegates to its existing menu action after restoring its source screen, retaining initialization and return context.
- Deduplicated targets and shared voice-reading entry. Reading contexts (voice/sounds/breathing) are distinguished, not silently merged.
- Omitted submenu entries where their leaf exercises are indexed.
- Added click/search regressions for instrument, syllable, frog, spatial, reading and articulation activities plus listening mode entry.
- Independent review found no caption-caption/center intersections in default All tasks groups at 320px across all five classes; actual click sweep of all indexed activities at grades 0, 2, 3, 4 produced no page errors.

## User correction: thematic child-facing modules (supersedes All tasks UI)
The user rejected the flat All tasks catalogue and requested thematic modules, no slider, and a simple exercise presentation like Musical Instruments.
- The level menu now opens a topic chooser instead of a mixed list. Available topics: Mathematics, Listening, Pronunciation, Speech, Comprehension, Sentences, Orientation.
- Each topic contains all its task tiles at once, no pagination, carousel, slider, search or category tabs. Task IDs and progress remain unchanged.
- The class selector remains under For teacher, preserving access to both 0 and 1 in the shared level menu.
- Legacy exercise actions are classified into the same topics and retain their original setup/return behavior.
- Practice uses a large Listen action and fully labelled answers; no numbered-answer lookup or duplicate center title. Next appears after a solved step; pause/stop during playback; restart on completion.
- Existing reward modal remains once on lesson completion, not on an incorrect response or listening alone.

Verification of this corrected version:
- 4 navigation UI tests pass: all five classes in kk/ru, all 115 curriculum entries exactly once across modules, original legacy exercise entry actions.
- Vite build pass; 17 Vitest files / 151 tests pass.
- Dedicated practice UI tests are documented separately by their test file e2e/practice-minimal.spec.ts.
