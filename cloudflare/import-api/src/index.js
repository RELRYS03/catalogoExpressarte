// Express'Arte Catálogo: API de importação Cloudflare Workers + D1 + R2 opcional.
const json = (value, status = 200, cors = {}) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors }
});
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
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
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) diff |= (aa[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
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
async function parseJson(request) {
  if (Number(request.headers.get('Content-Length')) > 20000) return null;
  const text = await request.text();
  if (text.length > 20000) return null;
  try { const value = JSON.parse(text); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; }
  catch { return null; }
}
const allowedPageHosts = new Set(['makerworld.com','www.makerworld.com','printables.com','www.printables.com','thingiverse.com','www.thingiverse.com','cults3d.com','www.cults3d.com','thangs.com','www.thangs.com']);
function decodeEntities(value) {
  return String(value || '').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function metaValue(html, wanted) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
    if ([attrs.property, attrs.name, attrs.itemprop].some(value => String(value || '').toLowerCase() === wanted.toLowerCase())) return decodeEntities(attrs.content || '');
  }
  return '';
}
async function limitedText(response, maxBytes = 2_000_000) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new Error('Página muito grande para pré-visualização'); }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
function imageExtension(type) {
  return ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'})[type] || null;
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
    if (path === '/api/health' && request.method === 'GET') {
      return json({ ok: Boolean(env.DB), service: 'expressarte-import', databaseConfigured: Boolean(env.DB), imageStorageConfigured: Boolean(env.IMAGES && env.PUBLIC_ASSETS_URL) }, env.DB ? 200 : 503, cors);
    }
    if (!env.DB) return json({ error: 'D1 não configurado' }, 503, cors);
    let uploadedKey = null;
    try {
      if (path === '/api/products' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          "SELECT id, title, author, image_url, category, price_cents, source_url, license_name FROM catalog_imports WHERE status='approved' AND image_use_allowed=1 AND commercial_use_allowed=1 ORDER BY updated_at DESC LIMIT 200"
        ).all();
        return json({ products: results }, 200, cors);
      }
      if (path === '/api/preview' && request.method === 'GET') {
        if (!await authorized(request, env)) return json({ error: 'Não autorizado' }, 401, cors);
        const sourceUrl = safeUrl(url.searchParams.get('url'));
        if (!sourceUrl) return json({ error: 'Link HTTPS inválido' }, 400, cors);
        const host = new URL(sourceUrl).hostname.toLowerCase();
        if (!allowedPageHosts.has(host)) return json({ error: 'Este site ainda não está na lista de fontes suportadas' }, 422, cors);
        const upstream = await fetch(sourceUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ExpressArteCatalog/1.0)', 'Accept': 'text/html,application/xhtml+xml' },
          redirect: 'follow'
        });
        if (!upstream.ok) return json({ error: 'O site de origem não permitiu consultar esta página (HTTP ' + upstream.status + ')' }, 502, cors);
        const finalUrl = new URL(upstream.url);
        if (!allowedPageHosts.has(finalUrl.hostname.toLowerCase())) return json({ error: 'Redirecionamento para domínio não permitido' }, 422, cors);
        const html = await limitedText(upstream);
        const title = metaValue(html, 'og:title') || metaValue(html, 'twitter:title');
        const rawImage = metaValue(html, 'og:image') || metaValue(html, 'twitter:image');
        const imageUrl = rawImage ? safeUrl(new URL(rawImage, finalUrl).toString()) : '';
        const author = metaValue(html, 'author') || metaValue(html, 'article:author');
        const licenseName = metaValue(html, 'license');
        return json({ title: title.slice(0,180), imageUrl: imageUrl || '', author: author.slice(0,120), licenseName: licenseName.slice(0,120), sourceSite: host }, 200, cors);
      }
      if (path === '/api/imports' && (request.method === 'POST' || request.method === 'GET')) {
        if (!await authorized(request, env)) return json({ error: 'Não autorizado' }, 401, cors);
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM catalog_imports ORDER BY created_at DESC LIMIT 200').all();
          return json({ imports: results }, 200, cors);
        }
        const contentType = request.headers.get('Content-Type') || '';
        let body, imageFile = null;
        if (contentType.includes('multipart/form-data')) {
          const form = await request.formData();
          imageFile = form.get('image');
          body = Object.fromEntries(['sourceUrl','sourceSite','title','author','category','priceCents','imageUrl','licenseName'].map(key => [key, form.get(key)]));
        } else body = await parseJson(request);
        if (!body) return json({ error: 'Dados inválidos ou muito grandes' }, 400, cors);
        const sourceUrl = safeUrl(body.sourceUrl);
        let imageUrl = body.imageUrl ? safeUrl(body.imageUrl) : '';
        const title = str(body.title, 180);
        if (!sourceUrl || !title || imageUrl === null) return json({ error: 'sourceUrl HTTPS, title e imageUrl válidos são obrigatórios' }, 400, cors);
        const price = body.priceCents == null || body.priceCents === '' ? null : Number(body.priceCents);
        if (price !== null && (!Number.isSafeInteger(price) || price < 0 || price > 100000000)) return json({ error: 'priceCents inválido' }, 400, cors);
        const id = crypto.randomUUID();
        if (imageFile && imageFile.size > 0) {
          if (!(imageFile instanceof File) || imageFile.size > 5 * 1024 * 1024) return json({ error: 'A imagem deve ter até 5 MB' }, 413, cors);
          const ext = imageExtension(imageFile.type);
          if (!ext) return json({ error: 'Formato de imagem não permitido. Use JPG, PNG, WEBP ou AVIF.' }, 415, cors);
          if (!env.IMAGES || !env.PUBLIC_ASSETS_URL) return json({ error: 'Armazenamento de imagens ainda não foi configurado no Cloudflare R2' }, 503, cors);
          uploadedKey = 'catalog-imports/' + id + '.' + ext;
          await env.IMAGES.put(uploadedKey, imageFile.stream(), { httpMetadata: { contentType: imageFile.type, cacheControl: 'public, max-age=31536000, immutable' } });
          imageUrl = env.PUBLIC_ASSETS_URL.replace(/\/$/, '') + '/' + uploadedKey;
        }
        try {
          await env.DB.prepare(
            "INSERT INTO catalog_imports (id,source_url,source_site,title,author,image_url,category,price_cents,license_name,status) VALUES (?,?,?,?,?,?,?,?,?,'pending')"
          ).bind(id, sourceUrl, str(body.sourceSite, 80) || new URL(sourceUrl).hostname, title, str(body.author, 120), imageUrl,
            str(body.category, 80) || 'Outros', price, str(body.licenseName, 120)).run();
        } catch (error) {
          if (uploadedKey && env.IMAGES) await env.IMAGES.delete(uploadedKey);
          uploadedKey = null;
          throw error;
        }
        return json({ id, status: 'pending', imageStored: Boolean(uploadedKey) }, 201, cors);
      }
      const match = path.match(/^\/api\/imports\/([0-9a-f-]{36})$/i);
      if (match && request.method === 'PATCH') {
        if (!await authorized(request, env)) return json({ error: 'Não autorizado' }, 401, cors);
        const body = await parseJson(request);
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
      if (/Página muito grande/.test(String(err))) return json({ error: 'Página de origem muito grande para pré-visualização' }, 413, cors);
      return json({ error: 'Falha no servidor' }, 500, cors);
    }
  }
};
