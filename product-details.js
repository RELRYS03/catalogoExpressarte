(() => {
  'use strict';

  const grid = document.querySelector('#productGrid');
  const dialog = document.createElement('dialog');
  dialog.className = 'ea-details-dialog';
  dialog.setAttribute('aria-labelledby', 'ea-details-title');
  dialog.innerHTML = `<div class="ea-details-shell">
    <button type="button" class="ea-details-close" aria-label="Fechar detalhes" autofocus>×</button>
    <div class="ea-details-visual">
      <img class="ea-details-image" alt="">
      <div class="ea-details-image imported-placeholder" hidden>Imagem não disponível</div>
      <div class="ea-details-thumbnails" aria-label="Outras fotos"></div>
    </div>
    <div class="ea-details-content">
      <span class="ea-details-eyebrow"></span>
      <h2 id="ea-details-title"></h2>
      <div class="ea-details-description"></div>
      <div class="ea-details-price"></div>
      <form class="ea-details-order">
        <label class="ea-details-qty-label" for="ea-details-qty">Quantidade</label>
        <input id="ea-details-qty" class="ea-details-qty" type="number" min="1" max="999" value="1" required>
        <button type="submit" class="ea-details-add">Adicionar ao pedido</button>
      </form>
    </div>
  </div>`;
  document.body.append(dialog);

  const main = dialog.querySelector('img.ea-details-image');
  const placeholder = dialog.querySelector('.imported-placeholder');
  const thumbs = dialog.querySelector('.ea-details-thumbnails');
  const description = dialog.querySelector('.ea-details-description');
  const quantity = dialog.querySelector('.ea-details-qty');
  let activeCard;

  function openDetails(card) {
    const cover = card.querySelector('img.product-main-photo');
    const photoButtons = [...card.querySelectorAll('.photo-thumb[data-photo]')];
    const photos = photoButtons.map(button => ({
      src: button.dataset.photo,
      alt: button.dataset.alt || cover?.alt || ''
    }));
    if (!photos.length && cover) photos.push({ src: cover.src, alt: cover.alt });

    main.hidden = photos.length === 0;
    placeholder.hidden = !main.hidden;
    thumbs.hidden = photos.length < 2;
    thumbs.replaceChildren();

    function selectPhoto(index) {
      main.src = photos[index].src;
      main.alt = photos[index].alt;
      [...thumbs.children].forEach((button, position) => {
        button.classList.toggle('is-active', position === index);
        button.setAttribute('aria-pressed', String(position === index));
      });
    }

    photos.forEach((photo, index) => {
      if (thumbs.hidden) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ea-details-thumb';
      button.setAttribute('aria-label', 'Ver foto ' + (index + 1));
      const image = document.createElement('img');
      image.src = photo.src;
      image.alt = '';
      button.append(image);
      button.addEventListener('click', () => selectPhoto(index));
      thumbs.append(button);
    });
    if (photos.length) {
      const selected = photoButtons.findIndex(button => button.classList.contains('active'));
      selectPhoto(Math.max(0, selected));
    } else {
      main.removeAttribute('src');
    }

    const title = card.querySelector('h3').textContent;
    dialog.querySelector('h2').textContent = title;
    dialog.querySelector('.ea-details-price').textContent = card.querySelector('.price').textContent;
    dialog.querySelector('.ea-details-eyebrow').textContent = 'EXPRESS’ARTE • ' + card.dataset.category.toLocaleUpperCase('pt-BR');
    dialog.querySelector('.ea-details-add').textContent = card.classList.contains('made-to-order') ? 'Encomendar' : 'Adicionar ao pedido';
    description.replaceChildren();
    card.querySelectorAll('.catalog-product-details, .product-info > .product-description, .product-author, .product-footnote')
      .forEach(detail => description.append(detail.cloneNode(true)));
    quantity.value = '1';
    activeCard = card;
    dialog.showModal();
  }

  function enableDetails(card) {
    if (!card.matches('.product-card')) return;
    const photo = card.querySelector('.product-main-photo');
    if (!photo || photo.classList.contains('ea-details-clickable')) return;
    const title = card.querySelector('h3').textContent;
    photo.classList.add('ea-details-clickable');
    photo.tabIndex = 0;
    photo.setAttribute('role', 'button');
    photo.setAttribute('aria-label', 'Ver fotos e detalhes de ' + title);
    photo.setAttribute('aria-haspopup', 'dialog');
    photo.addEventListener('click', () => openDetails(card));
    photo.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      photo.click();
    });
    if (card.classList.contains('imported-product-card')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ea-details-view';
    button.textContent = 'Ver detalhes e fotos';
    button.addEventListener('click', () => openDetails(card));
    card.querySelector('.quantity-row').before(button);
  }

  dialog.querySelector('.ea-details-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    activeCard.dispatchEvent(new CustomEvent('catalog-details-order', {
      bubbles: true,
      detail: quantity.valueAsNumber
    }));
    dialog.close();
  });

  [...grid.children].forEach(enableDetails);
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement && node.parentElement === grid) enableDetails(node);
      }
    }
  }).observe(grid, { childList: true });
})();
