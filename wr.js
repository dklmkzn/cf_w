// worker.js – Cloudflare Worker для Long Polling
// Переменные окружения: BOT_TOKEN, AUTH_TOKEN

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Только POST на /poll
    if (request.method !== 'POST' || path !== '/poll') {
      return new Response('Not found', { status: 404 });
    }

    // Проверка аутентификации
    const authHeader = request.headers.get('X-Auth-Token');
    if (!authHeader || authHeader !== env.AUTH_TOKEN) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Читаем тело запроса
    let offset = 0;
    let chatId = null;
    try {
      const body = await request.json();
      offset = body.offset || 0;
      chatId = body.chat_id || null;
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    // Выполняем getUpdates
    const updates = await getUpdates(env.BOT_TOKEN, offset, 9);

    // Вычисляем новый offset (последний update_id + 1)
    let newOffset = offset;
    if (updates && updates.length > 0) {
      const lastUpdateId = updates[updates.length - 1].update_id;
      newOffset = lastUpdateId + 1;
    }

    // Возвращаем результат
    return new Response(JSON.stringify({
      ok: true,
      updates,
      new_offset: newOffset
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Вспомогательная функция для вызова getUpdates
async function getUpdates(token, offset, timeout) {
  const url = `https://api.telegram.org/bot${token}/getUpdates`;
  const params = {
    offset: offset,
    timeout: timeout,
    limit: 100
  };
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await resp.json();
    if (data.ok) {
      return data.result || [];
    } else {
      console.error('Telegram API error:', data.description);
      return [];
    }
  } catch (e) {
    console.error('getUpdates error:', e);
    return [];
  }
}
