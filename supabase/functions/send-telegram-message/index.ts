import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type ContactMessageRecord = {
  id?: string | number | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  message?: string | null;
  created_at?: string | null;
  thread_key?: string | null;
  user_id?: string | null;
};

type DatabaseWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: ContactMessageRecord | null;
  old_record?: ContactMessageRecord | null;
};

type TelegramReplyRow = {
  id: string;
  reply_text: string;
  reply_channel: string;
  created_at: string;
};

type ContactThreadResponse = {
  thread_key: string;
  message: string;
  created_at: string;
  replies: TelegramReplyRow[];
};

type ContactConversationMessage = {
  id: string;
  sender: "user" | "admin";
  text: string;
  created_at: string;
  thread_key: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getTelegramBotToken() {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  return token;
}

function getTelegramAdminChatId() {
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID is not set");
  }
  return chatId;
}

async function telegramApi(method: string, payload: Record<string, unknown>) {
  const response = await fetch(
    `https://api.telegram.org/bot${getTelegramBotToken()}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Telegram API error ${response.status}: ${details}`);
  }

  return await response.json();
}

function buildGmailUrl(record: ContactMessageRecord) {
  const email = (record.email ?? "").trim();
  const safeEmail = email || "example@gmail.com";
  const subjectSuffix = record.name ? ` - ${record.name}` : "";
  const subject = encodeURIComponent("Re: contact message" + subjectSuffix);
  return `mailto:${safeEmail}?subject=${subject}`;
}

function formatNotification(record: ContactMessageRecord) {
  const name = record.name?.trim() || "Not provided";
  const email = record.email?.trim() || "No email";
  const role = record.role?.trim() || "No role";
  const message = record.message?.trim() || "No message";
  const createdAt = record.created_at?.trim() || "";
  const threadKey = record.thread_key?.trim() || "No thread key";

  const lines = [
    "New contact message",
    "",
    `Thread: ${threadKey}`,
    `Name: ${name}`,
    `Email: ${email}`,
    `Role: ${role}`,
    "",
    "Message:",
    message,
  ];

  if (createdAt) {
    lines.push("", `Time: ${createdAt}`);
  }

  return lines.join("\n");
}

function getRecord(payload: DatabaseWebhookPayload): ContactMessageRecord {
  return payload.record ?? {};
}

function isTelegramUpdate(payload: unknown): payload is Record<string, unknown> {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return "update_id" in payload || "callback_query" in payload || "message" in payload;
}

function isDatabaseWebhook(payload: unknown): payload is DatabaseWebhookPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return "record" in payload && "table" in payload;
}

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return header.slice(7).trim();
}

async function getAuthenticatedUser(req: Request) {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    throw new Error("Missing bearer token");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error("Unauthorized");
  }

  return data.user;
}

async function handleRepliesRequest(req: Request) {
  const url = new URL(req.url);
  const threadKey = url.searchParams.get("thread_key");

  if (!threadKey) {
    return jsonResponse({ ok: false, error: "thread_key is required" }, 400);
  }

  const user = await getAuthenticatedUser(req);
  const { data: threadRow, error: threadError } = await supabaseAdmin
    .from("contact_messages")
    .select("thread_key")
    .eq("thread_key", threadKey)
    .eq("user_id", user.id)
    .maybeSingle();

  if (threadError) {
    throw threadError;
  }

  if (!threadRow) {
    return jsonResponse({ ok: false, error: "Thread not found" }, 404);
  }

  const { data, error } = await supabaseAdmin
    .from("contact_message_replies")
    .select("id, reply_text, reply_channel, created_at")
    .eq("thread_key", threadKey)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return jsonResponse({
    ok: true,
    replies: (data ?? []) as TelegramReplyRow[],
  });
}

async function handleThreadRequest(req: Request) {
  const user = await getAuthenticatedUser(req);
  const { data, error } = await supabaseAdmin
    .from("contact_messages")
    .select("thread_key, message, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    throw error;
  }

  const threads = Array.isArray(data)
    ? data.filter((entry) => entry?.thread_key && entry?.message)
    : [];

  if (!threads.length) {
    return jsonResponse({ ok: false, error: "Thread not found" }, 404);
  }

  const threadKeys = threads
    .map((entry) => entry.thread_key)
    .filter((value): value is string => Boolean(value));

  const { data: replies, error: repliesError } = await supabaseAdmin
    .from("contact_message_replies")
    .select("id, thread_key, reply_text, reply_channel, created_at")
    .in("thread_key", threadKeys)
    .order("created_at", { ascending: true });

  if (repliesError) {
    throw repliesError;
  }

  const repliesByThread = new Map<string, TelegramReplyRow[]>();
  (replies ?? []).forEach((reply) => {
    const key = String(reply.thread_key ?? "");
    if (!key) {
      return;
    }

    const items = repliesByThread.get(key) ?? [];
    items.push({
      id: String(reply.id),
      reply_text: String(reply.reply_text ?? ""),
      reply_channel: String(reply.reply_channel ?? "telegram"),
      created_at: String(reply.created_at ?? ""),
    });
    repliesByThread.set(key, items);
  });

  const messages: ContactConversationMessage[] = [];
  threads.forEach((thread) => {
    const threadKey = String(thread.thread_key ?? "");
    if (!threadKey) {
      return;
    }

    messages.push({
      id: `user-${threadKey}`,
      sender: "user",
      text: String(thread.message ?? ""),
      created_at: String(thread.created_at ?? ""),
      thread_key: threadKey,
    });

    (repliesByThread.get(threadKey) ?? []).forEach((reply) => {
      messages.push({
        id: reply.id,
        sender: "admin",
        text: reply.reply_text,
        created_at: reply.created_at,
        thread_key: threadKey,
      });
    });
  });

  messages.sort((left, right) => {
    const leftTime = Date.parse(left.created_at || "");
    const rightTime = Date.parse(right.created_at || "");
    const leftValid = Number.isFinite(leftTime);
    const rightValid = Number.isFinite(rightTime);

    if (leftValid && rightValid && leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    if (leftValid && !rightValid) {
      return -1;
    }

    if (!leftValid && rightValid) {
      return 1;
    }

    if (left.sender !== right.sender) {
      return left.sender === "user" ? -1 : 1;
    }

    return left.id.localeCompare(right.id);
  });

  const latestThread = threads[threads.length - 1];
  const response: ContactThreadResponse = {
    thread_key: String(latestThread.thread_key ?? ""),
    message: String(latestThread.message ?? ""),
    created_at: String(latestThread.created_at ?? ""),
    replies: repliesByThread.get(String(latestThread.thread_key ?? "")) ?? [],
  };

  return jsonResponse({
    ok: true,
    latest_thread_key: String(latestThread.thread_key ?? ""),
    messages,
    thread: response,
  });
}

async function handleContactInsert(payload: DatabaseWebhookPayload, req: Request) {
  const providedToken = getBearerToken(req);
  const allowedTokens = [
    Deno.env.get("CONTACT_WEBHOOK_SECRET") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  ].filter(Boolean);

  if (!providedToken || !allowedTokens.includes(providedToken)) {
    return jsonResponse({ ok: false, error: "Unauthorized webhook request" }, 401);
  }

  const record = getRecord(payload);
  const threadKey = record.thread_key?.trim() || "";

  if (!threadKey) {
    return jsonResponse({ ok: false, error: "thread_key is required" }, 400);
  }

  const telegramResponse = await telegramApi("sendMessage", {
    chat_id: getTelegramAdminChatId(),
    text: formatNotification(record),
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Ответить",
            callback_data: `reply_site:${threadKey}`,
          },
          {
            text: "Ответить Gmail",
            url: buildGmailUrl(record),
          },
        ],
      ],
    },
  });

  return jsonResponse({
    ok: true,
    telegram_message_id: telegramResponse?.result?.message_id ?? null,
  });
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  await telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

async function handleReplyButton(
  callbackQuery: Record<string, unknown>,
) {
  const callbackData = String(callbackQuery.data ?? "");
  const callbackId = String(callbackQuery.id ?? "");
  const from = (callbackQuery.from ?? {}) as Record<string, unknown>;
  const adminChatId = String(from.id ?? "");
  const allowedAdminChatId = getTelegramAdminChatId();

  if (!callbackData.startsWith("reply_site:")) {
    if (callbackId) {
      await answerCallbackQuery(callbackId, "Unknown action");
    }
    return jsonResponse({ ok: true, ignored: true });
  }

  if (adminChatId !== allowedAdminChatId) {
    if (callbackId) {
      await answerCallbackQuery(callbackId, "This action is not allowed");
    }
    return jsonResponse({ ok: true, ignored: true });
  }

  const threadKey = callbackData.replace("reply_site:", "").trim();
  if (!threadKey) {
    if (callbackId) {
      await answerCallbackQuery(callbackId, "Thread key is missing");
    }
    return jsonResponse({ ok: false, error: "Missing thread key" }, 400);
  }

  const { data: existingMessage, error: existingMessageError } = await supabaseAdmin
    .from("contact_messages")
    .select("thread_key, email, name")
    .eq("thread_key", threadKey)
    .maybeSingle();

  if (existingMessageError) {
    throw existingMessageError;
  }

  if (!existingMessage) {
    if (callbackId) {
      await answerCallbackQuery(callbackId, "Message not found");
    }
    return jsonResponse({ ok: false, error: "Message not found" }, 404);
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { error: upsertError } = await supabaseAdmin
    .from("telegram_reply_sessions")
    .upsert(
      {
        admin_chat_id: adminChatId,
        thread_key: threadKey,
        reply_mode: "site",
        expires_at: expiresAt,
      },
      {
        onConflict: "admin_chat_id",
      },
    );

  if (upsertError) {
    throw upsertError;
  }

  if (callbackId) {
    await answerCallbackQuery(callbackId, "Напишите следующее сообщение - я отправлю его на сайт");
  }

  await telegramApi("sendMessage", {
    chat_id: adminChatId,
    text:
      `Режим ответа активирован.\n` +
      `Следующее сообщение уйдет в чат сайта.\n` +
      `Email: ${existingMessage.email ?? "No email"}`,
  });

  return jsonResponse({ ok: true });
}

async function handleTelegramAdminMessage(message: Record<string, unknown>) {
  const chat = (message.chat ?? {}) as Record<string, unknown>;
  const adminChatId = String(chat.id ?? "");
  const allowedAdminChatId = getTelegramAdminChatId();
  const text = String(message.text ?? "").trim();

  if (!text) {
    return jsonResponse({ ok: true, ignored: true });
  }

  if (adminChatId !== allowedAdminChatId) {
    return jsonResponse({ ok: true, ignored: true });
  }

  if (text === "/start") {
    await telegramApi("sendMessage", {
      chat_id: adminChatId,
      text:
        "Бот готов.\n" +
        "Чтобы отправить ответ на сайт, нажмите кнопку «Ответить» под нужным сообщением.\n" +
        "Если просто написать сообщение без кнопки, оно никуда не отправится.",
    });
    return jsonResponse({ ok: true });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("telegram_reply_sessions")
    .select("admin_chat_id, thread_key, expires_at")
    .eq("admin_chat_id", adminChatId)
    .maybeSingle();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    await telegramApi("sendMessage", {
      chat_id: adminChatId,
      text:
        "Сообщение не отправлено.\n" +
        "Сначала нажмите «Ответить» под нужным сообщением.",
    });
    return jsonResponse({ ok: true, ignored: true });
  }

  const expiresAt = new Date(session.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    await supabaseAdmin
      .from("telegram_reply_sessions")
      .delete()
      .eq("admin_chat_id", adminChatId);

    await telegramApi("sendMessage", {
      chat_id: adminChatId,
      text:
        "Время ответа истекло.\n" +
        "Нажмите «Ответить» под сообщением еще раз.",
    });
    return jsonResponse({ ok: true, ignored: true });
  }

  const { error: insertReplyError } = await supabaseAdmin
    .from("contact_message_replies")
    .insert({
      thread_key: session.thread_key,
      reply_text: text,
      reply_channel: "telegram",
      admin_chat_id: adminChatId,
    });

  if (insertReplyError) {
    throw insertReplyError;
  }

  await supabaseAdmin
    .from("telegram_reply_sessions")
    .delete()
    .eq("admin_chat_id", adminChatId);

  await telegramApi("sendMessage", {
    chat_id: adminChatId,
    text: "Ответ отправлен на сайт.",
  });

  return jsonResponse({ ok: true });
}

async function handleTelegramUpdate(req: Request, payload: Record<string, unknown>) {
  const expectedSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
  const providedSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";

  if (expectedSecret && providedSecret !== expectedSecret) {
    return jsonResponse({ ok: false, error: "Unauthorized Telegram webhook" }, 401);
  }

  if (payload.callback_query && typeof payload.callback_query === "object") {
    return await handleReplyButton(payload.callback_query as Record<string, unknown>);
  }

  if (payload.message && typeof payload.message === "object") {
    return await handleTelegramAdminMessage(payload.message as Record<string, unknown>);
  }

  return jsonResponse({ ok: true, ignored: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname.endsWith("/thread")) {
      return await handleThreadRequest(req);
    }

    if (req.method === "GET" && url.pathname.endsWith("/replies")) {
      return await handleRepliesRequest(req);
    }

    if (req.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
    }

    const payload = await req.json();

    if (isTelegramUpdate(payload)) {
      return await handleTelegramUpdate(req, payload);
    }

    if (isDatabaseWebhook(payload)) {
      return await handleContactInsert(payload, req);
    }

    return jsonResponse({ ok: false, error: "Unsupported payload" }, 400);
  } catch (error) {
    console.error("send-telegram-message failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message === "Unauthorized" || message === "Missing bearer token") {
      return jsonResponse({ ok: false, error: message }, 401);
    }
    return jsonResponse(
      {
        ok: false,
        error: message,
      },
      500,
    );
  }
});
