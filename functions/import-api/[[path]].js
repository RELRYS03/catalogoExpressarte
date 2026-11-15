const worker = 'https://expressarte-import-api.relrys17.workers.dev';
const prefix = '/import-api';
const cookie = '__Host-expressarte-session';
const sessionPattern = /^session_[0-9a-f]{64}$/;
const maxRememberSeconds = 30 * 86400;
const routes = {
  GET: /^\/api\/(?:health|categories|imports|preview|admin\/(?:status|session))$/,
  POST: /^\/api\/(?:categories|imports|category-suggestion|admin\/(?:setup|login|logout|session))$/,
  PATCH: /^\/api\/(?:imports\/[0-9a-f-]{36}|admin\/(?:products\/(?:academia-001|religioso-001|[0-9a-f-]{36})|promotions\/(?:day|week)))$/,
  DELETE: /^\/api\/admin\/products\/(?:academia-001|religioso-001|[0-9a-f-]{36})$/
};
const responseHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function json(value, status = 200, headers = {}) {
  return Response.json(value, { status, headers: { ...responseHeaders, ...headers } });
}

function setSession(token, remember, seconds) {
  return { 'Set-Cookie': cookie + '=' + (remember ? '1' : '0') + '.' + token +
    '; Path=/; HttpOnly; Secure; SameSite=Strict' + (remember ? '; Max-Age=' + seconds : '') };
}

function clearSession() {
  return { 'Set-Cookie': cookie + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' };
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname.slice(prefix.length);
  const method = request.method;
  if (!routes[method]?.test(path)) return json({ error: 'Rota não encontrada.' }, 404);
  if (method !== 'GET' && request.headers.get('Origin') !== url.origin) {
    return json({ error: 'Origem não autorizada.' }, 403);
  }
  const cookieParts = request.headers.get('Cookie')?.match(/(?:^|;\s*)__Host-expressarte-session=([01])\.(session_[0-9a-f]{64})(?:;|$)/);
  const session = cookieParts?.[2];
  const suppliedAuth = request.headers.get('Authorization');
  const target = worker + path + url.search;
  const callWorker = (options) => env?.IMPORT_API
    ? env.IMPORT_API.fetch(target, options)
    : fetch(target, options);
  const headers = new Headers({ Accept: 'application/json' });
  const contentType = request.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);
  if (session) headers.set('Authorization', 'Bearer ' + session);
  try {
    if (path === '/api/admin/session') {
      const migrating = method === 'POST';
      const token = migrating ? suppliedAuth?.match(/^Bearer (session_[0-9a-f]{64})$/)?.[1] : session;
      if (!token) return json({ signedIn: false }, migrating ? 401 : 200);
      const upstream = await callWorker({ headers: { Authorization: 'Bearer ' + token }, redirect: 'error' });
      if (upstream.status === 401) return json({ signedIn: false }, migrating ? 401 : 200, migrating ? {} : clearSession());
      if (!upstream.ok) return json({ error: 'Não foi possível consultar a sessão.' }, 502);
      if (!migrating) return json({ signedIn: true, remembered: cookieParts[1] === '1' });
      const { expiresAt } = await upstream.json();
      const seconds = Math.min(maxRememberSeconds, Math.floor((expiresAt - Date.now()) / 1000));
      if (!Number.isSafeInteger(seconds) || seconds <= 0) return json({ signedIn: false }, 401);
      const remember = request.headers.get('X-Remember-Session') === 'yes';
      return json({ signedIn: true, remembered: remember }, 200, setSession(token, remember, seconds));
    }

    const login = path === '/api/admin/login' || path === '/api/admin/setup';
    if (login) {
      headers.delete('Authorization');
      if (path.endsWith('/setup') && suppliedAuth) headers.set('Authorization', suppliedAuth);
    }
    let body = request.body;
    let remember = false;
    if (login) {
      if (Number(request.headers.get('Content-Length')) > 4096) return json({ error: 'Dados inválidos.' }, 400);
      body = await request.text();
      if (body.length > 4096) return json({ error: 'Dados inválidos.' }, 400);
      try { remember = JSON.parse(body)?.remember === true; }
      catch { return json({ error: 'Dados inválidos.' }, 400); }
    }
    const upstream = await callWorker({ method, headers, body, redirect: 'error' });
    if (login && upstream.ok) {
      const { token } = await upstream.json();
      if (!sessionPattern.test(token || '')) return json({ error: 'Não foi possível iniciar a sessão.' }, 502);
      return json({ signedIn: true, remembered: remember }, 200, setSession(token, remember, maxRememberSeconds));
    }
    if (path === '/api/admin/logout' && upstream.ok) return json({ ok: true }, 200, clearSession());
    return new Response(upstream.body, { status: upstream.status, headers: { ...responseHeaders, 'Content-Type': 'application/json; charset=utf-8' } });
  } catch {
    return json({ error: 'Não foi possível conectar ao Importador.' }, 502);
  }
}
