import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/index.js';

const token = 'teste-segredo-com-mais-de-32-caracteres-e-nao-real';
const base = 'https://api.expressarte.test';
test('login privado cria uma conta, limita tentativas e revoga sessões', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(await readFile(new URL('../admin-auth.sql', import.meta.url), 'utf8'));
    db.exec(await readFile(new URL('../product-overrides.sql', import.meta.url), 'utf8'));
    db.exec(await readFile(new URL('../catalog-categories.sql', import.meta.url), 'utf8'));
    db.exec(await readFile(new URL('../catalog-promotions.sql', import.meta.url), 'utf8'));
    db.exec(await readFile(new URL('../catalog-product-details.sql', import.meta.url), 'utf8'));
    const env = { ADMIN_TOKEN: token, DB: {
      prepare(sql) {
        const bind = (...args) => {
          const statement = db.prepare(sql);
          return {
            async run() { return { meta: { changes: statement.run(...args).changes } }; },
            async first() { return statement.get(...args); },
            async all() { return { results: statement.all(...args) }; }
          };
        };
        return { ...bind(), bind };
      },
      batch(statements) {
        return Promise.all(statements.map(statement => statement.all()));
      }
    } };
    db.exec(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    const setupUrl = '/api/admin/setup', loginUrl = '/api/admin/login';
    const credentials = { email: 'Test@Example.com', password: 'senha-de-teste-apenas', remember: true };
    assert.deepEqual((await send(env, 'GET', '/api/admin/status')).body, { configured: false });
    assert.equal((await send(env, 'POST', setupUrl, credentials)).status, 401);
    const created = await send(env, 'POST', setupUrl, credentials, true);
    assert.equal(created.status, 200);
    assert.deepEqual((await send(env, 'GET', '/api/admin/status')).body, { configured: true });
    assert.equal((await send(env, 'POST', setupUrl, credentials, true)).status, 409);
    assert.ok(db.prepare('SELECT expires_at FROM admin_sessions').get().expires_at > Date.now() + 29 * 86400000);
    assert.equal(db.prepare('SELECT token_hash FROM admin_sessions').get().token_hash.length, 64);
    const login = await send(env, 'POST', loginUrl, credentials);
    assert.equal(login.status, 200);
    const headers = { Authorization: 'Bearer ' + login.body.token };
    const call = (path, method = 'GET') => worker.fetch(new Request(base + path, { headers, method }), env);
    assert.equal((await call('/api/imports')).status, 200);
    const product = await send(env, 'POST', '/api/imports', { title: 'Modelo teste', sourceUrl: 'https://example.com/demo', description: 'Kit para montar' }, true);
    assert.equal(product.status, 201);
    const id = product.body.id;
    const row = db.prepare('SELECT details_json FROM catalog_product_details WHERE product_id=?').get(id);
    assert.equal(JSON.parse(row.details_json).description, 'Kit para montar');
    const form = new FormData();
    form.set('priceCents', '1200');
    form.set('details', JSON.stringify({ description: 'Kit revisto', printMinutes: 90, filamentGrams: 21.5, assembly: 'Encaixe as rodas.', leadTime: 'Até três dias' }));
    const saved = await worker.fetch(new Request(base + '/api/admin/products/' + id, { method: 'PATCH', headers, body: form }), env);
    assert.equal(saved.status, 200);
    const pending = await send(env, 'GET', '/api/products?id=' + id);
    assert.deepEqual(pending.body.products, []);
    await send(env, 'PATCH', '/api/imports/' + id, { status: 'approved', commercialUseAllowed: true, imageUseAllowed: true }, true);
    const live = await send(env, 'GET', '/api/products?id=' + id);
    assert.equal(JSON.parse(live.body.products[0].details_json).filamentGrams, 21.5);
    const promotionUrl = '/api/admin/promotions/day';
    const promotion = new FormData();
    promotion.set('productId', 'academia-001');
    promotion.set('priceCents', '2000');
    const editPromotion = (body, authenticated = true) => worker.fetch(new Request(base + promotionUrl, {
      method: 'PATCH', headers: authenticated ? headers : {}, body
    }), env);
    assert.equal((await editPromotion(promotion, false)).status, 401);
    const firstOffer = await (await editPromotion(promotion)).json();
    assert.equal(firstOffer.promotion.product_id, 'academia-001');
    assert.ok(firstOffer.promotion.expires_at > Date.now() + 23 * 3600000);
    promotion.set('priceCents', '1900');
    assert.equal((await (await editPromotion(promotion)).json()).promotion.expires_at, firstOffer.promotion.expires_at);
    promotion.set('productId', '');
    assert.deepEqual(await (await editPromotion(promotion)).json(), { promotion: null });
    assert.equal((await call('/api/admin/logout', 'POST')).status, 200);
    assert.equal((await call('/api/imports')).status, 401);
    for (let i = 0; i < 8; i++) {
      assert.equal((await send(env, 'POST', loginUrl, { ...credentials, password: 'senha-incorreta' })).status, 401);
    }
    assert.equal((await send(env, 'POST', loginUrl, credentials)).status, 401);
    db.exec('UPDATE admin_account SET retry_after=0');
    assert.equal((await send(env, 'POST', loginUrl, credentials)).status, 200);
  } finally { db.close(); }
});
function setup() {
  const saved = new Map();
  const db = {
    prepare(sql) {
      let values = [];
      const stmt = {
        bind(...args) { values = args; return stmt; },
        async run() {
          if (sql.startsWith('INSERT')) {
            const [id, source_url, source_site, title, author, image_url, category, price_cents, license_name] = values;
            if ([...saved.values()].some(x => x.source_url === source_url)) throw new Error('UNIQUE constraint');
            saved.set(id, { id, source_url, source_site, title, author, image_url, category, price_cents, license_name, commercial_use_allowed: 0, image_use_allowed: 0, status: 'pending', created_at: '2026-11-13', updated_at: '2026-11-13' });
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith('UPDATE catalog_imports SET price_cents=')) {
            const [price, id] = values;
            const row = saved.get(id);
            if (!row) return { meta: { changes: 0 } };
            row.price_cents = price;
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith('UPDATE')) {
            const [status, commercial, image, id] = values;
            const row = saved.get(id);
            if (!row) return { meta: { changes: 0 } };
            Object.assign(row, { status, commercial_use_allowed: commercial, image_use_allowed: image });
            return { meta: { changes: 1 } };
          }
          throw new Error('SQL não simulado: ' + sql);
        },
        async all() {
          if (sql.includes('FROM catalog_product_overrides')) return { results: [] };
          if (sql.includes('FROM catalog_categories')) return { results: [] };
          if (sql.includes('FROM catalog_promotions')) return { results: [] };
          if (sql.includes("status='approved'")) {
            return { results: [...saved.values()].filter(x => x.status === 'approved' && x.commercial_use_allowed && x.image_use_allowed && (!values.length || x.id === values[0])).map(({ id, title, author, image_url, category, price_cents, source_url, license_name }) => ({ id, title, author, image_url, category, price_cents, source_url, license_name })) };
          }
          return { results: [...saved.values()] };
        }
      };
      return stmt;
    }
  };
  const images = new Map();
  const IMAGES = { async put(key, value, options) { images.set(key, { value, options }); }, async delete(key) { images.delete(key); } };
  return { DB: db, ADMIN_TOKEN: token, ALLOWED_ORIGIN: 'https://relrys03.github.io', IMAGES, PUBLIC_ASSETS_URL: 'https://images.example.com', _images: images };
}
async function send(env, method, path, body, authorized = false, origin) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authorized) headers.Authorization = 'Bearer ' + token;
  if (origin) headers.Origin = origin;
  const req = new Request(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const res = await worker.fetch(req, env);
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

const sample = {
  sourceUrl: 'https://makerworld.com/pt/models/3462526-nativity-scene-with-mary-joseph-sheep',
  imageUrl: 'https://cdn.example.com/capa.jpg',
  sourceSite: 'makerworld', title: 'Presépio', author: 'Criador original',
  priceCents: 4900, category: 'Religiosos'
};
test('cadastro por foto cria identificador próprio e fica pendente', async () => {
  const env = setup();
  assert.equal((await send(env, 'POST', '/api/imports', { title: 'Peça sem foto' }, true)).status, 400);
  const ids = [];
  for (let i = 0; i < 2; i++) {
    const form = new FormData();
    form.set('title', 'Produto próprio');
    form.set('image', new Blob(['foto'], { type: 'image/png' }), 'foto.png');
    const response = await worker.fetch(new Request(base + '/api/imports', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form
    }), env);
    assert.equal(response.status, 201);
    const row = await response.json();
    assert.equal(row.status, 'pending');
    assert.equal(row.imageStored, true);
    ids.push(row.id);
  }
  assert.notEqual(ids[0], ids[1]);
  const queue = (await send(env, 'GET', '/api/imports', undefined, true)).body.imports;
  assert.ok(queue.every(row => row.source_site === 'foto-propria' && row.source_url === 'urn:expressarte:product:' + row.id));
  assert.deepEqual((await send(env, 'GET', '/api/products')).body.products, []);
});

test('categorias novas exigem login e são deduplicadas e públicas', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(await readFile(new URL('../catalog-categories.sql', import.meta.url), 'utf8'));
    const env = { ADMIN_TOKEN: token, DB: { prepare(sql) {
      const statement = db.prepare(sql);
      return { async all() { return { results: statement.all() }; },
        bind(...args) { return { async first() { return statement.get(...args); } }; } };
    } } };
    const path = '/api/categories';
    assert.equal((await send(env, 'POST', path, { name: 'Papelaria' })).status, 401);
    assert.equal((await send(env, 'POST', path, { name: '<script>' }, true)).status, 400);
    assert.equal((await send(env, 'POST', path, { name: 'Organização' }, true)).body.name, 'Organização');
    assert.equal((await send(env, 'POST', path, { name: 'organizacao' }, true)).body.name, 'Organização');
    assert.deepEqual((await send(env, 'GET', path)).body.categories, ['Organização']);
  } finally { db.close(); }
});
test('editor privado salva foto e preço do produto original sem trocar seu ID', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(await readFile(new URL('../product-overrides.sql', import.meta.url), 'utf8'));
    const uploads = [];
    const env = {
      ADMIN_TOKEN: token, PUBLIC_ASSETS_URL: 'https://images.example.com',
      IMAGES: { async put(key) { uploads.push(key); } },
      DB: { prepare(sql) { return { bind(...args) { return { async first() { return db.prepare(sql).get(...args); } }; } }; } }
    };
    const edit = (price, { key = token, image = false, rights = false } = {}) => {
      const form = new FormData();
      form.set('priceCents', price);
      if (image) form.set('image', new Blob(['foto de teste'], { type: 'image/png' }), 'foto.png');
      if (rights) form.set('imageRights', 'yes');
      return worker.fetch(new Request(base + '/api/admin/products/academia-001', {
        method: 'PATCH', headers: { Authorization: 'Bearer ' + key }, body: form
      }), env);
    };
    assert.equal((await edit('3490', { key: '' })).status, 401);
    assert.equal((await edit('3490', { image: true })).status, 400);
    const photo = await (await edit('3490', { image: true, rights: true })).json();
    assert.match(photo.imageUrl, /^https:\/\/images\.example\.com\/catalog-imports\/academia-001\//);
    const price = await (await edit('3890')).json();
    assert.deepEqual(price, { priceCents: 3890, imageUrl: photo.imageUrl });
    assert.equal(uploads.length, 1);
  } finally { db.close(); }
});
test('só o administrador altera o preço e o produto conserva o link e a aprovação', async () => {
  const env = setup();
  const added = await send(env, 'POST', '/api/imports', sample, true);
  const id = added.body.id;
  const route = '/api/imports/' + id;
  const product = '/api/products?id=' + id;
  assert.equal((await send(env, 'PATCH', route, { priceCents: 600 })).status, 401);
  assert.equal((await send(env, 'PATCH', route, { priceCents: 600 }, true)).status, 200);
  assert.deepEqual((await send(env, 'GET', product)).body.products, []);
  await send(env, 'PATCH', route, { status: 'approved', commercialUseAllowed: true, imageUseAllowed: true }, true);
  assert.equal((await send(env, 'PATCH', route, { priceCents: 650 }, true)).status, 200);
  assert.equal((await send(env, 'PATCH', route, { priceCents: -1 }, true)).status, 400);
  assert.equal((await send(env, 'GET', product)).body.products[0].price_cents, 650);
  assert.equal((await send(env, 'PATCH', route, { priceCents: null }, true)).status, 200);
  assert.equal((await send(env, 'GET', product)).body.products[0].price_cents, null);
});
test('ponte: extensão simulada cadastra item pendente e público não o vê até aprovação explícita', async () => {
  const env = setup();
  assert.equal((await send(env, 'GET', '/api/health')).status, 200);
  assert.equal((await send(env, 'POST', '/api/imports', sample)).status, 401);
  const added = await send(env, 'POST', '/api/imports', sample, true);
  assert.equal(added.status, 201);
  assert.equal(added.body.status, 'pending');
  const drafts = await send(env, 'GET', '/api/imports', undefined, true);
  assert.equal(drafts.body.imports.length, 1);
  assert.equal(drafts.body.imports[0].image_url, sample.imageUrl);
  assert.equal(drafts.body.imports[0].price_cents, sample.priceCents);
  assert.equal((await send(env, 'GET', '/api/products')).body.products.length, 0);
  const productLink = '/api/products?id=' + added.body.id;
  assert.deepEqual((await send(env, 'GET', productLink)).body.products, []);
  assert.equal((await send(env, 'PATCH', '/api/imports/' + added.body.id, { status: 'approved' }, true)).status, 400);
  const approved = await send(env, 'PATCH', '/api/imports/' + added.body.id, { status: 'approved', commercialUseAllowed: true, imageUseAllowed: true }, true);
  assert.equal(approved.status, 200);
  const published = await send(env, 'GET', '/api/products');
  assert.equal(published.body.products.length, 1);
  assert.equal(published.body.products[0].title, sample.title);
  assert.deepEqual((await send(env, 'GET', productLink)).body.products, published.body.products);
  assert.deepEqual((await send(env, 'GET', '/api/products?id=00000000-0000-4000-8000-000000000000')).body.products, []);
  assert.equal((await send(env, 'GET', '/api/products?id=invalid')).status, 400);
});
test('duplicidade, valores inválidos e política CORS', async () => {
  const env = setup();
  assert.equal((await send(env, 'POST', '/api/imports', { ...sample, sourceUrl: 'http://inseguro.com' }, true)).status, 400);
  assert.equal((await send(env, 'POST', '/api/imports', { ...sample, priceCents: -2 }, true)).status, 400);
  assert.equal((await send(env, 'POST', '/api/imports', sample, true)).status, 201);
  assert.equal((await send(env, 'POST', '/api/imports', sample, true)).status, 409);
  const allowed = await send(env, 'OPTIONS', '/api/imports', undefined, false, env.ALLOWED_ORIGIN);
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), env.ALLOWED_ORIGIN);
  const denied = await send(env, 'OPTIONS', '/api/imports', undefined, false, 'https://site-nao-autorizado.com');
  assert.equal(denied.status, 403);
});

test('análise visual exige autenticação e só devolve categorias do catálogo', async () => {
  const env = setup();
  let sentImage;
  let answer = 'Chaveiros';
  env.AI = { async run(_model, input) {
    sentImage = input.messages[1].content[1].image_url.url;
    return { choices: [{ message: { content: answer } }] };
  } };
  const route = '/api/category-suggestion';
  const body = { title: 'Brinquedo', image: 'data:image/jpeg;base64,AAAA' };
  assert.equal((await send(env, 'POST', route, body)).status, 401);
  assert.equal((await send(env, 'POST', route, { ...body, image: 'https://example.com/image.jpg' }, true)).status, 400);
  assert.deepEqual((await send(env, 'POST', route, body, true)).body, { category: 'Chaveiros' });
  assert.equal(sentImage, body.image);
  answer = 'Categoria desconhecida';
  assert.deepEqual((await send(env, 'POST', route, body, true)).body, { category: null });
  answer = 'NOVA: Papelaria';
  assert.deepEqual((await send(env, 'POST', route, body, true)).body, { category: null, suggestedCategory: 'Papelaria' });
});

test('prévia MakerWorld consulta metadados por ID e usa a página como fallback', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async url => {
    if (url === 'https://api.bambulab.com/v1/design-service/design/123') {
      return Response.json({ id: 123, title: 'Modelo de teste', designCreator: { name: 'Criadora' },
        coverUrl: 'https://example.com/capa.png', license: 'Licença de teste' });
    }
    if (url === 'https://api.bambulab.com/v1/design-service/design/456') return new Response(null, { status: 404 });
    assert.equal(url, 'https://makerworld.com/models/456');
    return new Response('<meta property="og:title" content="Modelo da página">');
  });
  const env = setup();
  const preview = url => send(env, 'GET', '/api/preview?url=' + encodeURIComponent(url), undefined, true);
  assert.deepEqual((await preview('https://makerworld.com/pt-br/models/123-modelo#profileId-5')).body, {
    title: 'Modelo de teste', author: 'Criadora', imageUrl: 'https://example.com/capa.png',
    licenseName: 'Licença de teste', sourceSite: 'makerworld.com'
  });
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal((await preview('https://makerworld.com/models/456')).body.title, 'Modelo da página');
  assert.equal(fetchMock.mock.callCount(), 3);
});

test('PWA recebe link e arquivo de imagem via Web Share Target e API grava imagem em R2', async () => {
  const env = setup();
  const form = new FormData();
  form.append('sourceUrl', 'https://makerworld.com/models/1675562');
  form.append('sourceSite', 'makerworld.com');
  form.append('title', 'circle slicer_v2.1.1');
  form.append('author', 'stephen_WS');
  form.append('category', 'Suportes');
  form.append('priceCents', '2990');
  form.append('licenseName', '');
  form.append('image', new Blob(['imagem-teste'], { type: 'image/png' }), 'capa.png');
  const req = new Request(base + '/api/imports', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form });
  const res = await worker.fetch(req, env);
  const data = await res.json();
  assert.equal(res.status, 201);
  assert.equal(data.status, 'pending');
  assert.equal(data.imageStored, true);
  const rows = await env.DB.prepare('SELECT * FROM catalog_imports').all();
  assert.equal(rows.results[0].title, 'circle slicer_v2.1.1');
  assert.match(rows.results[0].image_url, /^https:\/\/images\.example\.com\/catalog-imports\//);
  assert.equal(env._images.size, 1);
});
test('manifest declara o destino de compartilhamento Android', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const manifestPath = new URL('../../../importador/manifest.webmanifest', import.meta.url);
  const manifest = JSON.parse(await readFile(fileURLToPath(manifestPath), 'utf8'));
  assert.equal(manifest.share_target.action, './compartilhar');
  assert.equal(manifest.share_target.method, 'POST');
  assert.equal(manifest.share_target.params.url, 'url');
  assert.equal(manifest.share_target.params.files[0].name, 'images');
});

test('prévia de metadados e editor de capa têm identificadores distintos', async () => {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(new URL('../../../importador/index.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(html, /<img id="coverPreview"/);
  assert.match(html, /<canvas id="coverCropPreview"/);
});

test('importador aceita origem do Worker, /api e configuração compartilhada sem duplicar rotas', async () => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  const script = await readFile(new URL('../../../importador/app.js', import.meta.url), 'utf8');
  for (const configured of ['https://worker.example', 'https://worker.example/api/', '/api']) {
    const elements = new Map();
    const calls = [];
    const storage = { getItem: () => null };
    const context = {
      URL, URLSearchParams, console,
      window: { EXPRESSARTE_CONFIG: { catalogApiEndpoint: configured }, addEventListener() {} },
      location: { origin: 'https://preview.example', search: '' },
      localStorage: storage, sessionStorage: storage, navigator: {},
      document: { getElementById(id) {
        if (!elements.has(id)) elements.set(id, { value: '', style: {}, addEventListener() {}, querySelector: () => ({ style: {} }) });
        return elements.get(id);
      } },
      fetch: async url => { calls.push(url); return { ok: true, json: async () => ({ service: 'expressarte-import', ok: true, databaseConfigured: true }) }; }
    };
    runInNewContext(script, context);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(elements.get('apiBase').value, configured);
    const origin = configured.startsWith('https') ? 'https://worker.example' : 'https://preview.example';
    assert.deepEqual(calls, [origin + '/api/health', origin + '/api/categories']);
  }
});
