(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = ['sourceUrl','title','author','description','printMinutes','filamentGrams','price','category'];
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
    if (visual?.proposed) advice.textContent = 'Expressinho sugere criar a categoria ' + visual.proposed + '.';
    $('newCategory').textContent = visual?.proposed ? 'Revisar nova categoria' : 'Nova categoria';
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
      imageSuggestion = { file, title, category, proposed: typeof result.suggestedCategory === 'string' ? result.suggestedCategory : '' };
      updateCategoryAdvice();
    } catch {
      say('A análise da imagem falhou. Confira a conexão ou escolha a categoria manualmente.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Analisar imagem';
    }
  }
  function addCategory(name) {
    const select = $('category');
    if (Array.from(select.options).some(option => option.value === name)) return;
    select.add(new Option(name, name));
  }
  async function loadCategories() {
    try {
      const response = await fetch(endpoint('/api/categories'), { cache: 'no-store' });
      if (!response.ok) return;
      const { categories } = await response.json();
      if (Array.isArray(categories)) categories.forEach(addCategory);
    } catch { /* The built-in categories stay available. */ }
  }
  function showCategoryForm(show) {
    $('categoryForm').hidden = !show;
    $('newCategory').setAttribute('aria-expanded', String(show));
    if (show) {
      const proposal = imageSuggestion;
      $('categoryName').value = proposal?.file === sharedImage && proposal.title === $('title').value.trim() ? proposal.proposed || '' : '';
      $('categoryFeedback').textContent = '';
      $('categoryName').focus();
    }
  }
  async function createCategory(event) {
    event.preventDefault();
    if (!token()) return promptSignIn();
    const button = event.currentTarget.querySelector('[type="submit"]');
    const feedback = $('categoryFeedback');
    button.disabled = true;
    feedback.textContent = 'Criando categoria…';
    try {
      $('category').value = await createCategoryByName($('categoryName').value);
      categoryEdited = true;
      imageSuggestion = null;
      updateCategoryAdvice();
      showCategoryForm(false);
      $('category').focus();
      say('Categoria disponível no catálogo.', 'success');
    } catch (error) {
      feedback.textContent = error.message || 'Não foi possível criar a categoria.';
    } finally {
      button.disabled = false;
    }
  }
  async function createCategoryByName(name) {
    const response = await fetch(endpoint('/api/categories'), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const result = await response.json();
    if (!response.ok || typeof result.name !== 'string') throw new Error(result.error || 'Não foi possível criar a categoria.');
    addCategory(result.name);
    return result.name;
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
    } else if (data.images?.length) {
      $('shareNote').textContent = 'Foto recebida. Dê um nome ao produto para cadastrar.';
      say('Foto recebida. Você pode cadastrar o produto sem link.');
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
    const label = button.textContent;
    const password = $(setup ? 'setupPassword' : 'adminPassword');
    const feedback = $('adminFeedback');
    const revision = ++adminRevision;
    feedback.hidden = true;
    button.disabled = true;
    button.textContent = setup ? 'Criando usuário…' : 'Entrando…';
    try {
      const target = endpoint('/api/imports');
      const api = $('apiBase').value.trim();
      const remember = $(setup ? 'rememberSetup' : 'rememberAdmin').checked;
      if (!/^https:\/\//i.test(target)) throw new Error('Informe um endereço HTTPS para a API.');
      const headers = { 'Content-Type': 'application/json' };
      if (setup) {
        const key = $('adminToken').value.trim() || token();
        if (!key) {
          $('adminToken').focus();
          throw new Error('Cole a chave administrativa atual no campo acima e toque em Criar usuário.');
        }
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
      feedback.textContent = error.message || 'Não foi possível entrar.';
      feedback.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = label;
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
    const rawLink = $('sourceUrl').value.trim();
    const sourceUrl = cleanUrl(rawLink);
    const title = $('title').value.trim();
    const priceCents = parsePrice($('price').value);
    const printMinutes = parsePrintTime($('printMinutes').value.trim());
    const filamentGrams = parseFilamentWeight($('filamentGrams').value.trim());
    if (rawLink && !sourceUrl) return say('Confira o link HTTPS informado.', 'error');
    if (!sourceUrl && !sharedImage) return say('Adicione um link ou escolha uma foto do produto.', 'error');
    if (!title) return say('Informe o nome do modelo.', 'error');
    if (Number.isNaN(priceCents)) return say('Confira o preço informado.', 'error');
    const measurementError = checkMeasurements(printMinutes, filamentGrams);
    if (measurementError) return say(measurementError, 'error');
    if (!token()) return promptSignIn();
    const button = $('sendButton'); button.disabled = true; button.textContent = 'Enviando…';
    try {
      const body = new FormData();
      if (sourceUrl) {
        body.append('sourceUrl', sourceUrl);
        body.append('sourceSite', hostOf(sourceUrl));
      }
      body.append('title', title); body.append('author', $('author').value.trim());
      const description = $('description').value.trim();
      if (description) body.append('description', description);
      if (printMinutes !== null || filamentGrams !== null) {
        body.append('details', JSON.stringify({ description, printMinutes, filamentGrams, assembly: '', leadTime: '' }));
      }
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
  async function updateQueueItem(button, inline = false) {
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
      await loadQueue(undefined, inline ? { productId: card.dataset.id, notice: 'Publicado no catálogo. Agora você pode criar uma promoção.' } : undefined);
    } catch (error) {
      if (inline) throw error;
      say(error.message || 'Falha ao atualizar a fila.', 'error');
      button.disabled = false;
    }
  }
  async function deleteQueueProduct(button) {
    const card = button.closest('.queue-card');
    const title = card.querySelector('.queue-title').textContent;
    if (!window.confirm('Excluir “' + title + '” do catálogo e do Importador? As promoções desse produto também serão removidas.')) return;
    const notice = $('queueNotice');
    notice.textContent = '';
    button.disabled = true;
    try {
      const response = await fetch(endpoint('/api/admin/products/' + encodeURIComponent(card.dataset.id)), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token() }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível excluir o produto.');
      card.remove();
      notice.textContent = 'Produto excluído do catálogo e do Importador.';
      await loadQueue();
      $('refreshQueue').focus();
    } catch (error) {
      const status = card.querySelector('.delete-product-status');
      status.textContent = error.message || 'Não foi possível excluir o produto.';
      button.disabled = false;
    }
  }
  const detailFields = [
    ['description', 'Descrição do produto', 1200],
    ['printMinutes', 'Tempo de impressão', 30],
    ['filamentGrams', 'Filamento consumido (g)', 20],
    ['leadTime', 'Prazo de produção', 100],
    ['assembly', 'Como montar ou usar', 1600]
  ];
  const gramsFormat = new Intl.NumberFormat('pt-BR', { useGrouping: 'always', maximumFractionDigits: 2 });

  function formatPrintTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return [hours && hours + ' h', remainder && remainder + ' min'].filter(Boolean).join(' ');
  }

  function parsePrintTime(value) {
    if (!value) return null;
    const minutesOnly = /^(\d+)\s*(?:m|min(?:uto)?s?)?$/i.exec(value);
    const time = /^(\d+)\s*(?:h|horas?)(?:\s*(?:e\s+)?(\d+)\s*(?:m|min(?:uto)?s?)?)?$/i.exec(value);
    const minutes = minutesOnly ? Number(minutesOnly[1]) : time ? Number(time[1]) * 60 + Number(time[2] || 0) : NaN;
    return Number.isSafeInteger(minutes) && minutes > 0 && minutes <= 100000 ? minutes : NaN;
  }

  function parseFilamentWeight(value) {
    if (!value) return null;
    const weight = /^(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)\s*(kg|g)?$/i.exec(value);
    if (!weight) return NaN;
    const amount = weight[1];
    const normalized = /^\d{1,3}(?:\.\d{3})+(?:,|$)/.test(amount) ? amount.replaceAll('.', '') : amount;
    const grams = Number(normalized.replace(',', '.')) * (weight[2]?.toLowerCase() === 'kg' ? 1000 : 1);
    return grams > 0 && grams <= 100000 ? Math.round(grams * 100) / 100 : NaN;
  }

  function checkMeasurements(printMinutes, filamentGrams) {
    if (Number.isNaN(printMinutes)) return 'Confira o tempo de impressão. Use um valor como 1h43min ou 103 min.';
    if (Number.isNaN(filamentGrams)) return 'Confira o peso do filamento. Use um valor como 70,04 g ou 1.150 g.';
    return '';
  }

  function renderProductDetailFields(item) {
    const details = JSON.parse(item.details_json || '{}');
    return '<fieldset class="edit-product-details"><legend>Detalhes do produto</legend>' + detailFields.map(([name, label, limit]) => {
      let value = details[name] ?? '';
      if (name === 'printMinutes' && value) value = formatPrintTime(value);
      if (name === 'filamentGrams' && value) value = gramsFormat.format(value);
      value = escapeHtml(String(value));
      const attrs = ' name="' + name + '" maxlength="' + limit + '"';
      if (name === 'description' || name === 'assembly') {
        return '<label>' + label + '<textarea' + attrs + ' rows="3">' + value + '</textarea></label>';
      }
      const examples = { printMinutes: 'Ex.: 1h43min', filamentGrams: 'Ex.: 70,04 g ou 1.150 g', leadTime: 'Ex.: até 3 dias úteis' };
      return '<label>' + label + '<input' + attrs + ' value="' + value + '" placeholder="' + examples[name] + '"></label>';
    }).join('') + '</fieldset>';
  }
  async function saveProductEdit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('price');
    const photo = form.elements.namedItem('photo');
    const rights = form.elements.namedItem('photoRights');
    const category = form.elements.namedItem('category');
    const newCategory = form.elements.namedItem('newCategory');
    const card = form.closest('.queue-card');
    const publish = event.submitter?.name === 'publish';
    const button = event.submitter || form.querySelector('button');
    const result = form.querySelector('[role="status"]');
    const price = parsePrice(input.value);
    const details = Object.fromEntries(detailFields.map(([name]) => [name, form.elements.namedItem(name).value.trim()]));
    details.printMinutes = parsePrintTime(details.printMinutes);
    details.filamentGrams = parseFilamentWeight(details.filamentGrams);
    const measurementError = checkMeasurements(details.printMinutes, details.filamentGrams);
    if (measurementError) {
      result.textContent = measurementError;
      return;
    }
    if (Number.isNaN(price) || price > 100000000 || (price === null && card.dataset.builtIn === 'true')) {
      result.textContent = 'Confira o valor informado.';
      return;
    }
    const file = photo.files[0];
    if (file && !rights.checked) {
      result.textContent = 'Confirme a autorização de uso da foto.';
      return;
    }
    if (publish && (!card.querySelector('[data-commercial]').checked || !card.querySelector('[data-image-rights]').checked)) {
      result.textContent = 'Confirme as duas autorizações acima para enviar ao catálogo.';
      return;
    }
    if (!token()) return promptSignIn();
    const fields = Array.from(form.elements);
    fields.forEach(field => { field.disabled = true; });
    result.textContent = 'Salvando…';
    try {
      const body = new FormData();
      body.append('priceCents', price === null ? '' : String(price));
      body.append('details', JSON.stringify(details));
      if (category && category.value !== category.dataset.saved) {
        const name = category.value || await createCategoryByName(newCategory.value);
        if (!Array.from(category.options).some(option => option.value === name)) category.add(new Option(name, name));
        category.value = name;
        body.append('category', name);
      }
      if (file) {
        body.append('image', file);
        body.append('imageRights', 'yes');
      }
      const response = await fetch(endpoint('/api/admin/products/' + encodeURIComponent(card.dataset.id)), {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token() },
        body
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o produto.');
      if (category && data.category) {
        category.dataset.saved = data.category;
        form.querySelector('.edit-category-name').hidden = true;
        newCategory.required = false;
        card.querySelector('.queue-category').textContent = data.category;
      }
      input.value = data.priceCents === null ? '' : (data.priceCents / 100).toFixed(2).replace('.', ',');
      form.elements.namedItem('printMinutes').value = formatPrintTime(details.printMinutes);
      form.elements.namedItem('filamentGrams').value = details.filamentGrams === null ? '' : gramsFormat.format(details.filamentGrams);
      form.parentElement.querySelector('summary').textContent = 'Editar produto · ' +
        (data.priceCents === null ? 'Sob consulta' : formatMoney.format(data.priceCents / 100));
      if (file) {
        const image = document.createElement('img');
        image.src = data.imageUrl;
        image.alt = '';
        card.firstElementChild.replaceWith(image);
      }
      photo.value = '';
      rights.checked = false;
      form.querySelector('.edit-photo-name').textContent = '';
      result.textContent = 'Alterações salvas.';
      if (publish) await updateQueueItem(button, true);
    } catch (error) {
      result.textContent = error.message || 'Não foi possível salvar o produto.';
    } finally {
      fields.forEach(field => { field.disabled = false; });
    }
  }
  function renderPromotionForms(product, promotions) {
    return ['day', 'week'].map(slot => {
      const current = promotions.find(item => item.slot === slot && item.product_id === product.id);
      return '<details class="promotion-editor" data-slot="' + slot + '"><summary>Promoção ' + (slot === 'day' ? 'do dia' : 'da semana') +
        (current?.expires_at > Date.now() ? ' · Ativa' : '') + '</summary>' +
        promotionForm(slot, current, product, promotions) + '</details>';
    }).join('');
  }
  const promotionThemes = window.EXPRESSARTE_CONFIG?.promotionThemes || { default: 'Padrão' };

  function promotionForm(slot, current, product, offers) {
      const names = [...new Set(offers.filter(offer => offer.slot === slot && offer.expires_at > Date.now()).map(offer => offer.campaign).filter(Boolean))];
      const theme = Object.hasOwn(promotionThemes, current?.theme) ? current.theme : 'default';
      const options = Object.entries(promotionThemes).map(([key, label]) =>
        '<option value="' + key + '"' + (key === theme ? ' selected' : '') + '>' + escapeHtml(label) + '</option>').join('');
      return '<form data-promotion="' + slot + '"><input type="hidden" name="productId" value="' + escapeHtml(product.id) + '">' +
        '<label>Campanha (opcional)<input name="campaign" maxlength="60" placeholder="Ex.: Natal" value="' +
        escapeHtml(current?.campaign ?? (names.length === 1 ? names[0] : '')) + '"></label>' +
        '<label>Tema da campanha<select name="theme">' + options + '</select></label>' +
        '<label>Preço promocional (R$)<input name="promotionPrice" inputmode="decimal" maxlength="12" value="' +
        (current ? (current.price_cents / 100).toFixed(2).replace('.', ',') : '') +
        '"></label><div class="promotion-preview promotion-theme" data-theme="' + theme + '">' +
        '<small>Prévia visual · <span data-preview-campaign></span></small><strong>' + escapeHtml(product.title) + '</strong>' +
        '<span class="promotion-preview-price" data-preview-price hidden></span></div>' +
        '<label>Foto da promoção (opcional)<input name="promotionPhoto" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></label>' +
        '<label class="edit-photo-rights"><input name="promotionRights" type="checkbox"> Tenho autorização para usar esta foto</label>' +
        '<div class="category-actions"><button class="secondary-button" type="submit">Enviar pra promoção</button>' +
        (current ? '<button class="text-button" type="submit" name="remove" formnovalidate>Remover oferta</button>' : '') +
        '</div><p class="hint" role="status">' +
        (current ? (product && current.expires_at > Date.now() ? 'Ativa até ' + escapeHtml(formatPromotionDate(current.expires_at)) : 'Oferta inativa.')
          : 'Duração: ' + (slot === 'day' ? '24 horas.' : '7 dias.')) + '</p></form>';
  }
  function updatePromotionPreview(form) {
    const { theme, campaign, promotionPrice } = form.elements;
    const preview = form.querySelector('.promotion-preview');
    preview.dataset.theme = theme.value;
    preview.querySelector('[data-preview-campaign]').textContent = campaign.value.trim() || promotionThemes[theme.value];
    const price = parsePrice(promotionPrice.value);
    const priceLabel = preview.querySelector('[data-preview-price]');
    priceLabel.hidden = !Number.isSafeInteger(price) || price <= 0;
    priceLabel.textContent = priceLabel.hidden ? '' : formatMoney.format(price / 100);
  }
  function formatPromotionDate(timestamp) {
    return new Date(timestamp).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'});
  }
  async function savePromotion(event) {
    event.preventDefault();
    if (!token()) return promptSignIn();
    const form = event.currentTarget;
    const fields = form.elements;
    const id = fields.namedItem('productId').value;
    const remove = event.submitter?.name === 'remove';
    const price = parsePrice(fields.namedItem('promotionPrice').value);
    const photo = fields.namedItem('promotionPhoto');
    const file = photo.files[0];
    const rights = fields.namedItem('promotionRights');
    const status = form.querySelector('[role="status"]');
    if (!remove && (!Number.isSafeInteger(price) || price <= 0)) {
      status.textContent = 'Informe um preço promocional válido.';
      return;
    }
    if (!remove && file && !rights.checked) {
      status.textContent = 'Confirme a autorização de uso da foto.';
      return;
    }
    Array.from(fields).forEach(field => { field.disabled = true; });
    status.textContent = 'Salvando…';
    try {
      const body = new FormData();
      body.set('productId', id);
      if (remove) {
        body.set('remove', 'yes');
      } else {
        body.set('priceCents', String(price));
        body.set('campaign', fields.namedItem('campaign').value.trim());
        body.set('theme', fields.namedItem('theme').value);
        if (file) { body.set('image', file); body.set('imageRights', 'yes'); }
      }
      const response = await fetch(endpoint('/api/admin/promotions/' + form.dataset.promotion), {
        method: 'PATCH', headers: { Authorization: 'Bearer ' + token() }, body
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar a promoção.');
      if (!remove && data.promotion?.theme === undefined && fields.namedItem('theme').value !== 'default') {
        throw new Error('O tema ainda não foi confirmado pela API. Atualize a fila antes de tentar novamente.');
      }
      const notice = data.promotion ? 'Promoção ativa até ' + formatPromotionDate(data.promotion.expires_at) + '.' : 'Oferta removida da vitrine.';
      await loadQueue(undefined, { productId: id, slot: form.dataset.promotion, notice });
    } catch (error) {
      status.textContent = error.message;
    } finally {
      Array.from(fields).forEach(field => { field.disabled = false; });
    }
  }
  async function loadQueue(loadedData, promotionUpdate) {
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
      const edits = new Map((data.overrides || []).map(edit => [edit.id, edit]));
      const removed = new Set(data.removedProductIds || []);
      const originals = (window.EXPRESSARTE_CONFIG?.builtInProducts || []).filter(product => !removed.has(product.id)).map(product => {
        const edit = edits.get(product.id);
        return { id: product.id, title: product.name, category: edit?.category || product.category, builtIn: true,
          price_cents: edit?.price_cents ?? Math.round(product.price * 100),
          image_url: edit?.image_url || new URL('../' + product.cover, location.href).href, details_json: edit?.details_json };
      });
      const imports = Array.isArray(data.imports) ? data.imports : [];
      await loadCategories();
      if (token() !== credential) return;
      const categoryNames = Array.from($('category').options, option => option.value).filter(Boolean);
      const statusLabel = { pending: 'AGUARDANDO REVISÃO', approved: 'APROVADO', rejected: 'RECUSADO' };
      const renderCard = item => {
        const image = /^https:\/\//i.test(String(item.image_url || ''))
          ? '<img src="' + escapeHtml(item.image_url) + '" alt="" loading="lazy">'
          : '<div class="queue-image-placeholder">Sem capa</div>';
        const source = /^https:\/\//i.test(String(item.source_url || ''))
          ? '<a class="queue-source" href="' + escapeHtml(item.source_url) + '" target="_blank" rel="noopener noreferrer">Abrir modelo original ↗</a>'
          : '';
        const status = statusLabel[item.status] || 'STATUS DESCONHECIDO';
        const price = Number.isSafeInteger(item.price_cents) ? (item.price_cents / 100).toFixed(2).replace('.', ',') : '';
        const currentCategory = item.category || 'Outros';
        const categoryField =
          '<label>Categoria<select name="category" data-saved="' + escapeHtml(currentCategory) + '">' +
          [...new Set([...categoryNames, currentCategory])].map(name => '<option' + (name === currentCategory ? ' selected' : '') + '>' + escapeHtml(name) + '</option>').join('') +
          '<option value="">Criar nova categoria…</option></select></label>' +
          '<label class="edit-category-name" hidden>Nome da nova categoria<input name="newCategory" minlength="2" maxlength="48"></label>';
        const approved = item.status === 'approved' && item.commercial_use_allowed && item.image_use_allowed;
        const publicUrl = approved && /^[0-9a-f-]{36}$/i.test(item.id)
          ? new URL('../#imported-' + item.id, location.href).href : '';
        const share = publicUrl
          ? '<div class="queue-actions queue-share"><a class="secondary-button queue-catalog-link" href="' + escapeHtml(publicUrl) + '" target="_blank" rel="noopener">Ver no catálogo</a>' +
            '<button class="secondary-button" type="button" data-copy-product>Copiar link</button>' +
            '<p class="queue-link-status" role="status"></p></div>'
          : '';
        const review = item.builtIn ? '' :
          '<div class="queue-rights"><label><input type="checkbox" data-commercial ' + (item.commercial_use_allowed ? 'checked' : '') + '> Confirmei que a licença permite uso comercial/impressão para venda.</label>' +
          '<label><input type="checkbox" data-image-rights ' + (item.image_use_allowed ? 'checked' : '') + '> Tenho autorização para exibir esta imagem no catálogo.</label></div>' +
          (approved ? '<div class="queue-actions"><button class="queue-reject" type="button" data-queue-action="rejected">Recusar</button></div>' : '');
        return '<article class="queue-card" data-built-in="' + Boolean(item.builtIn) + '" data-id="' + escapeHtml(item.id) + '">' + image +
          '<div class="queue-content"><strong class="queue-title">' + escapeHtml(item.title) + '</strong>' +
          '<div class="queue-meta"><span class="queue-category">' + escapeHtml(currentCategory) + '</span>' + (item.author ? ' · ' + escapeHtml(item.author) : '') + '</div>' +
          (item.builtIn ? '' : '<span class="queue-status">' + status + '</span><br>' + source) + '</div>' + review +
          '<details class="queue-price"><summary>Editar produto · ' + (price ? escapeHtml(formatMoney.format(item.price_cents / 100)) : 'Sob consulta') + '</summary>' +
          '<form>' + categoryField + '<label>Preço de venda (R$)<input name="price" inputmode="decimal" maxlength="12" value="' + escapeHtml(price) +
          '" placeholder="Sob consulta"></label>' + renderProductDetailFields(item) +
          '<label>Nova foto principal<input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/avif"></label>' +
          '<p class="edit-photo-name"></p><label class="edit-photo-rights"><input type="checkbox" name="photoRights"> Tenho autorização para usar esta foto</label>' +
          '<div class="category-actions"><button class="secondary-button" type="submit">Salvar alterações</button>' +
          (!item.builtIn && !approved ? '<button class="primary-button" type="submit" name="publish" data-queue-action="approved">Enviar pro catálogo</button>' : '') +
          '</div><p role="status"></p></form>' +
          (approved || item.builtIn ? renderPromotionForms(item, data.promotions || []) : '<p class="hint">Publique o produto no catálogo para colocá-lo em promoção.</p>') +
          '<p class="hint promotion-notice" role="status"></p>' +
          '<div class="queue-actions queue-delete"><button class="queue-reject" type="button" data-delete-product>Excluir produto</button></div>' +
          '<p class="hint delete-product-status" role="status"></p></details>' +
          share + '</article>';
      };
      list.innerHTML = (originals.length ? '<h3 class="queue-group-title">Produtos do catálogo</h3>' + originals.map(renderCard).join('') : '') +
        '<h3 class="queue-group-title">Modelos importados</h3>' +
        (imports.length ? imports.map(renderCard).join('') : '<div class="queue-empty">Nenhum modelo importado ainda.</div>');
      list.querySelectorAll('[data-queue-action="rejected"]').forEach(button => button.addEventListener('click', () => updateQueueItem(button)));
      list.querySelectorAll('[data-delete-product]').forEach(button => button.addEventListener('click', () => deleteQueueProduct(button)));
      list.querySelectorAll('[data-copy-product]').forEach(button => button.addEventListener('click', () => copyProductLink(button)));
      list.querySelectorAll('[data-promotion]').forEach(form => {
        form.addEventListener('submit', savePromotion);
        form.addEventListener('input', event => {
          if (['theme', 'campaign', 'promotionPrice'].includes(event.target.name)) updatePromotionPreview(form);
        });
        updatePromotionPreview(form);
      });
      if (promotionUpdate) {
        const card = Array.from(list.querySelectorAll('.queue-card')).find(item => item.dataset.id === promotionUpdate.productId);
        if (card) {
          const editor = card.querySelector('.queue-price');
          editor.open = true;
          const panel = editor.querySelector('[data-slot="' + promotionUpdate.slot + '"]');
          if (panel) panel.open = true;
          card.querySelector('.promotion-notice').textContent = promotionUpdate.notice;
          (panel || editor).querySelector('summary').focus();
        }
      }
      list.querySelectorAll('.queue-price > form').forEach(form => {
        form.addEventListener('submit', saveProductEdit);
        form.elements.namedItem('category')?.addEventListener('change', event => {
          const creating = !event.target.value;
          form.querySelector('.edit-category-name').hidden = !creating;
          form.elements.namedItem('newCategory').required = creating;
        });
        form.elements.namedItem('photo').addEventListener('change', event => {
          form.elements.namedItem('photoRights').checked = false;
          form.querySelector('.edit-photo-name').textContent = event.target.files[0]?.name || '';
        });
      });
    } catch (error) {
      if (token() === credential) list.innerHTML = '<div class="queue-empty">' + escapeHtml(error.message || 'Não foi possível carregar a fila.') + '</div>';
    }
  }
  $('imageFile').addEventListener('change', event => selectImage(event.target.files[0] || null));
  $('cameraFile').addEventListener('change', event => selectImage(event.target.files[0] || null));
  $('takePhoto').addEventListener('click', () => $('cameraFile').click());
  $('choosePhoto').addEventListener('click', () => $('imageFile').click());
  $('newCategory').addEventListener('click', () => showCategoryForm($('categoryForm').hidden));
  $('cancelCategory').addEventListener('click', () => { showCategoryForm(false); $('newCategory').focus(); });
  $('categoryForm').addEventListener('submit', createCategory);
  $('title').addEventListener('input', updateCategoryAdvice);
  $('sourceUrl').addEventListener('input', () => {
    if ($('previewCard').dataset.sourceUrl !== cleanUrl($('sourceUrl').value)) clearModelPreview();
    updateCategoryAdvice();
  });
  $('category').addEventListener('change', () => { categoryEdited = Boolean($('category').value); updateCategoryAdvice(); });
  $('applyCategory').addEventListener('click', () => { categoryEdited = false; updateCategoryAdvice(); });
  $('analyzeCategory').addEventListener('click', analyzeCategory);
  $('removeImage').addEventListener('click', () => { $('imageFile').value = $('cameraFile').value = ''; selectImage(null); });
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
    $('imageFile').value = $('cameraFile').value = ''; selectImage(null); clearModelPreview();
    showCategoryForm(false);
    $('draftStatus').textContent = 'Rascunho local'; say('Formulário limpo.');
  });
  $('apiBase').value = localStorage.getItem('expressarte_api_base') || window.EXPRESSARTE_CONFIG?.catalogApiEndpoint || '';
  $('adminToken').value = token() ? '' : sessionStorage.getItem('expressarte_admin_token') || '';
  updateAdminControls();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => setConnectionStatus('Instalação PWA indisponível'));
  loadShared().then(() => { checkAdminSetup(); checkHealth(); loadCategories(); if (token()) loadQueue(); });
  if (new URLSearchParams(location.search).has('compartilhado')) history.replaceState({}, '', location.pathname);
})();
