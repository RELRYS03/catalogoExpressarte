(() => {
  'use strict';

  const config = window.EXPRESSARTE_CONFIG || {};
  const endpoint = String(config.expressinhoEndpoint || '').trim();
  const $ = selector => document.querySelector(selector);

  const panel = $('#expressinhoPanel');
  const heroTrigger = $('#expressinhoHeroOpen');
  const floatingTrigger = $('#expressinhoFloatingOpen');
  const closeButton = $('#expressinhoClose');
  const form = $('#expressinhoForm');
  const input = $('#expressinhoInput');
  const messages = $('#expressinhoMessages');
  const sendButton = $('#expressinhoSend');
  const quickButtons = Array.from(document.querySelectorAll('[data-expressinho-prompt]'));
  const hero = document.querySelector('.promo-banner');

  if (!panel || !heroTrigger || !floatingTrigger || !form || !input || !messages) return;

  let activeTrigger = heroTrigger;
  let history = [];
  let lastProductId = '';

  const status = $('#expressinhoStatus');
  const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function setExpanded(expanded) {
    heroTrigger.setAttribute('aria-expanded', String(expanded));
    floatingTrigger.setAttribute('aria-expanded', String(expanded));
  }

  function openPanel(trigger) {
    activeTrigger = trigger || heroTrigger;
    panel.hidden = false;
    floatingTrigger.hidden = true;
    setExpanded(true);
    input.focus();
  }

  function closePanel() {
    panel.hidden = true;
    setExpanded(false);
    const heroRect = hero ? hero.getBoundingClientRect() : null;
    const heroVisible = heroRect && heroRect.bottom > 0 && heroRect.top < window.innerHeight;
    floatingTrigger.hidden = Boolean(heroVisible);
    const focusTarget = heroVisible ? heroTrigger : floatingTrigger;
    if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
  }

  function addMessage(text, role, extraClass) {
    const bubble = document.createElement('div');
    bubble.className = 'expressinho-message ' + role + (extraClass ? ' ' + extraClass : '');
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  const ignoredWords = new Set(('oi ola eu e o a os as um uma de da do das dos no na em por para com que quero gostaria pedir fazer ' +
    'preciso comprar encomendar encomenda valor preco quanto fica sai custa tem voce voces consegue conseguir mostrar ver me ' +
    'produto item preco pedido unidade peca qual quais esse essa isto isso deles dele dela mesmo agora pode ' +
    'orcamento desconto promocao oferta atacado estoque pronta pronto entrega disponivel disponibilidade prazo frete dia ate r ' +
    'estao esta cadastrado publicado vende vendem confirmacao confirmar').split(' '));
  const normalize = text => text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = text => (normalize(text).match(/[a-z]+/g) || []).map(word => word === 'quais' ? 'qual' : word.replace(/oes$/, 'ao').replace(/s$/, ''));

  function contactAction(message) {
    const number = String(config.whatsappNumber || '').replace(/\D/g, '');
    return number ? { label: 'Consultar pelo WhatsApp', href: 'https://wa.me/' + number + '?text=' + encodeURIComponent(message) } : null;
  }

  async function shopAnswer(message) {
    const shop = window.EXPRESSARTE_LOJA;
    if (!shop) return null;
    const text = normalize(message);
    const quantityMatch = text.match(/\b(\d+)\s*(?:unidades?|un\.?|pecas?)\b/) ||
      text.match(/(?:^\s*(?:e\s+)?|\b(?:quero|preciso de|gostaria de|tem|separar|encomendar|quanto (?:custa|fica|sai))\s+)(\d+)(?![\d.,/])(?=\s|[!?]|$)/);
    const quantity = quantityMatch ? Number(quantityMatch[1]) : null;
    if (quantity !== null && (quantity < 1 || quantity > 999)) return { text: 'Informe uma quantidade de 1 a 999 unidades.' };

    const promoOnly = /\b(?:promocao|promocoes|ofertas?)\b/.test(text);
    const listRequested = /\b(?:quais|ver|mostrar|listar)\s+(?:os\s+)?(?:produtos|itens)\b|\b(?:voces? (?:vende|vendem|tem)|catalogo)\b/.test(text);
    const budget = text.match(/\bate\s*(?:r\$\s*)?(\d+(?:\.\d{3})*(?:,\d{1,2})?)(?![\d.,/])/);
    const budgetCents = budget ? Math.round(Number(budget[1].replaceAll('.', '').replace(',', '.')) * 100) : null;
    const delivery = message.match(/\b(?:para|at[eé])\s+(?:(?:o\s+)?dia\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|amanh[ãa]|sexta(?:-feira)?|s[áa]bado|domingo)\b/i)?.[1] ||
      message.match(/\bpara\s+(?:o\s+)?dia\s+(\d{1,2})\b/i)?.[1];
    const stockCheck = /\b(?:estoque|pronta entrega|prontos?|disponibilidade)\b/.test(text) || (quantity !== null && /\btem\b/.test(text));
    const quote = stockCheck || Boolean(delivery) || /\b(?:desconto|atacado|prazo|frete|entrega|personalizar|personalizado)\b/.test(text);
    const query = delivery ? text.replace(normalize(delivery), ' ') : text;
    const terms = [...new Set(words(query).filter(word => word.length > 2 && !ignoredWords.has(word)))];
    const products = await shop.products();
    if (!products) return { text: 'Não consegui consultar o catálogo agora. Tente novamente em instantes.' };

    let matches = products.map(product => {
      const name = words(product.name);
      const category = words(product.category || '');
      const matched = terms.filter(term => name.includes(term) || category.includes(term)).length;
      const score = matched * 3 + terms.filter(term => name.includes(term)).length;
      return { product, matched, score };
    }).filter(item => item.matched > 0).sort((a, b) => b.score - a.score);
    if (matches.length) {
      const best = matches[0].matched;
      matches = matches.filter(item => item.matched === best);
    }
    const continuation = quantity !== null || quote || /\b(?:esse|essa|dele|dela)\b/.test(text);
    const specificQuestion = terms.some(term => !['preco', 'total', 'forma', 'fazer', 'confirmar', 'comprar'].includes(term));
    if (!matches.length && continuation && !specificQuestion && lastProductId) {
      const previous = products.find(product => product.id === lastProductId);
      if (previous) matches = [{ product: previous }];
    }
    if (!matches.length && (listRequested || promoOnly || budgetCents !== null) && (!terms.length || listRequested)) {
      matches = products.map(product => ({ product }));
    }

    const matchingProducts = matches.map(item => item.product).filter(product =>
      (!promoOnly || product.promotion) &&
      (budgetCents === null || (product.priceCents !== null && product.priceCents * (quantity || 1) <= budgetCents)));
    if (!matchingProducts.length) {
      if (quantity !== null && !matches.length) return { text: 'Qual produto você quer e em qual quantidade? Pode escrever o nome como aparece no catálogo.' };
      if (matches.length || promoOnly || budgetCents !== null || listRequested) return { text: 'Não encontrei produtos publicados que atendam a esse pedido. Tente outro nome ou valor.' };
      return null;
    }
    if (matchingProducts.length > 1) {
      const choices = matchingProducts.slice(0, 4);
      return {
        text: (quantity !== null ? 'Qual destes produtos você quer? Me diga o nome e a quantidade.' : 'Encontrei estes produtos no catálogo:') + '\n' +
          choices.map(product => '• ' + product.name + ' — ' + (product.priceCents === null ? 'Preço sob consulta' : money(product.priceCents)) +
            (product.madeToOrder ? ' · Sob encomenda' : '')).join('\n'),
        actions: choices.filter(product => product.href).map(product => ({ label: 'Ver ' + product.name, href: product.href }))
      };
    }

    const product = matchingProducts[0];
    lastProductId = product.id;
    const units = quantity || 1;
    const unitText = units + (units === 1 ? ' unidade' : ' unidades');
    const price = product.priceCents;
    const productAction = product.href ? { label: 'Ver produto', href: product.href } : null;
    const detail = product.name + ' — ' + (price === null ? 'preço sob consulta' : money(price) + ' por unidade') +
      (product.promotion ? ' (' + product.promotion + ')' : '') + '.';
    const total = quantity && price !== null ? '\n' + unitText + (units === 1 ? ' fica em ' : ' ficam em ') + money(price * units) + '.' : '';
    if (quote || price === null) {
      const date = delivery ? '\nData desejada: ' + delivery + '.' : '';
      const contact = contactAction('Olá! Gostaria de consultar a Express’Arte sobre ' + product.name + '.\nQuantidade: ' +
        unitText + '.' + date + '\nMinha dúvida: ' + message);
      return { text: detail + total + (product.madeToOrder ? '\nProduto sob encomenda.' : '') +
        '\nA loja pode confirmar disponibilidade, prazo e condições pelo WhatsApp.', actions: [productAction, contact].filter(Boolean) };
    }
    return {
      text: detail + total + (product.madeToOrder ? '\nProduto sob encomenda. Confirme o prazo com a loja.' : '\nA loja confirma a disponibilidade ao receber o pedido.'),
      actions: [productAction, { label: product.madeToOrder ? 'Incluir como encomenda' : 'Incluir no pedido', add: () => shop.add(product.id, units, price, product.promotion) }].filter(Boolean)
    };
  }

  function localAnswer(message) {
    const text = message.toLocaleLowerCase('pt-BR');
    if (/\b(aprender|memorizar|guardar|ensinar|corrigir|lembrar|memória|memoria)\b/.test(text)) {
      return 'Nesta primeira versão, eu ainda não salvo novas informações como memória permanente. Posso usar esta conversa enquanto o painel estiver aberto, mas uma correção só vira conhecimento duradouro quando a equipe a aprovar e cadastrar na base. Isso evita guardar informação errada.';
    }

    return 'Me diga o nome do produto ou a categoria. Posso procurar ofertas e calcular pedidos com várias unidades. Para uma dúvida específica, fale com a loja pelo WhatsApp.';
  }

  function shopFallback(message) {
    return { text: localAnswer(message),
      actions: [contactAction('Olá! Tenho uma dúvida sobre o catálogo.\n' + message)].filter(Boolean) };
  }

  async function getAnswer(message) {
    const answer = await shopAnswer(message);
    if (answer) return answer;
    if (!endpoint) return shopFallback(message);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, mode: 'loja', history: history.slice(-10) })
    });
    if (!response.ok) throw new Error('A conexão com o serviço do Expressinho falhou.');
    const data = await response.json();
    if (!data || typeof data.reply !== 'string' || !data.reply.trim()) {
      throw new Error('O serviço do Expressinho não devolveu uma resposta válida.');
    }
    return { text: data.reply.trim() };
  }

  async function submitMessage(rawMessage) {
    const message = String(rawMessage || '').trim();
    if (!message || sendButton.disabled) return;

    addMessage(message, 'user');
    history.push({ role: 'user', content: message });
    input.value = '';
    sendButton.disabled = true;
    input.disabled = true;
    const pending = addMessage('Consultando o catálogo…', 'assistant', 'pending');

    let answer;
    try {
      answer = await getAnswer(message);
    } catch {
      answer = shopFallback(message);
    }

    pending.remove();
    const bubble = addMessage(answer.text, 'assistant');
    if (answer.actions?.length) {
      const actions = document.createElement('div');
      actions.className = 'expressinho-answer-actions';
      answer.actions.forEach(action => {
        const control = document.createElement(action.href ? 'a' : 'button');
        control.textContent = action.label;
        if (action.href) {
          control.href = action.href;
          control.addEventListener('click', closePanel);
          if (!action.href.startsWith('#')) {
            control.target = '_blank';
            control.rel = 'noopener noreferrer';
          }
        } else {
          control.type = 'button';
          control.addEventListener('click', () => {
            const added = action.add();
            control.textContent = added ? 'Adicionado' : 'O preço mudou. Consulte novamente.';
            control.disabled = true;
          });
        }
        actions.appendChild(control);
      });
      bubble.appendChild(actions);
      messages.scrollTop = messages.scrollHeight;
    }
    history.push({ role: 'assistant', content: answer.text });
    history = history.slice(-12);
    sendButton.disabled = false;
    input.disabled = false;
    input.focus();
  }

  heroTrigger.addEventListener('click', () => openPanel(heroTrigger));
  floatingTrigger.addEventListener('click', () => openPanel(floatingTrigger));
  closeButton.addEventListener('click', closePanel);
  quickButtons.forEach(button => button.addEventListener('click', () => submitMessage(button.dataset.expressinhoPrompt)));
  form.addEventListener('submit', event => {
    event.preventDefault();
    submitMessage(input.value);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) closePanel();
  });

  if ('IntersectionObserver' in window && hero) {
    const observer = new IntersectionObserver(entries => {
      const heroVisible = entries.some(entry => entry.isIntersecting);
      floatingTrigger.hidden = heroVisible || !panel.hidden;
    }, { threshold: 0.08 });
    observer.observe(hero);
  } else {
    floatingTrigger.hidden = false;
  }

  if (endpoint) {
    const status = $('#expressinhoStatus');
    fetch('/api/health')
      .then(response => response.json().then(data => ({ ok: response.ok, data: data })))
      .then(result => {
        if (!status) return;
        status.textContent = result.ok && result.data.ok
          ? 'Assistente da Express’Arte'
          : 'Consulta ao catálogo';
      })
      .catch(() => {
        const statusElement = $('#expressinhoStatus');
        if (statusElement) statusElement.textContent = 'Consulta ao catálogo';
      });
  }

  window.addEventListener('resize', () => {
    if (!panel.hidden && window.innerWidth > 620) panel.style.maxHeight = '';
  });
})();
