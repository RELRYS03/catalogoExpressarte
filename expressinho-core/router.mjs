const VOLATILE_TERMS = /\\b(pre[cç]o|valor|custa|quanto|estoque|dispon[ií]vel|prazo|promo[cç][aã]o|pedido|orçamento|custo|lucro|gramas|filamento|tempo|hoje|amanhã|frete)\\b/i;

export function normalizeQuestion(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9\\s]/g, ' ')
    .replace(/\\s+/g, ' ')
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

function formatBRL(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function findMentionedProduct(text, products) {
  return products.find(product => {
    const name = normalizeQuestion(product.name);
    if (!name) return false;
    if (text.includes(name)) return true;
    const significantWords = name.split(' ').filter(word => word.length > 3);
    return significantWords.length > 0 && significantWords.every(word => text.includes(word));
  });
}

function getQuantity(text) {
  const match = text.match(/\\b(\\d{1,4})\\s*(?:unidades?|pecas?|pçs?|itens?)\\b/i) ||
    text.match(/\\b(?:quero|preciso|comprar|pedido de)\\s+(\\d{1,4})\\b/i);
  if (!match) return null;
  const quantity = Number(match[1]);
  return Number.isInteger(quantity) && quantity > 0 && quantity <= 1000 ? quantity : null;
}

function getProductCommercialReply(message, product) {
  const text = normalizeQuestion(message);
  const quantity = getQuantity(text);
  const asksDiscount = /\\b(desconto|descontos|negociar|negociacao|abatimento|promocao)\\b/.test(text);
  const asksStock = /\\b(estoque|pronta entrega|disponivel|disponibilidade|tem para hoje)\\b/.test(text);
  const asksCustomization = /\\b(personaliz|personalizar|nome|logo|cor|customiz)\\b/.test(text);
  const asksDelivery = /\\b(prazo|quando recebo|entrega|frete|chega|receber)\\b/.test(text);
  const asksPurchase = /\\b(comprar|compra|pedido|encomendar|quero)\\b/.test(text);
  const hasMultipleIntents = [asksDiscount, asksStock, asksCustomization, asksDelivery].filter(Boolean).length >= 2;

  if (!quantity && !hasMultipleIntents && !asksPurchase) return null;

  const lines = [];
  lines.push('Sobre **' + product.name + '**:');
  if (quantity) {
    if (Number.isFinite(product.provisionalPriceBRL)) {
      lines.push('• Quantidade: ' + quantity + ' unidades.');
      lines.push('• Total apenas para referência: ' + formatBRL(quantity * product.provisionalPriceBRL) + ' (' + formatBRL(product.provisionalPriceBRL) + ' por unidade, preço provisório).');
      lines.push('• Esse cálculo não é um orçamento nem confirma a venda; o preço final precisa ser aprovado pela equipe.');
    } else {
      lines.push('• Ainda não há preço unitário aprovado para calcular o total.');
    }
  }
  if (asksDiscount) lines.push('• Desconto: não há política de desconto cadastrada; a equipe comercial precisa confirmar.');
  if (asksStock) lines.push('• Estoque/pronta entrega: a disponibilidade não está informada na base; precisa ser confirmada pela equipe.');
  if (asksCustomization) lines.push('• Personalização: as opções para este produto não estão cadastradas; não posso confirmar sem avaliação da equipe.');
  if (asksDelivery) lines.push('• Prazo e frete: não estão cadastrados; dependem da confirmação do endereço e da equipe.');
  if (asksPurchase && product.published !== true) {
    lines.push('• Situação: o produto está em rascunho e ainda não está liberado para venda ou divulgação.');
  }
  lines.push('Posso encaminhar você ao WhatsApp comercial para a equipe confirmar as condições, mas nenhum pedido está confirmado por aqui.');
  return lines.join('\\n');
}

export function getDeterministicReply(message, mode, knowledge) {
  const text = normalizeQuestion(message);
  const products = Array.isArray(knowledge?.products) ? knowledge.products : [];

  if (mode === 'loja' && /\\b(lista|listar|quais|catalogo|produtos)\\b/.test(text)) {
    if (!products.length) return 'Ainda não há produtos cadastrados na base da Express’Arte.';
    const lines = products.map(product => {
      const status = product.published === true ? 'publicado' : 'rascunho — não anunciado';
      const price = Number.isFinite(product.provisionalPriceBRL)
        ? 'Preço provisório: ' + formatBRL(product.provisionalPriceBRL) + '. '
        : Number.isFinite(product.suggestedPriceBRL)
          ? 'Sugestão pendente: ' + formatBRL(product.suggestedPriceBRL) + '. '
          : '';
      return '• ' + product.name + ' — ' + status + '. ' + price;
    });
    return 'Produtos cadastrados na base (ainda sujeitos à aprovação):\\n' + lines.join('\\n');
  }

  if (mode === 'loja' && /\\b(whatsapp|instagram|contato|telefone)\\b/.test(text)) {
    const store = knowledge?.store || {};
    const parts = [];
    if (store.whatsappNumber) parts.push('WhatsApp: https://wa.me/' + String(store.whatsappNumber).replace(/\\D/g, ''));
    if (store.instagramUrl) parts.push('Instagram: ' + store.instagramUrl);
    return parts.length ? 'Canais cadastrados da Express’Arte:\\n' + parts.join('\\n') : 'Os canais de contato ainda não estão cadastrados na base.';
  }

  if (mode === 'loja') {
    const product = findMentionedProduct(text, products);
    if (product) {
      const commercialReply = getProductCommercialReply(message, product);
      if (commercialReply) return commercialReply;
      const status = product.published === true ? 'O produto está marcado como publicado.' : 'Atenção: o produto está em rascunho e não deve ser anunciado como disponível.';
      const price = Number.isFinite(product.provisionalPriceBRL)
        ? 'Preço provisório cadastrado: ' + formatBRL(product.provisionalPriceBRL) + '.'
        : Number.isFinite(product.suggestedPriceBRL)
          ? 'Há uma sugestão de ' + formatBRL(product.suggestedPriceBRL) + ', ainda pendente de aprovação.'
          : 'Não há preço cadastrado.';
      return product.name + '. ' + status + ' ' + price;
    }
  }
  return null;
}
