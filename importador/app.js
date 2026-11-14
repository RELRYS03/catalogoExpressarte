(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = ['sourceUrl','title','author','price','category'];
  let sharedImage = null;
  let originalImage = null;
  let coverSource = null;
  let objectUrl = null;
  let imageSuggestion = null;
  let categoryEdited = false;
  const categoryRules = [
    ['Chaveiros', /\b(chaveiros?|key[ -]?(chains?|rings?|fobs?))\b/],
    ['Religiosos', /\b(rosarios?|rosar(y|ies)|tercos?|crucifixos?|crucifix(es)?|presepios?|nativity|nossa senhora|our lady|virgem maria|virgin mary|imagem sacra|sagrado coracao|sao jose|sao miguel|jesus|saint statue)\b/],
    ['Academia', /\b(anilhas?|halter(es)?|dumbbells?|kettlebells?|weight plates?)\b/],
    ['Canecas', /\b(canecas?|mugs?)\b/],
    ['Suportes', /\b(suportes?|stands?|mounts?)\b/],
    ['Brinquedos', /\b(brinquedos?|toys?|fidget|puzzles?|quebra cabeca)\b/],
    ['Colecionáveis', /\b(colecionave(is|l)|collectibles?|action figures?)\b/],
    ['Decoração', /\b(decoracao|decor|enfeites?|ornaments?)\b/]
  ];
  const say = (message, type = '') => { $('feedback').textContent = message; $('feedback').className = 'feedback ' + type; };
  const cleanUrl = value => {
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:' || u.username || u.password) return '';
      u.searchParams.delete('appSharePlatform');
      return u.toString();
    } catch { return ''; }
  };
  function findUrl(text) {
    const match = String(text || '').match(/https:\/\/[^\s<>"']+/i);
    return match ? cleanUrl(match[0].replace(/[),.;]+$/, '')) : '';
  }
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./,''); } catch { return ''; } }
  function suggestFromText() {
    const link = cleanUrl($('sourceUrl').value);
    const slug = link ? new URL(link).pathname : '';
    const title = $('title').value.trim();
    for (const input of [title, slug]) {
      let words = input;
      try { words = decodeURIComponent(input); } catch { /* Use the original text. */ }
      words = words.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_]/g, ' ');
      const matches = categoryRules.filter(([, rule]) => rule.test(words)).map(([category]) => category);
      const specific = matches.filter(category => !['Suportes', 'Brinquedos', 'Decoração'].includes(category));
      if (specific.length === 1) return specific[0];
      if (matches.length) return matches.length === 1 ? matches[0] : '';
    }
    return '';
  }
  function updateCategoryAdvice() {
    const field = $('category');
    const advice = $('categoryAdvice');
    const apply = $('applyCategory');
    const title = $('title').value.trim();
    const visual = imageSuggestion?.file === sharedImage && imageSuggestion.title === title ? imageSuggestion : null;
    const suggestion = visual?.category || suggestFromText();
    if (!categoryEdited) field.value = suggestion || '';
    const conflict = suggestion && field.value && field.value !== suggestion;
    advice.textContent = conflict
      ? 'Expressinho sugere ' + suggestion + ' ' + (visual?.category ? 'pela imagem' : 'pelo título ou link') + '. Você escolheu ' + field.value + '.'
      : suggestion
        ? 'Expressinho sugere ' + suggestion + ' ' + (visual?.category ? 'pela imagem.' : 'pelo título ou link.')
        : visual ? 'O Expressinho não identificou uma categoria pela imagem. Escolha uma categoria para o modelo.' : '';
    apply.textContent = 'Usar ' + (suggestion || '');
    apply.hidden = !suggestion || field.value === suggestion;
    advice.hidden = !advice.textContent;
    $('analyzeCategory').hidden = !sharedImage;
  }
  async function categoryImage(file) {
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement('canvas');
      for (const limit of [480, 320, 240, 160]) {
        const scale = Math.min(1, limit / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        if (Math.min(canvas.width, canvas.height) < 10) break;
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL('image/jpeg', 0.65);
        if (image.length <= 18000) return image;
      }
    } finally {
      bitmap.close();
    }
    throw new Error('Não foi possível preparar a imagem. Tente ajustar a capa primeiro.');
  }
  async function analyzeCategory() {
    const file = sharedImage;
    if (!file) return;
    if (!token()) return promptSignIn();
    const title = $('title').value.trim();
    const button = $('analyzeCategory');
    button.disabled = true;
    button.textContent = 'Analisando…';
    try {
      const image = await categoryImage(file);
      const res = await fetch(endpoint('/api/category-suggestion'), {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, image })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Falha na análise');
      if (sharedImage !== file || $('title').value.trim() !== title) return;
      const options = Array.from($('category').options);
      const category = options.some(option => option.value === result.category) ? result.category : null;
      imageSuggestion = { file, title, category };
      updateCategoryAdvice();
    } catch {
      say('A análise da imagem falhou. Confira a conexão ou escolha a categoria manualmente.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Analisar imagem';
    }
  }
  function parseShared(data) {
    const url = cleanUrl(data.url) || findUrl(data.text);
    if (url) $('sourceUrl').value = url;
    const title = String(data.title || '').trim();
    if (title) $('title').value = title;
    else if (data.text) {
      const withoutUrl = String(data.text).replace(/https:\/\/[^\s<>"']+/ig,'').trim();
      if (withoutUrl) $('title').value = withoutUrl.slice(0,180);
    }
    updateCategoryAdvice();
    if (data.images && data.images.length) selectImage(data.images[0]);
    if (url) {
      $('shareNote').textContent = 'Link recebido do compartilhamento. Confira o endereço e complete os dados.';
      $('draftStatus').textContent = 'Link recebido';
      say('Link recebido. Agora revise o nome, o preço e a categoria.');
    } else if (title) {
      $('shareNote').textContent = 'Texto recebido. Cole ou informe o link original do modelo.';
      say('Recebemos o compartilhamento, mas não encontramos um link HTTPS.');
    }
  }
  function selectImage(file) {
    originalImage = sharedImage = file;
    closeCover();
    renderSelectedImage();
  }
  function renderSelectedImage() {
    updateCategoryAdvice();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = sharedImage ? URL.createObjectURL(sharedImage) : null;
    $('filePreview').hidden = $('editCover').hidden = !sharedImage;
    if (!sharedImage) {
      $('filePreviewImage').removeAttribute('src');
      return;
    }
    $('filePreviewImage').src = objectUrl;
    $('filePreviewName').textContent = sharedImage.name || 'Imagem compartilhada';
  }
  function closeCover() {
    coverSource?.close();
    coverSource = null;
    $('coverEditor').hidden = true;
    $('editCover').setAttribute('aria-expanded', 'false');
    $('coverStatus').textContent = '';
  }
  function coverCrop() {
    const zoom = Number($('coverZoom').value);
    const width = Math.min(coverSource.width, coverSource.height * 4 / 3) / zoom;
    const height = width * 3 / 4;
    const x = (coverSource.width - width) * Number($('coverX').value) / 100;
    const y = (coverSource.height - height) * Number($('coverY').value) / 100;
    return [x, y, width, height];
  }
  function drawCover(canvas, crop) {
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(coverSource, ...crop, 0, 0, canvas.width, canvas.height);
  }
  function updateCoverPreview() {
    if (coverSource) drawCover($('coverCropPreview'), coverCrop());
  }
  async function openCover() {
    const file = originalImage;
    const button = $('editCover');
    button.disabled = true;
    try {
      const bitmap = await createImageBitmap(file);
      if (file !== originalImage) { bitmap.close(); return; }
      closeCover();
      coverSource = bitmap;
      $('coverZoom').value = '1';
      $('coverX').value = $('coverY').value = '50';
      updateCoverPreview();
      $('coverEditor').hidden = false;
      button.setAttribute('aria-expanded', 'true');
      $('coverZoom').focus();
    } catch {
      say('Não foi possível abrir esta imagem. Tente um print em PNG ou JPG.', 'error');
    } finally {
      button.disabled = false;
    }
  }
  async function applyCover() {
    if (!coverSource) return;
    const source = coverSource;
    const crop = coverCrop();
    const canvas = document.createElement('canvas');
    const units = Math.max(1, Math.min(240, Math.floor(crop[2] / 4)));
    canvas.width = units * 4;
    canvas.height = units * 3;
    const button = $('applyCover');
    button.disabled = true;
    try {
      drawCover(canvas, crop);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (coverSource !== source) return;
      if (!blob) throw new Error('Falha ao gerar capa');
      sharedImage = new File([blob], 'capa-expressarte.jpg', {type: 'image/jpeg'});
      renderSelectedImage();
      closeCover();
      $('editCover').focus();
      say('Capa pronta para enviar.', 'success');
    } catch {
      if (coverSource === source) $('coverStatus').textContent = 'Não foi possível gerar a capa. Tente de novo.';
    } finally {
      button.disabled = false;
    }
  }
  function setConnectionStatus(text, ok = false) {
    $('connectionStatus').innerHTML = '<i></i> ' + text;
    $('connectionStatus').style.color = ok ? '#17864c' : '';
    $('connectionStatus').querySelector('i').style.background = ok ? '#17864c' : '#c28b55';
  }
  const adminKey = 'expressarte_admin_connection';
  let adminRevision = 0;
  let adminConfigured = null;
  const setupRequested = new URLSearchParams(location.search).get('configurar') === 'admin';
  function endpoint(path) {
    const base = $('apiBase').value.trim().replace(/\/+$/, '').replace(/\/api$/, '');
    return new URL(base + path, location.origin).toString();
  }
  function savedAdmin(storage) {
    try {
      const credentials = JSON.parse(storage.getItem(adminKey) || 'null');
      return credentials?.endpoint === endpoint('/api/imports') && typeof credentials.token === 'string'
        ? credentials.token : '';
    } catch { return ''; }
  }
  const token = () => savedAdmin(sessionStorage) || savedAdmin(localStorage);
  function promptSignIn() {
    $('secureConnection').open = true;
    if (setupRequested && adminConfigured !== true) {
      $('adminSetup').open = true;
      $('setupEmail').focus();
      say('Crie seu usuário administrador para continuar.', 'error');
    } else {
      $('adminEmail').focus();
      say('Entre em Conexão segura para continuar.', 'error');
    }
  }
  function updateAdminControls() {
    const credential = token();
    const signedIn = credential.startsWith('session_');
    $('signOut').hidden = !credential;
    const showSetup = setupRequested && adminConfigured !== true && !signedIn;
    $('adminLogin').hidden = signedIn || showSetup;
    $('adminSetup').hidden = !showSetup;
    if (showSetup) {
      $('secureConnection').open = true;
      $('adminSetup').open = true;
    }
    $('rememberAdmin').checked = Boolean(savedAdmin(localStorage));
    $('adminSessionStatus').textContent = $('rememberAdmin').checked
      ? 'Sessão lembrada neste aparelho.'
      : token() ? 'Sessão ativa até fechar o app.' : 'Use a opção de lembrar em um aparelho de uso pessoal.';
  }
  async function checkAdminSetup() {
    if (!setupRequested) return;
    try {
      const target = endpoint('/api/admin/status');
      const response = await fetch(target, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (target !== endpoint('/api/admin/status') || typeof data.configured !== 'boolean') return;
      adminConfigured = data.configured;
      updateAdminControls();
      if (adminConfigured && !token().startsWith('session_')) {
        $('secureConnection').open = true;
        $('adminSessionStatus').textContent = 'A conta administrativa já foi criada. Entre com seu e-mail e senha.';
      } else if (!adminConfigured) {
        $('adminSessionStatus').textContent = 'Crie sua conta com a chave administrativa atual. Depois, use seu e-mail e senha para entrar.';
      }
    } catch { /* The forms remain available if the status request fails. */ }
  }
  async function signIn(event, setup = false) {
    event.preventDefault();
    const button = $(setup ? 'createAdmin' : 'saveConnection');
    const password = $(setup ? 'setupPassword' : 'adminPassword');
    const revision = ++adminRevision;
    button.disabled = true;
    try {
      const target = endpoint('/api/imports');
      const api = $('apiBase').value.trim();
      const remember = $(setup ? 'rememberSetup' : 'rememberAdmin').checked;
      if (!/^https:\/\//i.test(target)) throw new Error('Informe um endereço HTTPS para a API.');
      const headers = { 'Content-Type': 'application/json' };
      if (setup) {
        const key = $('adminToken').value.trim() || token();
        if (!key) throw new Error('Informe a chave administrativa atual.');
        headers.Authorization = 'Bearer ' + key;
      }
      const response = await fetch(endpoint('/api/admin/' + (setup ? 'setup' : 'login')), {
        method: 'POST', headers, cache: 'no-store', redirect: 'error',
        body: JSON.stringify({ email: $(setup ? 'setupEmail' : 'adminEmail').value, password: password.value, remember })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !/^session_[0-9a-f]{64}$/.test(data?.token || '')) {
        if (setup && response.status === 409) await checkAdminSetup();
        throw new Error(data?.error || 'Não foi possível entrar no catálogo.');
      }
      if (revision !== adminRevision) return;
      if (target !== endpoint('/api/imports')) throw new Error('O endereço mudou. Entre novamente.');
      adminConfigured = true;
      const credentials = JSON.stringify({ endpoint: target, token: data.token });
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(adminKey, credentials);
      (remember ? sessionStorage : localStorage).removeItem(adminKey);
      sessionStorage.removeItem('expressarte_admin_token');
      localStorage.setItem('expressarte_api_base', api);
      $('adminToken').value = '';
      password.value = '';
      updateAdminControls();
      say(remember ? 'Sessão lembrada neste aparelho.' : 'Sessão iniciada.', 'success');
      await loadQueue();
    } catch (error) {
      say(error.message || 'Não foi possível entrar.', 'error');
    } finally {
      button.disabled = false;
    }
  }
  function signOut() {
    const credential = token();
    if (credential.startsWith('session_')) {
      fetch(endpoint('/api/admin/logout'), {
        method: 'POST', headers: { Authorization: 'Bearer ' + credential }, redirect: 'error', keepalive: true
      }).catch(() => {});
    }
    adminRevision++;
    localStorage.removeItem(adminKey);
    sessionStorage.removeItem(adminKey);
    sessionStorage.removeItem('expressarte_admin_token');
    $('adminToken').value = '';
    updateAdminControls();
    loadQueue();
    say('Você saiu do Importador.');
  }
  async function checkHealth() {
    try {
      const res = await fetch(endpoint('/api/health'), {
        cache: 'no-store'
      });
      const data = await res.json().catch(() => null);
      // Do not treat a Pages SPA fallback (HTML with HTTP 200) as a healthy API.
      if (!res.ok || !data || data.service !== 'expressarte-import' || data.ok !== true || data.databaseConfigured !== true) {
        throw new Error('API ou banco D1 ainda não configurado');
      }
      setConnectionStatus(data.imageStorageConfigured ? 'API e imagens conectadas' : 'API conectada · R2 pendente', true);
    } catch {
      setConnectionStatus('API aguardando configuração');
    }
  }
  async function loadShared() {
    if (!('indexedDB' in window)) return;
    return new Promise(resolve => {
      const req = indexedDB.open('expressarte-share-v1', 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('shares')) req.result.createObjectStore('shares', { keyPath: 'id' }); };
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction('shares','readonly'), all = tx.objectStore('shares').getAll();
        all.onsuccess = () => {
          const list = all.result || [];
          if (!list.length) { db.close(); resolve(); return; }
          const latest = list.sort((a,b) => b.createdAt - a.createdAt)[0];
          parseShared(latest);
          const del = db.transaction('shares','readwrite'); del.objectStore('shares').delete(latest.id);
          del.oncomplete = () => db.close(); resolve();
        };
        all.onerror = () => { db.close(); resolve(); };
      };
      req.onerror = () => resolve();
    });
  }
  function clearModelPreview() {
    const card = $('previewCard');
    card.hidden = true;
    card.dataset.sourceUrl = card.dataset.imageUrl = card.dataset.licenseName = '';
    $('coverPreview').removeAttribute('src');
  }
  async function fetchPreview() {
    const url = cleanUrl($('sourceUrl').value);
    if (!url) return say('Informe um link HTTPS válido.', 'error');
    $('sourceUrl').value = url;
    if (!token()) return promptSignIn();
    clearModelPreview();
    $('previewButton').disabled = true; $('previewButton').textContent = 'Buscando…';
    try {
      const res = await fetch(endpoint('/api/preview?url=' + encodeURIComponent(url)), { headers: { Authorization: 'Bearer ' + token() } });
      const data = await res.json();
      if (cleanUrl($('sourceUrl').value) !== url) return;
      if (!res.ok) throw new Error(data.error || 'Não foi possível consultar a página.');
      if (data.title && !$('title').value.trim()) $('title').value = data.title;
      updateCategoryAdvice();
      if (data.author && !$('author').value.trim()) $('author').value = data.author;
      if (!data.title && !data.author && !data.imageUrl && !data.licenseName) {
        return say('A página não forneceu dados do modelo. Preencha os campos manualmente.', 'error');
      }
      const card = $('previewCard');
      card.dataset.sourceUrl = url;
      card.dataset.imageUrl = data.imageUrl || '';
      card.dataset.licenseName = data.licenseName || '';
      const cover = $('coverPreview');
      cover.hidden = !data.imageUrl;
      if (data.imageUrl) cover.src = data.imageUrl;
      $('previewTitle').textContent = data.title || $('title').value || 'Dados da página original';
      $('previewMeta').textContent = [data.author, data.licenseName].filter(Boolean).join(' · ');
      card.hidden = false;
      say(data.imageUrl ? 'Dados encontrados. Confira antes de enviar.' : 'Dados encontrados sem capa. Você pode selecionar uma imagem.');
    } catch (error) { say(error.message || 'Falha ao buscar dados.', 'error'); }
    finally { $('previewButton').disabled = false; $('previewButton').textContent = 'Buscar dados'; }
  }
  function parsePrice(value) {
    let normalized = String(value).trim().replace(/R\$/gi, '').replace(/\s/g, '');
    if (normalized.includes(',')) normalized = normalized.replace(/\./g, '').replace(',', '.');
    else if ((normalized.match(/\./g) || []).length > 1) normalized = normalized.replace(/\./g, '');
    if (!normalized) return null;
    const n = Number(normalized);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
  }
  const calculatorFields = ['calcWeight', 'calcFilament', 'calcHours', 'calcMinutes', 'calcMachine', 'calcExtras', 'calcMargin'];
  const calculatorRates = ['calcFilament', 'calcMachine', 'calcMargin'];
  const calculatorStorageKey = 'expressarte_calculator_rates';
  const formatMoney = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function readCalculatorNumber(id) {
    const text = $(id).value.trim();
    if (!text) return null;
    if (!/^\d+(?:[,.]\d+)?$/.test(text)) return NaN;
    return Number(text.replace(',', '.'));
  }
  function estimatePrice() {
    const [grams, filament, hours, minutes, machine, extras, margin] = calculatorFields.map(readCalculatorNumber);
    if ([grams, filament, hours, minutes, machine, extras, margin].some(Number.isNaN)) {
      return { message: 'Use números positivos ou zero. Para decimais, use vírgula ou ponto.' };
    }
    if (grams === null || filament === null) return { message: 'Informe o peso e o preço do filamento para começar.' };
    if (!Number.isInteger(hours ?? 0) || !Number.isInteger(minutes ?? 0) || minutes >= 60) {
      return { message: 'Use horas inteiras e minutos de 0 a 59.' };
    }
    const time = (hours ?? 0) + (minutes ?? 0) / 60;
    if (machine > 0 && time === 0) return { message: 'Informe o tempo de impressão para incluir o custo da impressora.' };
    if (margin >= 100) return { message: 'Informe uma margem menor que 100%.' };
    const cost = (grams / 1000) * filament + time * (machine ?? 0) + (extras ?? 0);
    const priceCents = Math.round((cost / (1 - (margin ?? 0) / 100)) * 100);
    if (!Number.isSafeInteger(priceCents) || priceCents > 100000000) return { message: 'Confira os valores. O preço ultrapassou o limite do catálogo.' };
    return { cost, priceCents };
  }
  function updatePriceCalculator() {
    const { message, cost, priceCents } = estimatePrice();
    $('calcMessage').textContent = message || '';
    $('calcMessage').hidden = !message;
    $('calcTotals').hidden = Boolean(message);
    $('useCalculatedPrice').disabled = Boolean(message);
    if (message) return;
    $('calcCost').textContent = formatMoney.format(cost);
    $('calcPrice').textContent = formatMoney.format(priceCents / 100);
  }
  function restoreCalculatorRates() {
    try {
      const saved = JSON.parse(localStorage.getItem(calculatorStorageKey) || '{}');
      for (const id of calculatorRates) if (typeof saved?.[id] === 'string') $(id).value = saved[id];
    } catch { /* Storage is optional. */ }
  }
  function useCalculatedPrice() {
    const { priceCents } = estimatePrice();
    if (priceCents === undefined) return;
    $('price').value = (priceCents / 100).toFixed(2).replace('.', ',');
    try {
      const rates = calculatorRates.map(id => [id, $(id).value.trim()]);
      localStorage.setItem(calculatorStorageKey, JSON.stringify(Object.fromEntries(rates)));
    } catch { /* The price is still available in the form. */ }
    $('priceCalculator').open = false;
    $('price').focus();
    say('Preço sugerido preenchido. Você pode ajustá-lo antes de enviar.', 'success');
  }
  async function sendImport() {
    const sourceUrl = cleanUrl($('sourceUrl').value);
    const title = $('title').value.trim();
    const priceCents = parsePrice($('price').value);
    if (!sourceUrl) return say('Informe o link original do modelo.', 'error');
    if (!title) return say('Informe o nome do modelo.', 'error');
    if (Number.isNaN(priceCents)) return say('Confira o preço informado.', 'error');
    if (!token()) return promptSignIn();
    const button = $('sendButton'); button.disabled = true; button.textContent = 'Enviando…';
    try {
      const body = new FormData();
      body.append('sourceUrl', sourceUrl); body.append('sourceSite', hostOf(sourceUrl));
      body.append('title', title); body.append('author', $('author').value.trim());
      body.append('category', $('category').value); body.append('priceCents', priceCents == null ? '' : String(priceCents));
      const preview = $('previewCard').dataset;
      const currentPreview = preview.sourceUrl === sourceUrl ? preview : {};
      body.append('licenseName', currentPreview.licenseName || '');
      const imageUrl = currentPreview.imageUrl || '';
      if (imageUrl) body.append('imageUrl', imageUrl);
      if (sharedImage) body.append('image', sharedImage, sharedImage.name || 'imagem-compartilhada');
      const res = await fetch(endpoint('/api/imports'), { method: 'POST', headers: { Authorization: 'Bearer ' + token() }, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar cadastro.');
      $('draftStatus').textContent = 'Enviado · pendente';
      say('Cadastro enviado! Ele está na fila privada para sua aprovação. Código: ' + data.id, 'success');
      await loadQueue();
    } catch (error) { say(error.message || 'Não foi possível enviar. Verifique a conexão.', 'error'); }
    finally { button.disabled = false; button.textContent = 'Enviar para Express’Arte'; }
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  }
  async function copyProductLink(button) {
    const card = button.closest('.queue-card');
    const link = card.querySelector('.queue-catalog-link');
    const status = card.querySelector('.queue-link-status');
    try {
      await navigator.clipboard.writeText(link.href);
      status.textContent = 'Link copiado. Já pode colar no WhatsApp.';
    } catch {
      status.textContent = 'Abra “Ver no catálogo” e copie o endereço no navegador.';
    }
  }
  async function updateQueueItem(button) {
    const card = button.closest('.queue-card');
    const status = button.dataset.queueAction;
    button.disabled = true;
    try {
      const body = {
        status,
        commercialUseAllowed: Boolean(card.querySelector('[data-commercial]').checked),
        imageUseAllowed: Boolean(card.querySelector('[data-image-rights]').checked)
      };
      const res = await fetch(endpoint('/api/imports/' + encodeURIComponent(card.dataset.id)), {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível atualizar o cadastro.');
      say(status === 'approved' ? 'Produto aprovado. Ele poderá aparecer na vitrine pública.' : 'Produto recusado e mantido fora da vitrine.', 'success');
      await loadQueue();
    } catch (error) {
      say(error.message || 'Falha ao atualizar a fila.', 'error');
      button.disabled = false;
    }
  }
  async function saveQueuePrice(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('price');
    const button = form.querySelector('button');
    const result = form.querySelector('[role="status"]');
    const price = parsePrice(input.value);
    if (Number.isNaN(price) || price > 100000000) {
      result.textContent = 'Confira o valor informado.';
      return;
    }
    if (!token()) return promptSignIn();
    button.disabled = true;
    input.disabled = true;
    result.textContent = 'Salvando…';
    try {
      const id = form.closest('.queue-card').dataset.id;
      const response = await fetch(endpoint('/api/imports/' + encodeURIComponent(id)), {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceCents: price })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o preço.');
      input.value = data.priceCents === null ? '' : (data.priceCents / 100).toFixed(2).replace('.', ',');
      form.parentElement.querySelector('summary').textContent = 'Editar preço · ' +
        (data.priceCents === null ? 'Sob consulta' : formatMoney.format(data.priceCents / 100));
      result.textContent = data.priceCents === null ? 'Preço salvo como sob consulta.' : 'Preço atualizado.';
    } catch (error) {
      result.textContent = error.message || 'Não foi possível salvar o preço.';
    } finally {
      button.disabled = false;
      input.disabled = false;
    }
  }
  async function loadQueue(loadedData) {
    const list = $('queueList');
    const credential = token();
    if (!credential) {
      list.innerHTML = '<div class="queue-empty">Entre em “Conexão segura” para consultar a fila.</div>';
      return;
    }
    list.innerHTML = '<div class="queue-empty">Carregando importações…</div>';
    try {
      let data = loadedData;
      if (!data) {
        const res = await fetch(endpoint('/api/imports'), { headers: { Authorization: 'Bearer ' + credential }, cache: 'no-store' });
        data = await res.json();
        if (token() !== credential) return;
        if (res.status === 401) {
          signOut();
          promptSignIn();
          return;
        }
        if (!res.ok) throw new Error(data.error || 'Falha ao consultar a fila.');
      }
      const items = Array.isArray(data.imports) ? data.imports : [];
      if (!items.length) {
        list.innerHTML = '<div class="queue-empty">Nenhum modelo recebido ainda. Compartilhe um link pelo Bambu Handy para começar.</div>';
        return;
      }
      const statusLabel = { pending: 'AGUARDANDO REVISÃO', approved: 'APROVADO', rejected: 'RECUSADO' };
      list.innerHTML = items.map(item => {
        const image = /^https:\/\//i.test(String(item.image_url || ''))
          ? '<img src="' + escapeHtml(item.image_url) + '" alt="" loading="lazy">'
          : '<div class="queue-image-placeholder">Sem capa</div>';
        const source = /^https:\/\//i.test(String(item.source_url || ''))
          ? '<a class="queue-source" href="' + escapeHtml(item.source_url) + '" target="_blank" rel="noopener noreferrer">Abrir modelo original ↗</a>'
          : '';
        const status = statusLabel[item.status] || 'STATUS DESCONHECIDO';
        const price = Number.isSafeInteger(item.price_cents) ? (item.price_cents / 100).toFixed(2).replace('.', ',') : '';
        const publicUrl = item.status === 'approved' && item.commercial_use_allowed && item.image_use_allowed && /^[0-9a-f-]{36}$/i.test(item.id)
          ? new URL('../#imported-' + item.id, location.href).href : '';
        const share = publicUrl
          ? '<div class="queue-actions queue-share"><a class="secondary-button queue-catalog-link" href="' + escapeHtml(publicUrl) + '" target="_blank" rel="noopener">Ver no catálogo</a>' +
            '<button class="secondary-button" type="button" data-copy-product>Copiar link</button>' +
            '<p class="queue-link-status" role="status"></p></div>'
          : '';
        return '<article class="queue-card" data-id="' + escapeHtml(item.id) + '">' + image +
          '<div class="queue-content"><strong>' + escapeHtml(item.title) + '</strong>' +
          '<div class="queue-meta">' + escapeHtml(item.category || 'Outros') + (item.author ? ' · ' + escapeHtml(item.author) : '') + '</div>' +
          '<span class="queue-status">' + status + '</span><br>' + source + '</div>' +
          '<div class="queue-rights"><label><input type="checkbox" data-commercial ' + (item.commercial_use_allowed ? 'checked' : '') + '> Confirmei que a licença permite uso comercial/impressão para venda.</label>' +
          '<label><input type="checkbox" data-image-rights ' + (item.image_use_allowed ? 'checked' : '') + '> Tenho autorização para exibir esta imagem no catálogo.</label></div>' +
          '<div class="queue-actions"><button class="queue-approve" type="button" data-queue-action="approved">Aprovar</button><button class="queue-reject" type="button" data-queue-action="rejected">Recusar</button></div>' +
          '<details class="queue-price"><summary>Editar preço · ' + (price ? escapeHtml(formatMoney.format(item.price_cents / 100)) : 'Sob consulta') + '</summary>' +
          '<form><label>Preço de venda (R$)<input name="price" inputmode="decimal" maxlength="12" value="' + escapeHtml(price) +
          '" placeholder="Sob consulta"></label><button class="secondary-button" type="submit">Salvar preço</button><p role="status"></p></form></details>' +
          share + '</article>';
      }).join('');
      list.querySelectorAll('[data-queue-action]').forEach(button => button.addEventListener('click', () => updateQueueItem(button)));
      list.querySelectorAll('[data-copy-product]').forEach(button => button.addEventListener('click', () => copyProductLink(button)));
      list.querySelectorAll('.queue-price form').forEach(form => form.addEventListener('submit', saveQueuePrice));
    } catch (error) {
      if (token() === credential) list.innerHTML = '<div class="queue-empty">' + escapeHtml(error.message || 'Não foi possível carregar a fila.') + '</div>';
    }
  }
  $('imageFile').addEventListener('change', event => selectImage(event.target.files[0] || null));
  $('title').addEventListener('input', updateCategoryAdvice);
  $('sourceUrl').addEventListener('input', () => {
    if ($('previewCard').dataset.sourceUrl !== cleanUrl($('sourceUrl').value)) clearModelPreview();
    updateCategoryAdvice();
  });
  $('category').addEventListener('change', () => { categoryEdited = Boolean($('category').value); updateCategoryAdvice(); });
  $('applyCategory').addEventListener('click', () => { categoryEdited = false; updateCategoryAdvice(); });
  $('analyzeCategory').addEventListener('click', analyzeCategory);
  $('removeImage').addEventListener('click', () => { $('imageFile').value = ''; selectImage(null); });
  $('editCover').addEventListener('click', () => coverSource ? closeCover() : openCover());
  $('cancelCover').addEventListener('click', () => { closeCover(); $('editCover').focus(); });
  $('applyCover').addEventListener('click', applyCover);
  ['coverZoom', 'coverX', 'coverY'].forEach(id => $(id).addEventListener('input', updateCoverPreview));
  $('previewButton').addEventListener('click', fetchPreview);
  $('refreshQueue').addEventListener('click', () => loadQueue());
  $('sendButton').addEventListener('click', sendImport);
  restoreCalculatorRates();
  calculatorFields.forEach(id => $(id).addEventListener('input', updatePriceCalculator));
  $('useCalculatedPrice').addEventListener('click', useCalculatedPrice);
  $('adminLogin').addEventListener('submit', event => signIn(event));
  $('adminSetupForm').addEventListener('submit', event => signIn(event, true));
  $('signOut').addEventListener('click', signOut);
  $('apiBase').addEventListener('change', () => {
    adminConfigured = null;
    updateAdminControls();
    checkAdminSetup();
    checkHealth();
    loadQueue();
  });
  window.addEventListener('storage', event => {
    if (event.key !== adminKey && event.key !== null) return;
    updateAdminControls();
    loadQueue();
  });
  $('clearButton').addEventListener('click', () => {
    categoryEdited = false;
    imageSuggestion = null;
    fields.forEach(id => { $(id).value = ''; });
    calculatorFields.forEach(id => { $(id).value = ''; });
    restoreCalculatorRates();
    updatePriceCalculator();
    $('priceCalculator').open = false;
    $('imageFile').value = ''; selectImage(null); clearModelPreview();
    $('draftStatus').textContent = 'Rascunho local'; say('Formulário limpo.');
  });
  $('apiBase').value = localStorage.getItem('expressarte_api_base') || window.EXPRESSARTE_CONFIG?.catalogApiEndpoint || '';
  $('adminToken').value = token() ? '' : sessionStorage.getItem('expressarte_admin_token') || '';
  updateAdminControls();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => setConnectionStatus('Instalação PWA indisponível'));
  loadShared().then(() => { checkAdminSetup(); checkHealth(); if (token()) loadQueue(); });
  if (new URLSearchParams(location.search).has('compartilhado')) history.replaceState({}, '', location.pathname);
})();
