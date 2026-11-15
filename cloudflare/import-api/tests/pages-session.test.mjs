import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../../functions/import-api/[[path]].js';

const origin = 'https://expressarte-importador-teste.pages.dev';
const session = 'session_' + 'a'.repeat(64);
const cookie = '__Host-expressarte-session=1.' + session;
const call = (path, init) => onRequest({ request: new Request(origin + '/import-api/api/' + path, init) });

test('Pages conserva a sessão em cookie, rejeita post externo e encaminha autorização só ao Worker', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(new URL(url).origin, 'https://expressarte-import-api.relrys17.workers.dev');
    const path = new URL(url).pathname;
    if (path === '/api/admin/login') {
      assert.equal(init.headers.get('Authorization'), null);
      return Response.json({ token: session });
    }
    assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer ' + session);
    assert.equal(new Headers(init.headers).get('Cookie'), null);
    return Response.json(path === '/api/admin/session' ? { expiresAt: Date.now() + 3600000 } : { ok: true });
  });
  const request = (headers = {}) => ({ method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: '{"remember":true}' });
  assert.equal((await call('admin/login', request({ Origin: 'https://outro.example' }))).status, 403);
  assert.equal(upstream.mock.callCount(), 0);
  const login = await call('admin/login', request({ Authorization: 'Bearer recuperacao' }));
  assert.deepEqual(await login.json(), { signedIn: true, remembered: true });
  assert.match(login.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Strict; Max-Age=2592000/);
  assert.equal(login.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await (await call('admin/session')).json(), { signedIn: false });
  assert.deepEqual(await (await call('admin/session', { headers: { Cookie: cookie } })).json(), { signedIn: true, remembered: true });
  const migration = await call('admin/session', request({ Authorization: 'Bearer ' + session, 'X-Remember-Session': 'yes' }));
  assert.ok(Number(migration.headers.get('Set-Cookie').match(/Max-Age=(\d+)/)[1]) <= 3600);
  assert.deepEqual(await (await call('imports', { headers: { Cookie: cookie } })).json(), { ok: true });
  const logout = await call('admin/logout', request({ Cookie: cookie }));
  assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal((await call('admin/inexistente')).status, 404);
});
