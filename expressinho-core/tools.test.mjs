import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableTools, runKnowledgeTools, formatToolEvidence } from './tools.mjs';

const knowledge = { products: [
  { name: 'Pote Anilha 28KG / 64LB', provisionalPriceBRL: 34.9, published: false },
  { name: 'Bandeja Porta Rosário', suggestedPriceBRL: 35.85, published: false, specifications: { material: 'PLA', weightGrams: 83, estimatedPrintHours: 3 } }
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

test('resolve pergunta de quantidade usando o produto mencionado anteriormente', () => {
  const history = [{ role: 'user', content: 'Quanto custa o Pote Anilha 28KG / 64LB?' }];
  const results = runKnowledgeTools({ message: 'E se eu quiser 10 unidades?', mode: 'loja', knowledge, history });
  const estimate = results.find(item => item.tool === 'estimate_total');
  assert.equal(estimate.facts.product, 'Pote Anilha 28KG / 64LB');
  assert.equal(estimate.facts.estimatedTotalBRL, 349);
});

test('consulta especificações aninhadas sem inventar dados', () => {
  const [result] = runKnowledgeTools({ message: 'Detalhes da Bandeja Porta Rosário', mode: 'loja', knowledge });
  assert.equal(result.facts.material, 'PLA');
  assert.equal(result.facts.weightGrams, 83);
  assert.equal(result.facts.estimatedHours, 3);
});

test('não estima produto sem preço unitário aprovado/provisório conhecido', () => {
  const results = runKnowledgeTools({ message: 'Quero 5 unidades da Bandeja Porta Rosário', mode: 'loja', knowledge });
  assert.equal(results.some(item => item.tool === 'estimate_total'), false);
});

test('não executa ferramentas comerciais fora do modo loja', () => {
  assert.deepEqual(runKnowledgeTools({ message: 'Quero 10 unidades do Pote Anilha', mode: 'studio', knowledge }), []);
});

test('resumo distingue publicados e rascunhos', () => {
  const [result] = runKnowledgeTools({ message: 'Liste os produtos do catálogo', mode: 'loja', knowledge });
  assert.equal(result.facts.totalProducts, 2);
  assert.equal(result.facts.publishedProducts, 0);
  assert.equal(result.facts.draftProducts, 2);
});

test('evidência estruturada informa origem e limita inferências', () => {
  const results = runKnowledgeTools({ message: 'Pote Anilha 28KG / 64LB', mode: 'loja', knowledge });
  const evidence = formatToolEvidence(results);
  assert.match(evidence, /knowledge.json/);
  assert.match(evidence, /Não complete campos ausentes/);
});
