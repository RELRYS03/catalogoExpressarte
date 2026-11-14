import test from 'node:test';
import assert from 'node:assert/strict';
import { getCompatibleProviderConfig, generateCompatibleReply } from './providers.mjs';

test('provedor online fica desativado por padrão', () => {
  assert.equal(getCompatibleProviderConfig({}), null);
});
test('provedor exige habilitação, HTTPS, chave e modelo', () => {
  assert.throws(() => getCompatibleProviderConfig({
    EXPRESSINHO_ONLINE_ENABLED: 'true',
    EXPRESSINHO_API_BASE_URL: 'http://api.example.com/v1',
    EXPRESSINHO_API_KEY: 'secret',
    EXPRESSINHO_API_MODEL: 'model'
  }), /HTTPS/);
});
test('chama endpoint compatível e extrai resposta', async () => {
  let request;
  const reply = await generateCompatibleReply({
    config: { baseUrl: 'https://api.example.com/v1', apiKey: 'secret', model: 'small' },
    messages: [{ role: 'user', content: 'Oi' }],
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Olá!' } }] }) };
    }
  });
  assert.equal(reply, 'Olá!');
  assert.equal(request.url, 'https://api.example.com/v1/chat/completions');
  assert.equal(request.options.headers.Authorization, 'Bearer secret');
});
