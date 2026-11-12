# Direct class modules and single-orbit navigation (2026-11-12)

This supersedes the earlier All tasks and intermediate topic-hub designs.

- Topic entrances are directly around the existing class center. Existing doors are reused, including the single grade2 Math entrance. Original Math signs exercise remains inside Mathematics.
- Duplicate top-level exercise entrances are removed from the generated class menu, but their original actions/content remain reachable inside their topic.
- Level0–1 includes both classes' curriculum tasks, merging identical shared lesson IDs. Each lesson keeps its original grade/progress identity.
- Every topic/subtopic displays exactly one radial circle. There is no pagination, slider, carousel or stack of circles.
- Large topics use meaningful submenus: Listening has music/nature/everyday sounds; Pronunciation has vowels/consonants/syllables/articulation and sound families; multiplication is grouped by multipliers. At most six choices appear in a topic circle.
- Captions normalize line breaks, so old labels no longer run together. Class radial sizes use aspect-ratio rather than viewport-derived enormous heights; angles are isolated from old articulation overrides.
- A correct accepted answer shows the existing rewardModal immediately. Repeated solved clicks/repaints and Next/completion do not grant an additional reward for that answer.
- The dev server remains loopback-only at http://127.0.0.1:8080/original/index2.html with verified live reload.

Evidence: e2e/all-tasks.spec.ts recursively checks all topics in both languages, one circle and maximum six choices, preserves every expected lesson without duplicates, and checks the unique grade2 Math door and original exercise. Independent reviewers check actual geometry/hit targets and actual audio/reward behavior. No deployment, commit, push or native installation performed.
