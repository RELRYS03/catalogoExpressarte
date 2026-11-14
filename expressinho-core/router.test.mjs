import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuestion, canCacheQuestion, createResponseCache, getDeterministicReply } from './router.mjs';

const knowledge = { products: [{ name: 'Pote Anilha 28KG / 64LB', provisionalPriceBRL: 34.9, published: false }] };

test('normaliza acentos, caixa e espaços', () => {
  assert.equal(normalizeQuestion('  PREÇO   do Pote  '), 'preco do pote');
});
test('não armazena perguntas voláteis ou com histórico', () => {
  assert.equal(canCacheQuestion('Como funciona o Blender?'), true);
  assert.equal(canCacheQuestion('Qual é o preço do produto?'), false);
  assert.equal(canCacheQuestion('Como funciona o Blender?', [{ role: 'user', content: 'oi' }]), false);
});
test('cache respeita limite e expiração', async () => {
  const cache = createResponseCache({ ttlMs: 20, maxEntries: 2 });
  cache.set('a', 'um'); cache.set('b', 'dois'); cache.set('c', 'três');
  assert.equal(cache.size, 2);
  assert.equal(cache.get('a'), null);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(cache.get('c'), null);
});
test('produto em rascunho nunca aparece como publicado', () => {
  const reply = getDeterministicReply('Me fale do Pote Anilha 28KG / 64LB', 'loja', knowledge);
  assert.match(reply, /rascunho/); assert.match(reply, /34,90/);
});
test('lista diferencia sugestão pendente de aprovação', () => {
  const data = { products: [{ name: 'Bandeja Porta Rosário', suggestedPriceBRL: 35.85, published: false }] };
  const reply = getDeterministicReply('Quais produtos existem no catálogo?', 'loja', data);
  assert.match(reply, /35,85/); assert.match(reply, /pendente/);
});
test('responde a várias perguntas comerciais na mesma mensagem', () => {
  const question = 'Quero comprar 10 unidades. Tem desconto? Está disponível para pronta entrega? Posso personalizar com meu nome? Quando recebo?';
  const reply = getDeterministicReply(question + ' Pote Anilha 28KG / 64LB', 'loja', knowledge);
  assert.match(reply, /R\\$\\s?349,00/);
  assert.match(reply, /preço provisório/i);
  assert.match(reply, /desconto.*não há política/i);
  assert.match(reply, /disponibilidade não está informada/i);
  assert.match(reply, /personalização.*não estão cadastradas/i);
  assert.match(reply, /prazo e frete.*não estão cadastrados/i);
  assert.match(reply, /rascunho/i);
});
test('não calcula total se o produto não tem preço unitário', () => {
  const data = { products: [{ name: 'Peça Teste', published: false }] };
  const reply = getDeterministicReply('Quero 5 unidades da Peça Teste', 'loja', data);
  assert.match(reply, /não há preço unitário aprovado/i);
});
