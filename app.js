(() => {
  'use strict';
  const config = window.EXPRESSARTE_CONFIG || { whatsappNumber: '', storeName: "Express'Arte", draftMode: true };
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const products = [
    { id: 'academia-001', name: 'Pote Anilha 28KG / 64LB', category: 'Academia', price: 34.90, priceLabel: 'preço provisório', draft: true },
    { id: 'religioso-001', name: 'Bandeja Porta Rosário Nossa Senhora Aparecida 130mm', category: 'Religiosos', price: 30.00, priceLabel: 'preço promocional', draft: true }
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
  function addProduct(id) {
    const product = getProduct(id);
    const quantity = state.quantities[id] || 1;
    const previous = state.order.get(id);
    state.order.set(id, { id, quantity: (previous?.quantity || 0) + quantity });
    renderOrder();
    notify(`${product.name} incluído no pedido (${quantity} un.).`);
  }
  function renderOrder() {
    const entries = Array.from(state.order.values());
    const totalUnits = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const total = entries.reduce((sum, entry) => sum + getProduct(entry.id).price * entry.quantity, 0);
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
      return `<div class="order-item"><div><div class="order-item-name">${escapeHtml(product.name)}</div><div class="order-item-detail">${entry.quantity} × ${money(product.price)} · ${product.priceLabel || 'preço provisório'}</div></div><div class="order-item-total">${money(entry.quantity * product.price)}</div><button class="remove-item" type="button" data-remove="${entry.id}" aria-label="Remover ${escapeHtml(product.name)}">×</button></div>`;
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
      return `• ${entry.quantity} × ${product.name} — ${money(product.price * entry.quantity)} (${product.priceLabel || 'valor provisório'})`;
    });
    const total = entries.reduce((sum, entry) => sum + getProduct(entry.id).price * entry.quantity, 0);
    const message = `Olá! Vim pelo catálogo da Express'Arte e gostaria de consultar este pedido:\n\n${lines.join('\n')}\n\nTotal estimado: ${money(total)}\n\nSei que os preços exibidos podem ser provisórios; por favor, confirmem disponibilidade e valor final.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }
  function goToOrder() { $('#orderPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  const mainProductPhoto = $('#mainProductPhoto');
  $$('.photo-thumb').forEach(button => button.addEventListener('click', () => {
    mainProductPhoto.src = button.dataset.photo;
    mainProductPhoto.alt = button.dataset.alt || 'Foto do pote anilha';
    $$('.photo-thumb').forEach(thumb => {
      const active = thumb === button;
      thumb.classList.toggle('active', active);
      thumb.setAttribute('aria-pressed', String(active));
    });
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
})();
