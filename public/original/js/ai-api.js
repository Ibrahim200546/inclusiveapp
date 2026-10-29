(function () {
  const routes = new Set(['/api/ai-chat', '/api/ai-evaluate', '/api/tts']);

  // Explicit wrapper: never send the session token to an arbitrary URL/provider.
  window.aiApiFetch = async function (path, options = {}) {
    if (!routes.has(path)) throw new Error('Unsupported AI route');
    const session = typeof getSupaAuth === 'function' ? getSupaAuth() : null;
    if (!session?.access_token) {
      return new Response(JSON.stringify({ error: 'Войдите в аккаунт для использования AI.' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${session.access_token}`);
    headers.set('Content-Type', 'application/json');
    let body = options.body;
    if (path === '/api/ai-chat') {
      const payload = JSON.parse(body);
      const messages = payload.messages;
      if (Array.isArray(messages) && messages.length) {
        const system = messages[0]?.role === 'system' ? messages[0] : null;
        let size = system?.content?.length || 0;
        const recent = [];
        for (const message of messages.slice(system ? 1 : 0).reverse()) {
          if (recent.length >= 23 || (recent.length && size + message.content.length > 12000)) break;
          recent.unshift(message);
          size += message.content.length;
        }
        payload.messages = system ? [system, ...recent] : recent;
        body = JSON.stringify(payload);
      }
    }
    return fetch(path, { ...options, body, headers, redirect: 'error' });
  };
})();
