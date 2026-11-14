// Express'Arte Catálogo: ponte de importação. Cloudflare Worker + D1.
// TODO: Conectar extensão original após recuperar seu código; não baixar ou copiar STL.
const json = (value, status = 200, cors = {}) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors }
});
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  // Configure um domínio/ID de extensão confiável. Nunca use '*' no endpoint administrativo.
  return origin && env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN
    ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' } : {};
}
async function authorized(request, env) {
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32) return false;
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(auth.slice(7))),
    crypto.subtle.digest('SHA-256', enc.encode(env.ADMIN_TOKEN))
  ]);
  const aa = new Uint8Array(a), bb = new Uint8Array(b);
  return aa.every((v, i) => v === bb[i]);
}
function safeUrl(input) {
  if (typeof input !== 'string' || input.length > 2048) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
}
const str = (s, max) => typeof s === 'string' ? s.trim().slice(0, max) : '';
async function parseBody(request) {
  if (Number(request.headers.get('Content-Length')) > 20000) return null;
  const text = await request.text();
  if (text.length > 20000) return null;
  try { const v = JSON.parse(text); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; }
  catch { return null; }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') {
      if (request.headers.get('Origin') && !cors['Access-Control-Allow-Origin']) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors });
    }
    if (!env.DB) return json({ error: 'D1 não configurado' }, 503, cors);
    try {
      if (path === '/api/health' && request.method === 'GET') return json({ ok: true, service: 'expressarte-import' }, 200, cors);
      if (path === '/api/products' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          "SELECT id, title, author, image_url, category, price_cents, source_url, license_name FROM catalog_imports WHERE status='approved' AND image_use_allowed=1 AND commercial_use_allowed=1 ORDER BY updated_at DESC LIMIT 200"
        ).all();
        return json({ products: results }, 200, cors);
      }
      if (path === '/api/imports' && (request.method === 'POST' || request.method === 'GET')) {
        if (!await authorized(request, env)) return json({ error: 'Não autorizado' }, 401, cors);
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM catalog_imports ORDER BY created_at DESC LIMIT 200').all();
          return json({ imports: results }, 200, cors);
        }
        const body = await parseBody(request);
        if (!body) return json({ error: 'JSON inválido ou muito grande' }, 400, cors);
        const sourceUrl = safeUrl(body.sourceUrl);
        const imageUrl = body.imageUrl ? safeUrl(body.imageUrl) : '';
        const title = str(body.title, 180);
        if (!sourceUrl || !title || imageUrl === null) return json({ error: 'sourceUrl HTTPS, title e imageUrl válidos são obrigatórios' }, 400, cors);
        const price = body.priceCents == null || body.priceCents === '' ? null : Number(body.priceCents);
        if (price !== null && (!Number.isSafeInteger(price) || price < 0 || price > 100000000)) return json({ error: 'priceCents inválido' }, 400, cors);
        const id = crypto.randomUUID();
        // Inserção sempre pendente. Nem licença nem imagem ficam automaticamente aprovadas.
        await env.DB.prepare(
          "INSERT INTO catalog_imports (id,source_url,source_site,title,author,image_url,category,price_cents,license_name,status) VALUES (?,?,?,?,?,?,?,?,?,'pending')"
        ).bind(id, sourceUrl, str(body.sourceSite, 80) || 'makerworld', title, str(body.author, 120), imageUrl,
          str(body.category, 80) || 'Outros', price, str(body.licenseName, 120)).run();
        return json({ id, status: 'pending' }, 201, cors);
      }
      const match = path.match(/^\/api\/imports\/([0-9a-f-]{36})$/i);
      if (match && request.method === 'PATCH') {
        if (!await authorized(request, env)) return json({ error: 'Não autorizado' }, 401, cors);
        const body = await parseBody(request);
        if (!body || !['pending','approved','rejected'].includes(body.status)) return json({ error: 'status inválido' }, 400, cors);
        const commercial = body.commercialUseAllowed === true ? 1 : 0;
        const image = body.imageUseAllowed === true ? 1 : 0;
        if (body.status === 'approved' && (!commercial || !image)) return json({ error: 'Aprovação exige confirmação de licença comercial e uso da imagem' }, 400, cors);
        const result = await env.DB.prepare(
          'UPDATE catalog_imports SET status=?,commercial_use_allowed=?,image_use_allowed=?,updated_at=CURRENT_TIMESTAMP WHERE id=?'
        ).bind(body.status, commercial, image, match[1]).run();
        return json({ updated: result.meta.changes > 0, status: body.status }, result.meta.changes ? 200 : 404, cors);
      }
      return json({ error: 'Rota não encontrada' }, 404, cors);
    } catch (err) {
      if (/UNIQUE constraint/i.test(String(err))) return json({ error: 'Este link já foi importado' }, 409, cors);
      return json({ error: 'Falha no servidor' }, 500, cors);
    }
  }
};
