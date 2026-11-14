const VOLATILE_TERMS = /\b(pre[cç]o|valor|custa|quanto|estoque|dispon[ií]vel|prazo|promo[cç][aã]o|pedido|orçamento|custo|lucro|gramas|filamento|tempo|hoje|amanhã|frete)\b/i;

export function normalizeQuestion(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canCacheQuestion(message, history = []) {
  return history.length === 0 &&
    typeof message === 'string' &&
    message.trim().length >= 8 &&
    !VOLATILE_TERMS.test(message);
}

export function createResponseCache({ ttlMs = 10 * 60 * 1000, maxEntries = 100 } = {}) {
  const entries = new Map();
  function prune(now = Date.now()) {
    for (const [key, entry] of entries) if (entry.expiresAt <= now) entries.delete(key);
    while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
  }
  return {
    get(key) {
      prune();
      const entry = entries.get(key);
      if (!entry) return null;
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      prune();
      entries.delete(key);
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      prune();
    },
    clear() { entries.clear(); },
    get size() { prune(); return entries.size; }
  };
}

export function getDeterministicReply(message, mode, knowledge) {
  const text = normalizeQuestion(message);
  const products = Array.isArray(knowledge?.products) ? knowledge.products : [];

  if (mode === 'loja' && /\b(lista|listar|quais|catalogo|produtos)\b/.test(text)) {
    if (!products.length) return 'Ainda não há produtos cadastrados na base da Express’Arte.';
    const lines = products.map(product => {
      const status = product.published === true ? 'publicado' : 'rascunho — não anunciado';
      const price = Number.isFinite(product.provisionalPriceBRL)
        ? 'Preço provisório: R$ ' + product.provisionalPriceBRL.toFixed(2).replace('.', ',') + '. '
        : Number.isFinite(product.suggestedPriceBRL)
          ? 'Sugestão pendente: R$ ' + product.suggestedPriceBRL.toFixed(2).replace('.', ',') + '. '
          : '';
      return '• ' + product.name + ' — ' + status + '. ' + price;
    });
    return 'Produtos cadastrados na base (ainda sujeitos à aprovação):\n' + lines.join('\n');
  }

  if (mode === 'loja' && /\b(whatsapp|instagram|contato|telefone)\b/.test(text)) {
    const store = knowledge?.store || {};
    const parts = [];
    if (store.whatsappNumber) parts.push('WhatsApp: https://wa.me/' + String(store.whatsappNumber).replace(/\D/g, ''));
    if (store.instagramUrl) parts.push('Instagram: ' + store.instagramUrl);
    return parts.length ? 'Canais cadastrados da Express’Arte:\n' + parts.join('\n') : 'Os canais de contato ainda não estão cadastrados na base.';
  }

  if (mode === 'loja') {
    const product = products.find(item => {
      const name = normalizeQuestion(item.name);
      return name && (text.includes(name) || name.split(' ').filter(word => word.length > 3).every(word => text.includes(word)));
    });
    if (product) {
      const status = product.published === true ? 'O produto está marcado como publicado.' : 'Atenção: o produto está em rascunho e não deve ser anunciado como disponível.';
      const price = Number.isFinite(product.provisionalPriceBRL)
        ? 'Preço provisório cadastrado: R$ ' + product.provisionalPriceBRL.toFixed(2).replace('.', ',') + '.'
        : Number.isFinite(product.suggestedPriceBRL)
          ? 'Há uma sugestão de R$ ' + product.suggestedPriceBRL.toFixed(2).replace('.', ',') + ', ainda pendente de aprovação.'
          : 'Não há preço cadastrado.';
      return product.name + '. ' + status + ' ' + price;
    }
  }
  return null;
}
