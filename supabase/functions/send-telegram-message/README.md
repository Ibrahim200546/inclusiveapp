Supabase function: `send-telegram-message`

What it does:
- Receives `contact_messages` insert webhooks from Supabase
- Sends a Telegram notification with 2 buttons under each message:
  - `Ответить` -> arms the bot so the next Telegram message is sent back to the website chat
  - `Ответить Gmail` -> opens Gmail via `mailto:...`
- Receives Telegram webhook updates (`callback_query` and admin messages)
- Stores admin replies in `contact_message_replies`
- Restores the latest thread for the signed-in website user
- Exposes `GET /thread` for restoring the user's full chat history
- Exposes `GET /replies?thread_key=<uuid>` for the website chat polling

Files involved:
- Function: `supabase/functions/send-telegram-message/index.ts`
- Config: `supabase/config.toml`
- SQL: `supabase/migrations/20260424_contact_reply_flow.sql`

Required Supabase secrets:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`

Optional secret:
- `CONTACT_WEBHOOK_SECRET`
  Recommended for Database Webhooks. Send it in a custom header such as `x-webhook-secret`.

Deploy steps:
1. Run the SQL migration so `contact_messages.thread_key`, `contact_messages.user_id`, `contact_message_replies`, and `telegram_reply_sessions` exist.
2. Deploy the function:
   `supabase functions deploy send-telegram-message --project-ref mmugalgqdapidqqxekqt`
3. Set secrets:
   `supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... TELEGRAM_WEBHOOK_SECRET=... --project-ref mmugalgqdapidqqxekqt`
4. Create the database webhook:
   - Table: `contact_messages`
   - Event: `INSERT`
   - Method: `POST`
   - URL: `https://mmugalgqdapidqqxekqt.supabase.co/functions/v1/send-telegram-message`
   - Headers:
     - `Content-Type: application/json`
     - `x-webhook-secret: <CONTACT_WEBHOOK_SECRET>`
5. Set the Telegram webhook:
   `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://mmugalgqdapidqqxekqt.supabase.co/functions/v1/send-telegram-message&secret_token=<TELEGRAM_WEBHOOK_SECRET>`

Notes:
- If you type directly in Telegram without pressing `Ответить`, the bot will not forward the message to the site.
- The website contact chat polls:
  `https://mmugalgqdapidqqxekqt.supabase.co/functions/v1/send-telegram-message/thread`
- The website contact chat polls:
  `https://mmugalgqdapidqqxekqt.supabase.co/functions/v1/send-telegram-message/replies?thread_key=<uuid>`
