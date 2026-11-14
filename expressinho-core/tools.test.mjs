import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableTools, runKnowledgeTools, formatToolEvidence } from './tools.mjs';

const knowledge = { products: [
  { name: 'Pote Anilha 28KG / 64LB', provisionalPriceBRL: 34.9, published: false },
  { name: 'Bandeja Porta Rosário', suggestedPriceBRL: 35.85, published: false, weightGrams: 83, estimatedHours: 3 }
] };

test('expõe apenas ferramentas internas de consulta', () => {
  assert.deepEqual(getAvailableTools(), ['catalog_summary', 'product_lookup', 'estimate_total']);
});

test('consulta produto e preserva estado de rascunho', () => {
  const [result] = runKnowledgeTools({ message: 'Me fale do Pote Anilha 28KG / 64LB', mode: 'loja', knowledge });
  assert.equal(result.tool, 'product_lookup');
  assert.equal(result.facts.status, 'rascunho');
  assert.equal(result.facts.provisionalPriceBRL, 34.9);
});

test('calcula total apenas quando há preço provisório e quantidade válida', () => {
  const results = runKnowledgeTools({ message: 'Quero 10 unidades do Pote Anilha 28KG / 64LB', mode: 'loja', knowledge });
  const estimate = results.find(item => item.tool === 'estimate_total');
  assert.equal(estimate.facts.estimatedTotalBRL, 349);
  assert.equal(estimate.facts.priceStatus, 'provisório; requer aprovação');
});

test('não estima produto sem preço unitário', () => {
  const results = runKnowledgeTools({ message: 'Quero 5 unidades da Bandeja Porta Rosário', mode: 'loja', knowledge });
  assert.equal(results.some(item => item.tool === 'estimate_total'), false);
});

test('não executa ferramentas comerciais fora do modo loja', () => {
  assert.deepEqual(runKnowledgeTools({ message: 'Quero 10 unidades do Pote Anilha', mode: 'studio', knowledge }), []);
});

test('evidência estruturada informa origem e limita inferências', () => {
  const results = runKnowledgeTools({ message: 'Pote Anilha 28KG / 64LB', mode: 'loja', knowledge });
  const evidence = formatToolEvidence(results);
  assert.match(evidence, /knowledge.json/);
  assert.match(evidence, /Não complete campos ausentes/);
});
