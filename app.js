(() => {
  'use strict';
  const config = window.EXPRESSARTE_CONFIG || { whatsappNumber: '', storeName: "Express'Arte", draftMode: true };
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const products = (config.builtInProducts || []).map(product => ({ ...product }));
  const state = { category: '', search: '', quantities: Object.fromEntries(products.map(p => [p.id, 1])), order: new Map() };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const productGrid = $('#productGrid');
  const catalog = $('#catalogo');
  const catalogTitle = $('#catalogTitle');
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
  let catalogReady = !String(config.catalogApiEndpoint || '').trim();

  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function getProduct(id) { return products.find(p => p.id === id); }
  function visibleProduct(card) {
    if (!catalogReady) return false;
    const name = (card.dataset.name || '').toLocaleLowerCase('pt-BR');
    const category = card.dataset.category;
    return Boolean(state.search || state.category) &&
      (!state.search || name.includes(state.search)) && (!state.category || category === state.category);
  }
  function applyFilters() {
    catalog.hidden = !state.category && !state.search;
    catalogTitle.textContent = state.category || 'Resultados da busca';
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
  function browseCategory(category) {
    state.search = '';
    $('#searchInput').value = '';
    setCategory(category);
    catalogTitle.focus({ preventScroll: true });
    catalog.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function addProduct(id, priceOverride = null, priceLabelOverride = null, quantity = state.quantities[id] || 1) {
    const product = getProduct(id);
    if (!product) return;
    const price = priceOverride ?? product.price;
    const priceLabel = priceLabelOverride ?? product.priceLabel;
    const key = priceOverride === null ? id : id + ':' + priceLabel + ':' + price;
    const previous = state.order.get(key);
    state.order.set(key, { id, key, quantity: (previous?.quantity || 0) + quantity, price, priceLabel });
    renderOrder();
    notify(`${product.name} ${product.madeToOrder ? 'incluído como encomenda' : 'incluído no pedido'} (${quantity} un.).`);
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
      return `<div class="order-item"><div><div class="order-item-name">${escapeHtml(product.name)}</div><div class="order-item-detail">${entry.quantity} × ${money(entry.price ?? product.price)} · ${escapeHtml(entry.priceLabel || product.priceLabel || 'preço provisório')}${product.madeToOrder ? ' · Sob encomenda' : ''}</div></div><div class="order-item-total">${money(entry.quantity * (entry.price ?? product.price))}</div><button class="remove-item" type="button" data-remove="${escapeHtml(entry.key)}" aria-label="Remover ${escapeHtml(product.name)}">×</button></div>`;
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
  const categoryIcons = new Map([
    ['destaque', '<circle cx="12" cy="9" r="5"/><path d="m9 13-2 7 5-2 5 2-2-7"/>'],
    ['decoracao', '<path d="M9 3h6M10 3v5c0 2-4 3-4 7a6 6 0 0 0 12 0c0-4-4-5-4-7V3M7 16h10"/>'],
    ['brinquedos', '<rect x="3" y="8" width="18" height="9" rx="4"/><path d="M8 10.5v4m-2-2h4m5-1h.01m3 2h.01"/>'],
    ['colecionaveis', '<path d="M5 3h14v18H5zM5 17h14"/><circle cx="12" cy="10" r="3"/>'],
    ['outros', '<rect x="3.5" y="4" width="17" height="4" rx="1"/><path d="M5 8v12h14V8m-9 4h4"/>']
  ]);
  const defaultCategoryIcon = '<path d="M3 4h8l10 10-7 7L3 10z"/><circle cx="7.5" cy="8" r="1"/>';
  // O catálogo aplica os mesmos desenhos às categorias novas e às já cadastradas.
  const categoryIconRules = [
    [/\b(?:filamentos?|bobinas?|carreteis?|pla|petg|tpu|abs)\b/, '<ellipse cx="8" cy="12" rx="4" ry="8"/><ellipse cx="8" cy="12" rx="1.5" ry="3"/><path d="M8 4h8c2.2 0 4 3.6 4 8s-1.8 8-4 8H8m4-11h7m-7 6h7"/>'],
    [/\b(?:biscoitos?|bolachas?|cookies?|confeitaria)\b/, '<path d="m12 3 2.5 5.5 6 .8-4.4 4.3 1 6-5.1-2.9-5.1 2.9 1-6-4.4-4.3 6-.8L12 3Z"/><path d="M12 11v.01m-2 2h.01m4 0h.01"/>'],
    [/\b(?:vasos?|cachepos?|floreiras?|plantas?|jardinagem)\b/, '<path d="M5 12h14l-2 8H7l-2-8Zm7 0V7m0 2C9 9 7 7 7 4c3 0 5 2 5 5Zm0 0c0-3 2-5 5-5 0 3-2 5-5 5Z"/>'],
    [/\b(?:natal|natalin\w*|presepios?)\b/, '<path d="m12 3 4 5h-2l5 5h-3l5 5H3l5-5H5l5-5H8l4-5Zm0 15v3m-3 0h6"/>'],
    [/\b(?:organizadores?|organizacao|gavetas?)\b/, '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M10 8h4m-4 8h4"/>'],
    [/\b(?:luminarias?|abajur(?:es)?|lampadas?|iluminacao)\b/, '<path d="M9 18h6m-5 3h4m-5-6c0-2-3-3-3-7a6 6 0 0 1 12 0c0 4-3 5-3 7H9Z"/>'],
    [/\b(?:ferramentas?|oficina|manutencao)\b/, '<path d="m14 6 3 3 4-4c1 4-2 8-6 8h-1l-6 7a2 2 0 0 1-3-3l7-6v-1c0-4 4-7 8-6l-3 3"/>'],
    [/\b(?:lembrancinhas?|festas?|aniversarios?)\b/, '<path d="M4 10h16v4H4zM6 14v7h12v-7m-6-4v11m0-11c-6 0-7-6-3-6 2 0 3 3 3 6Zm0 0c6 0 7-6 3-6-2 0-3 3-3 6Z"/>'],
    [/\b(?:pascoa|coelhos?|ovos?)\b/, '<path d="M12 3c-4 0-7 7-7 11a7 7 0 0 0 14 0c0-4-3-11-7-11ZM5 14l3-2 4 3 4-3 3 2"/>']
  ];

  function ensureCategoryButton(category) {
    const strip = $('#categoryStrip');
    if (!strip || $$('.category-item').some(button => button.dataset.category === category)) return;
    const button = document.createElement('button');
    button.className = 'category-item';
    button.type = 'button';
    button.dataset.category = category;
    button.setAttribute('aria-pressed', 'false');
    const name = category.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ').trim();
    const icon = categoryIcons.get(name === 'destaques' ? 'destaque' : name)
      || categoryIconRules.find(([pattern]) => pattern.test(name))?.[1]
      || defaultCategoryIcon;
    button.innerHTML = '<span class="category-circle"><svg viewBox="0 0 24 24" aria-hidden="true">' +
      icon + '</svg></span><span>' + escapeHtml(category) + '</span>';
    button.addEventListener('click', () => browseCategory(category));
    strip.append(button);
  }
  function renderProductDetails(details, fallback, showUnconfirmedDimensions = false) {
    const minutes = details.printMinutes;
    const time = minutes ? [Math.floor(minutes / 60) ? Math.floor(minutes / 60) + ' h' : '', minutes % 60 ? minutes % 60 + ' min' : ''].filter(Boolean).join(' ') : '';
    const specs = [
      ['Tempo de impressão', time],
      ['Filamento', details.filamentGrams ? new Intl.NumberFormat('pt-BR', { useGrouping: 'always', maximumFractionDigits: 2 }).format(details.filamentGrams) + ' g' : ''],
      ['Prazo de produção', details.leadTime]
    ].filter(([, value]) => value);
    const dimensions = details.dimensions ? '<p class="product-dimensions"><strong>Dimensões</strong> ' + escapeHtml(details.dimensions) + '</p>'
      : showUnconfirmedDimensions ? '<p class="product-dimensions">Dimensões a confirmar no pedido</p>' : '';
    return '<div class="catalog-product-details"><p class="product-description">' + escapeHtml(details.description || fallback) + '</p>' + dimensions +
      (specs.length ? '<dl class="catalog-product-specs">' + specs.map(([label, value]) =>
        '<div><dt>' + label + '</dt><dd>' + escapeHtml(value) + '</dd></div>').join('') + '</dl>' : '') +
      (details.assembly ? '<details class="catalog-product-assembly"><summary>Como montar ou usar</summary><p>' + escapeHtml(details.assembly) + '</p></details>' : '') + '</div>';
  }
  const preorderBadge = '<span class="preorder-badge">Esgotado · Sob encomenda</span>';
  function showProductAvailability(card, product, details) {
    product.madeToOrder = details.madeToOrder === true;
    if (!product.madeToOrder) return;
    card.classList.add('made-to-order');
    card.querySelector('.product-badge').outerHTML = preorderBadge;
    card.querySelector('.add-order-button').lastChild.textContent = ' Encomendar';
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
    const details = JSON.parse(item.details_json || '{}');
    const product = { id, name, category, price, priceLabel, cover: imageUrl, draft: false, details };
    products.push(product);
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
      '<h3>' + escapeHtml(name) + '</h3>' +
      '<div class="price-line"><span class="price">' + (hasPrice ? money(price) : 'Consulte o valor') + '</span></div>' +
      '<div class="quantity-row"><span>Quantidade</span><div class="quantity-control"><button class="qty-minus" type="button" aria-label="Diminuir quantidade">−</button><output class="qty-value" aria-live="polite">1</output><button class="qty-plus" type="button" aria-label="Aumentar quantidade">+</button></div><span class="unit-label">un.</span></div>' +
      '<button class="add-order-button" type="button"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Incluir no pedido</button>' +
      '<details class="product-card-details"><summary>Ver detalhes</summary>' + renderProductDetails(details,
        'Modelo selecionado pela Express’Arte. Consulte disponibilidade e prazo de produção.', true) +
      (author ? '<p class="product-author">Criador original: ' + escapeHtml(author) + '</p>' : '') +
      '<p class="product-footnote">Produto selecionado para o catálogo. Preço e disponibilidade sujeitos à confirmação. ' + source + '</p></details></div>';
    showProductAvailability(card, product, details);
    productGrid.append(card);
    card.querySelector('.qty-minus').addEventListener('click', () => updateQuantity(card, state.quantities[id] - 1));
    card.querySelector('.qty-plus').addEventListener('click', () => updateQuantity(card, state.quantities[id] + 1));
    card.querySelector('.add-order-button').addEventListener('click', () => addProduct(id));
  }
  async function revealLinkedProduct() {
    const target = location.hash.slice(1);
    $('.imported-product-card.linked-product')?.classList.remove('linked-product');
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
      setCategory(card.dataset.category);
    }
    card.classList.add('linked-product');
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function productsEndpoint() {
    if (location.origin === config.catalogPagesOrigin) {
      return new URL('/import-api/api/products', location.origin).toString();
    }
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
      const removed = new Set(data.removedProductIds || []);
      for (let index = products.length - 1; index >= 0; index--) {
        if (!removed.has(products[index].id)) continue;
        const [{ id }] = products.splice(index, 1);
        productGrid.querySelector('[data-product-id="' + id + '"]')?.remove();
        delete state.quantities[id];
        state.order.delete(id);
      }
      if (removed.size) renderOrder();
      catalogReady = true;
      (data.categories || []).forEach(ensureCategoryButton);
      for (const edit of data.overrides || []) {
        const product = getProduct(edit.id);
        const card = $$('#productGrid .product-card').find(item => item.dataset.productId === edit.id);
        if (!product || !card) continue;
        if (edit.category) {
          product.category = card.dataset.category = edit.category;
          const badge = card.querySelector('.product-category-label');
          badge.lastChild.textContent = ' ' + edit.category.toLocaleUpperCase('pt-BR');
          ensureCategoryButton(edit.category);
        }
        if (edit.details_json) {
          const details = JSON.parse(edit.details_json);
          product.details = details;
          const description = card.querySelector('.product-description');
          description.insertAdjacentHTML('beforebegin', renderProductDetails(details, description.textContent));
          description.remove();
          showProductAvailability(card, product, details);
        }
        if (Number.isSafeInteger(edit.price_cents)) {
          product.price = edit.price_cents / 100;
          card.querySelector('.price').textContent = money(product.price);
        }
        if (/^https:\/\//i.test(edit.image_url || '')) {
          const main = card.querySelector('.product-main-photo');
          const first = card.querySelector('.photo-thumb');
          if (first) {
            first.dataset.photo = edit.image_url;
            first.dataset.alt = product.name;
            first.querySelector('img').src = edit.image_url;
          }
          if (!first || first.classList.contains('active')) {
            main.src = edit.image_url;
            main.alt = product.name;
          }
          product.cover = edit.image_url;
        }
      }
      (Array.isArray(data.products) ? data.products : []).forEach(addImportedProduct);
      renderPromotions(data.promotions || []);
      applyFilters();
    } catch (error) {
      console.warn('Não foi possível atualizar os produtos importados do catálogo.', error);
    }
    await revealLinkedProduct();
  }
  const promotionGrid = $('#promotionGrid');
  const promotionSection = $('#destaques');
  const promotionControls = $('#promotionControls');
  const promotionHeading = $('.promotion-heading');
  const promotionMascot = $('#promotionMascot');
  const promotionThemes = config.promotionThemes || {};
  const promotionMascotImages = new Map([
    ['natal', 'assets/expressinho-promocao-natal.webp'],
    ['reveillon', 'assets/expressinho-promocao-reveillon.webp']
  ]);
  const promotionMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let promotionMascotCards = [];
  let commonPromotionTheme = 'default';

  function updatePromotionMascot() {
    const left = promotionGrid.scrollLeft;
    const right = left + promotionGrid.clientWidth;
    const visibleCard = promotionMascotCards.find(card => {
      const center = card.offsetLeft + card.offsetWidth / 2;
      return center >= left && center <= right;
    });
    const theme = (visibleCard || promotionMascotCards[0])?.dataset.theme;
    const displayTheme = theme || commonPromotionTheme;
    promotionHeading.dataset.theme = displayTheme;
    promotionSection.dataset.theme = displayTheme;
    promotionMascot.hidden = !theme;
    if (theme) {
      const source = promotionMascotImages.get(theme);
      if (promotionMascot.getAttribute('src') !== source) promotionMascot.src = source;
    }
  }

  function updatePromotionControls() {
    promotionControls.hidden = promotionGrid.scrollWidth - promotionGrid.clientWidth <= 1;
    updatePromotionMascot();
  }

  function movePromotion(direction) {
    const { scrollLeft, scrollWidth, clientWidth } = promotionGrid;
    const end = scrollWidth - clientWidth;
    const wrap = direction > 0 ? scrollLeft >= end - 1 : scrollLeft <= 1;
    if (wrap) {
      promotionGrid.scrollTo({ left: direction > 0 ? 0 : end, behavior: 'instant' });
      return;
    }
    const positions = [...promotionGrid.children].map(card => card.offsetLeft);
    const nextPosition = direction > 0
      ? positions.find(left => left > scrollLeft + 1)
      : positions.reverse().find(left => left < scrollLeft - 1);
    promotionGrid.scrollTo({
      left: nextPosition ?? (direction > 0 ? end : 0),
      behavior: promotionMotion.matches ? 'instant' : 'smooth'
    });
  }

  $('#previousPromotion').addEventListener('click', () => movePromotion(-1));
  $('#nextPromotion').addEventListener('click', () => movePromotion(1));
  promotionGrid.addEventListener('scroll', updatePromotionMascot, { passive: true });
  new ResizeObserver(updatePromotionControls).observe(promotionGrid);
  new IntersectionObserver(([entry]) => {
    promotionSection.classList.toggle('promotion-in-view', entry.isIntersecting);
  }, { threshold: 0.15 }).observe(promotionSection);

  let livePromotions = [];

  function renderPromotions(promotions) {
    livePromotions = promotions;
    const grid = promotionGrid;
    grid.replaceChildren();
    promotionMascotCards = [];
    const themesInUse = new Set();
    for (const offer of promotions) {
      const product = getProduct(offer.product_id) || getProduct('imported-' + offer.product_id);
      if (!product || offer.expires_at <= Date.now()) continue;
      const price = offer.price_cents / 100;
      if (product.price > 0 && price >= product.price) continue;
      const discount = config.promotionDiscount?.(Math.round(product.price * 100), offer.price_cents);
      const label = offer.slot === 'day' ? 'Promoção do dia' : 'Promoção da semana';
      const campaign = offer.campaign ? '<p class="weekly-deal-category">' + escapeHtml(offer.campaign) + '</p>' : '';
      const cover = /^https:\/\//i.test(offer.image_url || '') ? offer.image_url : product.cover;
      const card = document.createElement('article');
      card.className = 'weekly-deal-card' + (product.madeToOrder ? ' made-to-order' : '');
      const theme = Object.hasOwn(promotionThemes, offer.theme) ? offer.theme : 'default';
      themesInUse.add(theme);
      if (theme !== 'default') {
        card.classList.add('promotion-theme');
        card.dataset.theme = theme;
      }
      if (promotionMascotImages.has(theme)) promotionMascotCards.push(card);
      card.innerHTML = '<div class="weekly-deal-photo">' +
        (cover ? '<img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">' : '') +
        '<span class="weekly-deal-tag">' + label + '</span>' +
        (discount ? '<span class="weekly-deal-discount"><strong>' + escapeHtml(discount) + '</strong><small>desconto</small></span>' : '') + '</div>' +
        '<div class="weekly-deal-content">' + (product.madeToOrder ? preorderBadge : '') + campaign + '<h3>' + escapeHtml(product.name) + '</h3><div class="weekly-deal-price">' +
        (product.price > price ? '<del aria-label="Preço normal">' + money(product.price) + '</del>' : '') +
        '<div><span>Preço promocional</span><strong>' + money(price) + '</strong></div></div>' +
        '<button class="weekly-deal-button" type="button">' + (product.madeToOrder ? 'Encomendar oferta' : 'Aproveitar oferta') + '</button></div>';
      card.querySelector('button').addEventListener('click', () => {
        if (offer.expires_at <= Date.now()) {
          renderPromotions(promotions);
          notify('Esta promoção terminou.');
          return;
        }
        addProduct(product.id, price, label);
        goToOrder();
      });
      grid.append(card);
    }
    promotionSection.hidden = !grid.childElementCount;
    commonPromotionTheme = themesInUse.size === 1 ? themesInUse.values().next().value : 'default';
    updatePromotionControls();
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
      const offer = entry.key === entry.id ? '' : ` (${entry.priceLabel}: ${money(entry.price)} por unidade)`;
      return `• ${product.name} — ${entry.quantity} ${entry.quantity === 1 ? 'unidade' : 'unidades'}${offer}${product.madeToOrder ? ' — Sob encomenda' : ''}`;
    });
    const message = `Olá! Gostaria de pedir:\n\n${lines.join('\n')}\n\nPode confirmar a disponibilidade e o valor final, por favor?`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }
  function goToOrder() { $('#orderPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  $$('#productGrid .product-card').forEach(card => {
    const mainPhoto = card.querySelector('.product-main-photo');
    const thumbnails = card.querySelectorAll('.photo-thumb');
    thumbnails.forEach(button => button.addEventListener('click', () => {
      mainPhoto.src = button.dataset.photo;
      mainPhoto.alt = button.dataset.alt || 'Foto do produto';
      thumbnails.forEach(thumb => {
        const active = thumb === button;
        thumb.classList.toggle('active', active);
        thumb.setAttribute('aria-pressed', String(active));
      });
    }));
  });
  $$('.category-item').forEach(button => button.addEventListener('click', () => browseCategory(button.dataset.category)));
  $('#searchInput').addEventListener('input', event => {
    state.search = event.target.value.trim().toLocaleLowerCase('pt-BR');
    setCategory('');
  });
  $('#searchInput').addEventListener('keydown', event => {
    if (event.key !== 'Enter' || !state.search) return;
    catalogTitle.focus({ preventScroll: true });
    catalog.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  $('#clearSearch').addEventListener('click', () => { $('#searchInput').value = ''; state.search = ''; applyFilters(); $('#searchInput').focus(); });
  $('#backToCategories').addEventListener('click', () => { state.search = ''; $('#searchInput').value = ''; setCategory(''); });
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
  const catalogLoaded = loadApprovedImports();
  function shopProduct(product) {
    const normalCents = Math.round(product.price * 100);
    const offer = livePromotions.reduce((best, current) => {
      if (current.product_id !== product.id && 'imported-' + current.product_id !== product.id) return best;
      if (current.expires_at <= Date.now() || !Number.isSafeInteger(current.price_cents) || current.price_cents <= 0 ||
          (normalCents > 0 && current.price_cents >= normalCents)) return best;
      return !best || current.price_cents < best.price_cents ? current : best;
    }, null);
    return {
      id: product.id, name: product.name, category: product.category, madeToOrder: product.madeToOrder === true,
      description: product.details?.description || '',
      dimensions: product.details?.dimensions || '',
      leadTime: product.details?.leadTime || '',
      priceCents: offer?.price_cents || (normalCents > 0 ? normalCents : null),
      promotion: offer ? (offer.slot === 'day' ? 'Promoção do dia' : 'Promoção da semana') : '',
      href: /^imported-[0-9a-f-]{36}$/i.test(product.id) ? '#' + product.id : ''
    };
  }
  window.EXPRESSARTE_LOJA = {
    async products() {
      await catalogLoaded;
      return catalogReady ? products.filter(product => !product.draft).map(shopProduct) : null;
    },
    add(id, quantity, priceCents, promotion) {
      const product = getProduct(id);
      if (!product || product.draft || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) return false;
      const latest = shopProduct(product);
      if (!latest.priceCents || latest.priceCents !== priceCents || latest.promotion !== promotion) return false;
      addProduct(id, promotion ? priceCents / 100 : null, promotion || null, quantity);
      return true;
    }
  };
})();
