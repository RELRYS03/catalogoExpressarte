import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const token = 'teste-segredo-com-mais-de-32-caracteres-e-nao-real';
const base = 'https://api.expressarte.test';
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
  assert.deepEqual((await send(env, 'GET', productLink)).body, published.body);
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
      window: { EXPRESSARTE_CONFIG: { catalogApiEndpoint: configured } },
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
    assert.deepEqual(calls, [configured.startsWith('https') ? 'https://worker.example/api/health' : 'https://preview.example/api/health']);
  }
});
