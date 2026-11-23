# Legacy activity audit, 2026-11-12

Scope: source review of legacy answer handlers in script.js and grade234-functions.js, extra-learning-ui.js and extra-learning-content.js; targeted browser regression checks. This is not a claim of complete human/pedagogical approval of every audio recording or microphone activity.

Fixed in script.js:
- Sound/no-sound rounds cannot reward an answer before a round, or a repeated answer. Superseded timers do not expose old choices.
- Animal sequence cannot reward an empty sequence or reward the same completed sequence repeatedly.
- Old sequence checker rejects an empty target instead of treating two empty arrays as success.
- Spatial matrix completion now shows the shared rewardModal once, replacing a delayed blocking alert and unsolicited reset. The completed arrangement stays visible; re-entering initializes a fresh round.

Verification: actual Chrome runtime on local server returned reward counts 0 before prompt, 0 for wrong answer, 1 for sound success/repeated success, unchanged for empty sequence, +1 for animal completion/repeat, unchanged for partial spatial matrix, +1 for spatial completion/repeat. No page errors. Added e2e/legacy-reward-guards.spec.ts.

Other observations: grade2 syllables reuses g0TaskSyllables, so the older g2t2Feedback fallback is not a live separate activity. Many legacy feedback strings remain Kazakh, and prerecorded language/pronunciation, microphone scoring and all drag/drop touch behavior still need dedicated acceptance testing. Existing old scripts contain duplicate function declarations allowed as browser classic scripts; Node module-mode --check rejects these, so browser parsing was used instead. Extra audio registry still depends on separately documented missing Trello source archive.
