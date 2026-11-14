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
            return { results: [...saved.values()].filter(x => x.status === 'approved' && x.commercial_use_allowed && x.image_use_allowed).map(({ id, title, author, image_url, category, price_cents, source_url, license_name }) => ({ id, title, author, image_url, category, price_cents, source_url, license_name })) };
          }
          return { results: [...saved.values()] };
        }
      };
      return stmt;
    }
  };
  return { DB: db, ADMIN_TOKEN: token, ALLOWED_ORIGIN: 'chrome-extension://extensao-expressarte' };
}
async function send(env, method, path, body, authorized = false, origin) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authorized) headers.Authorization = 'Bearer ' + token;
  if (origin) headers.Origin = origin;
  const req = new Request(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const res = await worker.fetch(req, env);
  return { status: res.status, headers: res.headers, body: res.status === 204 ? null : await res.json() };
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
  assert.equal((await send(env, 'PATCH', '/api/imports/' + added.body.id, { status: 'approved' }, true)).status, 400);
  const approved = await send(env, 'PATCH', '/api/imports/' + added.body.id, { status: 'approved', commercialUseAllowed: true, imageUseAllowed: true }, true);
  assert.equal(approved.status, 200);
  const published = await send(env, 'GET', '/api/products');
  assert.equal(published.body.products.length, 1);
  assert.equal(published.body.products[0].title, sample.title);
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
