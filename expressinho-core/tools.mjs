import { normalizeQuestion } from './router.mjs';

function matchProduct(text, products) {
  const normalized = normalizeQuestion(text);
  return products.find(product => {
    const name = normalizeQuestion(product.name);
    if (!name) return false;
    if (normalized.includes(name)) return true;
    const words = name.split(' ').filter(word => word.length > 3);
    return words.length > 0 && words.every(word => normalized.includes(word));
  }) || null;
}

function findProduct(message, products, history = []) {
  const direct = matchProduct(message, products);
  if (direct) return direct;
  // Resolve follow-ups such as "e 10 unidades?" using the most recent conversation context.
  for (const item of [...history].reverse()) {
    if (!item || item.role !== 'user' || typeof item.content !== 'string') continue;
    const contextual = matchProduct(item.content, products);
    if (contextual) return contextual;
  }
  return null;
}

function parseQuantity(message) {
  const text = normalizeQuestion(message);
  const match = text.match(/\b(\d{1,4})\s*(?:unidades?|pecas?|itens?)\b/) ||
    text.match(/\b(?:quero|preciso|comprar|pedido de)\s+(\d{1,4})\b/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 && value <= 1000 ? value : null;
}

const tools = {
  catalog_summary({ knowledge }) {
    const products = Array.isArray(knowledge?.products) ? knowledge.products : [];
    return {
      tool: 'catalog_summary',
      source: 'knowledge.json',
      facts: {
        totalProducts: products.length,
        publishedProducts: products.filter(p => p.published === true).length,
        draftProducts: products.filter(p => p.published !== true).length
      },
      products: products.map(p => ({
        name: p.name,
        published: p.published === true,
        status: p.published === true ? 'publicado' : 'rascunho',
        provisionalPriceBRL: Number.isFinite(p.provisionalPriceBRL) ? p.provisionalPriceBRL : null,
        suggestedPriceBRL: Number.isFinite(p.suggestedPriceBRL) ? p.suggestedPriceBRL : null
      }))
    };
  },
  product_lookup({ knowledge, message, history }) {
    const product = findProduct(message, Array.isArray(knowledge?.products) ? knowledge.products : [], history);
    if (!product) return null;
    const specs = product.specifications || {};
    return {
      tool: 'product_lookup',
      source: 'knowledge.json',
      facts: {
        name: product.name,
        category: product.category || null,
        published: product.published === true,
        status: product.published === true ? 'publicado' : 'rascunho',
        provisionalPriceBRL: Number.isFinite(product.provisionalPriceBRL) ? product.provisionalPriceBRL : null,
        suggestedPriceBRL: Number.isFinite(product.suggestedPriceBRL) ? product.suggestedPriceBRL : null,
        material: product.material || specs.material || null,
        weightGrams: Number.isFinite(product.weightGrams) ? product.weightGrams : Number.isFinite(specs.weightGrams) ? specs.weightGrams : null,
        estimatedHours: Number.isFinite(product.estimatedHours) ? product.estimatedHours : Number.isFinite(product.estimatedPrintHours) ? product.estimatedPrintHours : Number.isFinite(specs.estimatedPrintHours) ? specs.estimatedPrintHours : null
      }
    };
  },
  estimate_total({ knowledge, message, history }) {
    const products = Array.isArray(knowledge?.products) ? knowledge.products : [];
    const product = findProduct(message, products, history);
    const quantity = parseQuantity(message);
    if (!product || !quantity || !Number.isFinite(product.provisionalPriceBRL)) return null;
    return {
      tool: 'estimate_total',
      source: 'knowledge.json',
      facts: {
        product: product.name,
        quantity,
        unitPriceBRL: product.provisionalPriceBRL,
        estimatedTotalBRL: Math.round(product.provisionalPriceBRL * quantity * 100) / 100,
        priceStatus: 'provisório; requer aprovação',
        saleStatus: product.published === true ? 'marcado como publicado' : 'rascunho; não liberado para venda'
      }
    };
  }
};

export function getAvailableTools() {
  return Object.keys(tools);
}

export function runKnowledgeTools({ message, mode, knowledge, history = [] }) {
  if (mode !== 'loja' || typeof message !== 'string' || !message.trim()) return [];
  const text = normalizeQuestion(message);
  const results = [];
  if (/\b(lista|listar|quais produtos|catalogo|catalogo completo)\b/.test(text)) {
    results.push(tools.catalog_summary({ knowledge }));
  }
  const context = { knowledge, message, history };
  const product = tools.product_lookup(context);
  if (product) results.push(product);
  const estimate = tools.estimate_total(context);
  if (estimate) results.push(estimate);
  return results;
}

export function formatToolEvidence(results) {
  if (!Array.isArray(results) || !results.length) return '';
  return [
    'RESULTADOS DE FERRAMENTAS INTERNAS (fonte: knowledge.json; trate como fatos limitados aos campos presentes):',
    JSON.stringify(results),
    'Não complete campos ausentes por suposição. Preços provisórios e estimativas não são ofertas nem confirmação de venda.'
  ].join('\n');
}
