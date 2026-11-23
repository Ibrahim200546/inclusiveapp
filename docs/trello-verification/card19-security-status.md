# Card 19: source and operational acceptance

Read-only review, 2026-11-23. The earlier Trello statement that the protections do not exist on main is stale. GitHub still lists PR #6 as open and unmerged, but the main snapshot `9e23fdf` contains the server-side AI authorization/quota implementation and client integration, the webhook protections, and the migration that restricts profile role changes. The corresponding source paths do not differ in local audit snapshot `45d2a87`. The status of PR #6 does not by itself describe main.

| Criterion | Evidence from the checked-in source | Still needs separate acceptance |
| --- | --- | --- |
| Server-side entitlement, input checks and quota for paid AI requests | The three AI handlers use the shared server access module. Local test source covers server access, client auth and TTS. | Confirm exact deployed commit and provider-side quota/operational limits in the authorized deployment environment. |
| Authenticated notification/webhook handling | The checked-in Supabase Edge Function contains caller-verification protections; the repository has targeted webhook tests. | Confirm live function revision and configured secret presence without displaying or copying secret values. |
| User profile role protection with ordinary editing retained | `supabase/migrations/20261029_api_and_profile_security.sql` and migration test source are present in main. | Confirm the migration is applied on the intended project and validate profile editing only in a sanctioned non-production environment with synthetic accounts. |

No protected production endpoints were invoked, no secrets inspected, no live role changes/notifications sent, and no provider calls made. This is a static source and PR-metadata audit, not a live security attestation. Keep the card open pending the owner's operational checks. Do not merge the old PR simply to make the status indicator match main.
