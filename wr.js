export default {
  
  async fetch(request, env) {
    console.log('UID value:(', env.UID,')');
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/poll') {
      return new Response('Forbidden', { status: 403 });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Forbidden', { status: 403 });
    }
    const { offset, info, timeout } = body;
    if (!info || info.length < 9) {
      return new Response('Forbidden', { status: 403 });
    }
    const last8 = info.slice(-8);
    const colonIndex = env.UID.indexOf(':');
    if (colonIndex === -1 || env.UID.length < colonIndex + 9) {
      return new Response('Forbidden', { status: 403 });
    }
    const first8AfterColon = env.UID.slice(colonIndex + 1, colonIndex + 9);
    if (last8 !== first8AfterColon) {
      return new Response('Forbidden', { status: 403 });
    }
    const first9 = info.slice(0, 9);
    const uid = env.UID.replace(':', first9);
    const timeoutSec = timeout || 9;
    const updates = await getUpdates(uid, offset || 0, timeoutSec, env.entity);
    let newOffset = offset || 0;
    if (updates && updates.length > 0) {
      newOffset = updates[updates.length - 1].update_id + 1;
    }
    return new Response(JSON.stringify({ updates, new_offset: newOffset }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};


async function getUpdates(uid, offset, timeout, entity) {
  const url = `${entity}/${uid}/getUpdates`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset, timeout, limit: 100 })
    });
    const data = await resp.json();
    if (data.ok) return data.result || [];
    return [];
  } catch {
    return [];
  }
}
