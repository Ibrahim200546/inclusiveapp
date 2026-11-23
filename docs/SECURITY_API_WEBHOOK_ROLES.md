# AI API, webhook and profile-role hardening

Task: https://trello.com/c/cz885FVH. Baseline: `4e03902e69e311597ec7d00f6853286d6035792c`, inspected on 2026-10-29.

## Verified scope and external controls

Repository configuration was inspected before implementation. `vercel.json` contains routing rewrites, with no checked-in authentication or rate-limit rules. `supabase/config.toml` sets `verify_jwt = false` for `send-telegram-message`, which must accept Telegram updates without a Supabase JWT. Each privileged branch now authenticates its own caller.

Live Vercel WAF/Deployment Protection, Supabase grants/policies, deployed functions, database-webhook headers and secret configuration were **not verified**. No Vercel/Supabase management connector is available in this session. An attempted browser inspection was stopped by the computer-use tool because it could not reliably identify the current URL. This is not evidence that production has no external protection or that privilege escalation was exploited.

No production database changes, paid-provider calls, Telegram messages or deployment were performed. The code is ready for review; operational acceptance remains pending the checks below.

## Server access and resource limits

All three AI handlers validate JSON input, verify the bearer session with Supabase Auth, reject anonymous Auth users, and reserve quota through a service-role-only database RPC before contacting a provider. The user ID comes from Auth, never the request body. Missing configuration, invalid Auth responses, quota failures and network failures deny access. Clients send the existing session token only to the three same-origin API routes; signed-out users retain static/local audio but cannot use paid AI.

The request body limit is 32 KiB after platform JSON parsing. This bounds application/provider input; the hosting platform still controls admission and parsing before the handler. Chat permits at most 24 messages, 4,000 characters each and 12,000 total. Evaluation permits a 200-character target and 2,000-character transcript. TTS permits 700 characters and bounded option fields. Chat/evaluation provider output is capped at 1,024 tokens. A logical request can try the existing fallback providers, so these are request budgets, not a currency-denominated billing cap.

| Scope | Requests/minute | Requests/UTC day |
| --- | ---: | ---: |
| Chat per account | 20 | 200 |
| Evaluation per account | 30 | 400 |
| TTS per account | 60 | 1,000 |
| All AI routes/accounts combined | 300 | 10,000 |

These initial limits are fixed in the migration and should be reviewed against the provider budget and classroom usage before rollout. PostgreSQL UPSERT row locks enforce the shared counters across serverless instances. The global row is updated first; quota exceptions roll back both counters. Fixed windows reset in place. Rejected requests return 429 with `Retry-After: 60`; exhausted daily budgets remain blocked until the next UTC day. Do not replace this with process-local counters. WAF request limits and provider billing alerts remain useful additional controls.

## Webhooks and profile roles

Contact notifications require a dedicated `CONTACT_WEBHOOK_SECRET` of at least 32 characters. Supported delivery is `x-webhook-secret`, `x-contact-webhook-secret`, or a bearer containing that dedicated secret. Public anon keys, user tokens and the service-role key are no longer accepted as notification credentials. Missing/short secrets fail closed. Only `INSERT` events for `public.contact_messages` with a UUID record ID are accepted; the message, email and thread are loaded from the database. Caller-supplied record contents are ignored. Telegram updates require `TELEGRAM_WEBHOOK_SECRET`, also at least 32 characters, in `x-telegram-bot-api-secret-token`; the existing admin-chat check remains. Webhook bodies are limited to 64 KiB while reading the stream, and errors do not expose downstream details.

Webhook retry deduplication is not introduced here: an authorized repeated database event may still send a duplicate notification. Keep notification credentials private and configure retry behavior deliberately.

The profile trigger uses the actual database writer role (`SECURITY INVOKER`), not editable user metadata or a claimed profile role. Ordinary API users may create the default `user` profile and edit ordinary fields, including on existing admin profiles, but cannot assign/change `role`. Only `postgres`, `supabase_admin` and `service_role` can manage roles through trusted administration. Existing stored roles are preserved and should be reviewed separately if historical grants allowed unauthorized changes.

## Rollout order and remaining acceptance

1. In Vercel, inspect and record WAF rate limits and Deployment Protection for these three routes in both preview and production. Do not assume a protected preview means production is protected. Do not copy tokens or secret values into evidence.
2. Run `supabase/tests/security_deployment_audit.sql` with read-only inspection access to capture the existing role grants, RLS and role-trigger configuration. Inspect whether any existing service/definer functions permit role changes on behalf of arbitrary users. Review existing privileged profiles through the normal administrator process.
3. Apply `20261029_api_and_profile_security.sql` to an isolated staging database first, then through the normal production migration process. Do this before deploying the AI handlers; an absent RPC intentionally makes them return 503.
4. Configure server-only Vercel `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` for the matching environment. Keep the service-role key out of `VITE_*`, static runtime configuration, browser storage and logs. Existing provider keys remain server-only.
5. Configure independent random contact/Telegram secrets in Supabase secret storage. Set the contact database-webhook header to the dedicated contact secret. Register Telegram's webhook with the matching `secret_token`. Never paste those values into an issue, PR, report or shell history. Coordinate sender configuration with function deployment to avoid a notification interruption.
6. Deploy the Edge Function with its `handler.ts` and `deno.json`, then deploy the Vercel handlers and updated static client together. Function-scoped dependency configuration follows [Supabase's documentation](https://supabase.com/docs/guides/functions/dependencies).
7. On staging with provider/Telegram stubs, verify signed-out, invalid-session, valid-session, quota exhaustion, absent-secret, forged-record, profile insert/update/upsert and normal profile-edit cases. Re-run the audit SQL after migration. Record live-control evidence before closing the Trello card.

Do not restore the old insecure handler as a fallback for missing secrets or quota configuration; configure the dependencies first. If rollout must be paused, disable the paid/notification routes while preserving the role protection.

## Local verification

`npm test` covers the real API handlers with mocked fetch, a dependency-injected webhook handler, the legacy client wrapper, and all SQL migrations in isolated PGlite PostgreSQL with Supabase-like Auth roles/RLS. SQL tests exercise allowed profile updates, insert/update/upsert escalation attempts, spoofed claims, service-only RPC privileges, per-user/global budgets, window resets and transaction rollback. PGlite serializes local connections; this is not a multi-server load test or a test of live Supabase grants.

Run `npm test`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`, and `npm run lint`. Tests must keep fetch mocked and use the isolated database; do not replace test credentials with live values.
