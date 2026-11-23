# Card 20: current sound-bank progression audit

Code snapshot: `45d2a87`, 2026-11-23, before the proposed card 08 variants. This supplements the historical November 2 matrix; where its older counts differ, use this snapshot for the named commit. Counts come from executing `CorexGradeSounds.stages/profile` for every class and category, not from the old inventory JSON.

| Category | Grade 0 | Grade 1 | Grade 2 | Grade 3 | Grade 4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Instruments | 2 | 3 | 4 / 6 | 8 | 10 |
| Domestic animals | 4 | 5 | 6 | 9 | 10 |
| Wild animals | 4 | 5 | 7 | 9 | 12 |
| Nature | 4 | 5 | 6 | 9 | 12 |
| Transport | 4 | 5 | 6 | 9 | 12 |
| Household | 4 | 5 | 8 | 9 | 12 |
| Technical | 4 | 5 | 6 | 7 | 9 / 3 |
| Human sounds | 4 | 5 | 5 | 5 | 5 |

Slashes separate real stages, not options in a round. Grade 2 instrument stages are introductory and expanded. Grade 4 technical stages are general and machines; machines are a separate subset drawn from the transport bank. In grades 0–1 a round shows the whole active bank; grades 2–4 show the target and up to two distractors. The audit found 42 profiles, 82 distinct stable sound IDs and 82 distinct local paths across the profiles. These counts are not proof of acoustic uniqueness or matching rights.

Grade 0 now inherits these immediately available sounds rather than introducing them later: horse and sheep, fox and owl, rain and thunder, train and fire engine, school bell and vacuum, clapper and popped balloon, cough and yawn. Grade 1 still adds its previous first-grade entries to those banks: cow, lion, wind, bus, doorbell, swords and sneeze. The instrument stages have not changed in this snapshot. The older starting limits recorded in cards 01/20 conflict with the later live level-1 expansion, so the snapshot does not treat widening as a defect to undo.

Runtime keys include local learner, grade, table, exercise context, category and stage. Recognition reads choices from its selected profile, keeps round choices stable on retry, and uses local files. This is code/data inspection, not evidence of live account sync, a headset check, or an end-to-end pass on a real phone.

Still open: instrument objectives need human approval; the grade 3 piano/accordion contrast and grade 4 combine are not complete. The grade 4 machines stage contains car, tractor and truck, with the truck's exact heavy-vehicle match unconfirmed. Common 0–1 navigation and the changed one-breath menu should be reconciled with later product directions before treating historical navigation criteria as current. See the detailed matrix for per-category objectives; no new pedagogical approvals or rights claims are made here.
