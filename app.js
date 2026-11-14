(() => {
  'use strict';
  const config = window.EXPRESSARTE_CONFIG || { whatsappNumber: '', storeName: "Express'Arte", draftMode: true };
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const products = [
    { id: 'academia-001', name: 'Pote Anilha 28KG / 64LB', category: 'Academia', price: 34.90, priceLabel: 'preço provisório', draft: true },
    { id: 'religioso-001', name: 'Bandeja Porta Rosário Nossa Senhora Aparecida 130mm', category: 'Religiosos', price: 30.00, priceLabel: 'preço atual', draft: true }
  ];
  const state = { category: 'Todas', search: '', quantities: Object.fromEntries(products.map(p => [p.id, 1])), order: new Map() };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const productGrid = $('#productGrid');
  const emptyState = $('#emptyState');
  const orderItems = $('#orderItems');
  const orderTotal = $('#orderTotal');
  const orderCount = $('#orderCount');
  const orderSummaryCount = $('#orderSummaryCount');
  const floatCount = $('#floatCount');
  const floatTotal = $('#floatTotal');
  const clearOrder = $('#clearOrder');
  const sendWhatsApp = $('#sendWhatsApp');
  const toast = $('#toast');
  let toastTimeout;

  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function getProduct(id) { return products.find(p => p.id === id); }
  function visibleProduct(card) {
    const name = (card.dataset.name || '').toLocaleLowerCase('pt-BR');
    const category = card.dataset.category;
    return (!state.search || name.includes(state.search)) && (state.category === 'Todas' || category === state.category);
  }
  function applyFilters() {
    let visible = 0;
    $$('.product-card').forEach(card => {
      const show = visibleProduct(card);

      if (show) {
        card.hidden = false;
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        setTimeout(() => {
          card.style.transition = 'opacity .4s ease, transform .4s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, 50);
      } else {
        card.hidden = true;
      }
      if (show) visible++;
    });
    emptyState.hidden = visible > 0;
    productGrid.hidden = visible === 0;
  }
  function setCategory(category) {
    state.category = category;
    $$('.category-item').forEach(button => {
      const active = button.dataset.category === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    applyFilters();
  }
  function updateQuantity(card, next) {
    const value = Math.max(1, Math.min(999, next));
    state.quantities[card.dataset.productId] = value;
    card.querySelector('.qty-value').textContent = value;
  }
  function addProduct(id, priceOverride = null, priceLabelOverride = null) {
    const product = getProduct(id);
    if (!product) return;
    const quantity = state.quantities[id] || 1;
    const previous = state.order.get(id);
    const price = priceOverride ?? previous?.price ?? product.price;
    const priceLabel = priceLabelOverride ?? previous?.priceLabel ?? product.priceLabel;
    state.order.set(id, { id, quantity: (previous?.quantity || 0) + quantity, price, priceLabel });
    renderOrder();
    notify(`${product.name} incluído no pedido (${quantity} un.).${priceOverride !== null ? ` Oferta de teste: ${money(priceOverride)} cada.` : ''}`);
  }
    function renderOrder() {
    const entries = Array.from(state.order.values());
    const totalUnits = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const total = entries.reduce((sum, entry) => sum + (entry.price ?? getProduct(entry.id).price) * entry.quantity, 0);
    orderCount.textContent = String(totalUnits);
    floatCount.textContent = `${totalUnits} item${totalUnits !== 1 ? 's' : ''}`;
    floatTotal.textContent = money(total);
    orderSummaryCount.textContent = totalUnits === 0 ? 'Nenhum item selecionado' : `${totalUnits} ${totalUnits === 1 ? 'unidade selecionada' : 'unidades selecionadas'}`;
    orderTotal.textContent = money(total);
    clearOrder.disabled = entries.length === 0;
    sendWhatsApp.disabled = entries.length === 0;
    if (!entries.length) {
      orderItems.innerHTML = '<div class="order-empty">Seu pedido ainda está vazio.</div>';
      return;
    }
    orderItems.innerHTML = entries.map(entry => {
      const product = getProduct(entry.id);
      return `<div class="order-item"><div><div class="order-item-name">${escapeHtml(product.name)}</div><div class="order-item-detail">${entry.quantity} × ${money(entry.price ?? product.price)} · ${entry.priceLabel || product.priceLabel || 'preço provisório'}</div></div><div class="order-item-total">${money(entry.quantity * (entry.price ?? product.price))}</div><button class="remove-item" type="button" data-remove="${entry.id}" aria-label="Remover ${escapeHtml(product.name)}">×</button></div>`;
    }).join('');
    $$('[data-remove]').forEach(button => button.addEventListener('click', () => {
      state.order.delete(button.dataset.remove);
      renderOrder();
      notify('Item removido do pedido.');
    }));
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function ensureCategoryButton(category) {
    const strip = $('#categoryStrip');
    if (!strip || $$('.category-item').some(button => button.dataset.category === category)) return;
    const button = document.createElement('button');
    button.className = 'category-item';
    button.type = 'button';
    button.dataset.category = category;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = '<span class="category-circle"><span aria-hidden="true">✦</span></span><span>' + escapeHtml(category) + '</span>';
    button.addEventListener('click', () => setCategory(category));
    strip.append(button);
  }
  function addImportedProduct(item) {
    const safeId = String(item.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeId) return;
    const id = 'imported-' + safeId;
    if (getProduct(id)) return;
    const name = String(item.title || 'Modelo Express’Arte').slice(0,180);
    const category = String(item.category || 'Outros').slice(0,80);
    const author = String(item.author || '').slice(0,120);
    const sourceUrl = /^https:\/\//i.test(String(item.source_url || '')) ? String(item.source_url) : '';
    const imageUrl = /^https:\/\//i.test(String(item.image_url || '')) ? String(item.image_url) : '';
    const hasPrice = item.price_cents !== null && item.price_cents !== undefined && Number.isFinite(Number(item.price_cents));
    const price = hasPrice ? Math.max(0, Number(item.price_cents) / 100) : 0;
    const priceLabel = hasPrice ? 'preço informado' : 'consulte o valor';
    products.push({ id, name, category, price, priceLabel, draft: false });
    state.quantities[id] = 1;
    ensureCategoryButton(category);
    const card = document.createElement('article');
    card.className = 'product-card imported-product-card';
    card.id = id;
    card.tabIndex = -1;
    card.dataset.productId = id;
    card.dataset.category = category;
    card.dataset.name = name;
    const photo = imageUrl
      ? '<img class="product-main-photo" src="' + escapeHtml(imageUrl) + '" alt="' + escapeHtml(name) + '" loading="lazy">'
      : '<div class="product-main-photo imported-placeholder" role="img" aria-label="Imagem ainda não disponível">Imagem não disponível</div>';
    const source = sourceUrl
      ? '<a class="imported-source-link" href="' + escapeHtml(sourceUrl) + '" target="_blank" rel="noopener noreferrer">Ver modelo original ↗</a>'
      : '';
    card.innerHTML = '<div class="product-photo-area"><span class="product-badge">SELECIONADO</span><div class="product-gallery">' + photo + '</div></div>' +
      '<div class="product-info"><span class="product-category-label"><span class="category-mini-icon">✦</span> ' + escapeHtml(category.toLocaleUpperCase('pt-BR')) + '</span>' +
      '<h3>' + escapeHtml(name) + '</h3><p class="product-description">Modelo selecionado pela Express’Arte. Consulte disponibilidade e prazo de produção.' +
      (author ? ' Criador original: ' + escapeHtml(author) + '.' : '') + '</p>' +
      '<div class="price-line"><span class="price">' + (hasPrice ? money(price) : 'Consulte') + '</span><span class="provisional-label">' + priceLabel + '</span></div>' +
      '<div class="quantity-row"><span>Quantidade</span><div class="quantity-control"><button class="qty-minus" type="button" aria-label="Diminuir quantidade">−</button><output class="qty-value" aria-live="polite">1</output><button class="qty-plus" type="button" aria-label="Aumentar quantidade">+</button></div><span class="unit-label">un.</span></div>' +
      '<button class="add-order-button" type="button"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Incluir no pedido</button>' +
      '<p class="product-footnote">Produto selecionado para o catálogo. Preço e disponibilidade sujeitos à confirmação. ' + source + '</p></div>';
    productGrid.append(card);
    card.querySelector('.qty-minus').addEventListener('click', () => updateQuantity(card, state.quantities[id] - 1));
    card.querySelector('.qty-plus').addEventListener('click', () => updateQuantity(card, state.quantities[id] + 1));
    card.querySelector('.add-order-button').addEventListener('click', () => addProduct(id));
  }
  async function revealLinkedProduct() {
    const target = location.hash.slice(1);
    if (!/^imported-[0-9a-f-]{36}$/i.test(target)) return;
    let card = document.getElementById(target);
    if (!card) {
      try {
        const endpoint = new URL(productsEndpoint());
        endpoint.searchParams.set('id', target.slice('imported-'.length));
        const { products: matches } = await fetchProducts(endpoint);
        if (location.hash.slice(1) !== target) return;
        matches.forEach(addImportedProduct);
        card = document.getElementById(target);
        if (card) applyFilters();
      } catch {
        if (location.hash.slice(1) === target) notify('Não foi possível carregar o produto. Tente novamente.');
        return;
      }
    }
    if (!card) {
      notify('Este produto não está disponível na vitrine.');
      return;
    }
    if (!visibleProduct(card) || card.hidden) {
      state.search = '';
      $('#searchInput').value = '';
      setCategory('Todas');
    }
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function productsEndpoint() {
    const base = String(config.catalogApiEndpoint || '').trim().replace(/\/+$/, '');
    const path = base.endsWith('/api') ? base + '/products' : base + '/api/products';
    return new URL(path, location.origin).toString();
  }
  async function fetchProducts(endpoint) {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('API de produtos indisponível');
    return response.json();
  }
  async function loadApprovedImports() {
    if (!String(config.catalogApiEndpoint || '').trim()) return;
    try {
      const data = await fetchProducts(productsEndpoint());
      (Array.isArray(data.products) ? data.products : []).forEach(addImportedProduct);
      applyFilters();
    } catch (error) {
      console.warn('Não foi possível atualizar os produtos importados do catálogo.', error);
    }
    await revealLinkedProduct();
  }

  function sendOrder() {
    const entries = Array.from(state.order.values());
    if (!entries.length) return;
    const number = String(config.whatsappNumber || '').replace(/\D/g, '');
    if (!number) {
      notify('O WhatsApp ainda não foi configurado. Nenhuma mensagem foi enviada.');
      $('#whatsappNote').textContent = 'Falta configurar o número da loja em config.js. Nenhuma mensagem foi enviada.';
      return;
    }
    const lines = entries.map(entry => {
      const product = getProduct(entry.id);
      return `• ${product.name} — ${entry.quantity} ${entry.quantity === 1 ? 'unidade' : 'unidades'}`;
    });
    const message = `Olá! Gostaria de pedir:\n\n${lines.join('\n')}\n\nPode confirmar a disponibilidade e o valor final, por favor?`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }
  function goToOrder() { $('#orderPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  $$('.product-gallery').forEach(gallery => {
    const mainPhoto = gallery.querySelector('.product-main-photo');
    gallery.querySelectorAll('.photo-thumb').forEach(button => button.addEventListener('click', () => {
      mainPhoto.src = button.dataset.photo;
      mainPhoto.alt = button.dataset.alt || 'Foto do produto';
      gallery.querySelectorAll('.photo-thumb').forEach(thumb => {
        const active = thumb === button;
        thumb.classList.toggle('active', active);
        thumb.setAttribute('aria-pressed', String(active));
      });
    }));
  });
  $$('[data-promo-add]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.promoAdd;
    const price = Number(button.dataset.promoPrice);
    if (!getProduct(id) || !Number.isFinite(price) || price < 0) {
      notify('Esta promoção não está disponível.');
      return;
    }
    addProduct(id, price, 'promoção da semana (teste)');
    goToOrder();
  }));
  $$('.category-item').forEach(button => button.addEventListener('click', () => setCategory(button.dataset.category)));
  $('#searchInput').addEventListener('input', event => { state.search = event.target.value.trim().toLocaleLowerCase('pt-BR'); applyFilters(); });
  $('#clearSearch').addEventListener('click', () => { $('#searchInput').value = ''; state.search = ''; applyFilters(); $('#searchInput').focus(); });
  $('#resetFilters').addEventListener('click', () => { state.search = ''; $('#searchInput').value = ''; setCategory('Todas'); });
  $$('.product-card').forEach(card => {
    card.querySelector('.qty-minus').addEventListener('click', () => updateQuantity(card, state.quantities[card.dataset.productId] - 1));
    card.querySelector('.qty-plus').addEventListener('click', () => updateQuantity(card, state.quantities[card.dataset.productId] + 1));
    card.querySelector('.add-order-button').addEventListener('click', () => addProduct(card.dataset.productId));
  });
  $('#openOrder').addEventListener('click', goToOrder);
  $('#floatTrigger').addEventListener('click', goToOrder);
  $('#menuOrder').addEventListener('click', () => { $('#mobileMenu').hidden = true; $('#menuToggle').setAttribute('aria-expanded', 'false'); goToOrder(); });
  $('#sendWhatsApp').addEventListener('click', sendOrder);
  $('#clearOrder').addEventListener('click', () => { state.order.clear(); renderOrder(); notify('Seleção limpa.'); });
  $('#menuToggle').addEventListener('click', () => {
    const menu = $('#mobileMenu');
    menu.hidden = !menu.hidden;
    $('#menuToggle').setAttribute('aria-expanded', String(!menu.hidden));
  });
  $$('#mobileMenu a').forEach(link => link.addEventListener('click', () => { $('#mobileMenu').hidden = true; $('#menuToggle').setAttribute('aria-expanded', 'false'); }));
  $('#whatsappNote').textContent = config.whatsappNumber ? 'O WhatsApp abrirá com os produtos e quantidades para você confirmar o pedido. Preços ainda provisórios.' : 'Falta configurar o número da loja em config.js.';
  renderOrder();
  applyFilters();
  window.addEventListener('hashchange', revealLinkedProduct);
  loadApprovedImports();
})();
