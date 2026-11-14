(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = ['sourceUrl','title','author','price','category'];
  let sharedImage = null;
  let objectUrl = null;
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
  function parseShared(data) {
    const url = cleanUrl(data.url) || findUrl(data.text);
    if (url) $('sourceUrl').value = url;
    const title = String(data.title || '').trim();
    if (title) $('title').value = title;
    else if (data.text) {
      const withoutUrl = String(data.text).replace(/https:\/\/[^\s<>"']+/ig,'').trim();
      if (withoutUrl) $('title').value = withoutUrl.slice(0,180);
    }
    if (data.images && data.images.length) { sharedImage = data.images[0]; showImage(sharedImage); }
    if (url) {
      $('shareNote').textContent = 'Link recebido do compartilhamento. Confira o endereço e complete os dados.';
      $('draftStatus').textContent = 'Link recebido';
      say('Link recebido. Agora revise o nome, o preço e a categoria.');
    } else if (title) {
      $('shareNote').textContent = 'Texto recebido. Cole ou informe o link original do modelo.';
      say('Recebemos o compartilhamento, mas não encontramos um link HTTPS.');
    }
  }
  function showImage(file) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    $('filePreviewImage').src = objectUrl;
    $('filePreviewName').textContent = file.name || 'Imagem compartilhada';
    $('filePreview').hidden = false;
  }
  function setConnectionStatus(text, ok = false) {
    $('connectionStatus').innerHTML = '<i></i> ' + text;
    $('connectionStatus').style.color = ok ? '#17864c' : '';
    $('connectionStatus').querySelector('i').style.background = ok ? '#17864c' : '#c28b55';
  }
  const apiBase = () => $('apiBase').value.trim().replace(/\/$/, '');
  const token = () => $('adminToken').value.trim() || sessionStorage.getItem('expressarte_admin_token') || '';
  function endpoint(path) {
    const base = apiBase();
    return base.startsWith('http') ? new URL(path.replace(/^\//,''), base + '/').toString() : new URL(base + path, location.origin).toString();
  }
  async function checkHealth() {
    try {
      const res = await fetch(endpoint('/api/health'), { headers: token() ? { Authorization: 'Bearer ' + token() } : {} });
      if (!res.ok) throw new Error();
      setConnectionStatus('API Express’Arte conectada', true);
    } catch { setConnectionStatus('API aguardando configuração'); }
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
  async function fetchPreview() {
    const url = cleanUrl($('sourceUrl').value);
    if (!url) return say('Informe um link HTTPS válido.', 'error');
    $('sourceUrl').value = url;
    if (!token()) return say('Configure a chave administrativa na seção “Conexão segura” antes de buscar os dados.', 'error');
    $('previewButton').disabled = true; $('previewButton').textContent = 'Buscando…';
    try {
      const res = await fetch(endpoint('/api/preview?url=' + encodeURIComponent(url)), { headers: { Authorization: 'Bearer ' + token() } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível consultar a página.');
      if (data.title && !$('title').value.trim()) $('title').value = data.title;
      if (data.author && !$('author').value.trim()) $('author').value = data.author;
      if (data.imageUrl) {
        $('coverPreview').src = data.imageUrl;
        $('previewTitle').textContent = data.title || $('title').value || 'Imagem de capa encontrada';
        $('previewMeta').textContent = data.licenseName ? 'Licença identificada: ' + data.licenseName : 'Capa encontrada na página original';
        $('previewCard').hidden = false;
        $('previewCard').dataset.imageUrl = data.imageUrl;
        $('previewCard').dataset.licenseName = data.licenseName || '';
      }
      say(data.imageUrl ? 'Dados encontrados. Confira antes de enviar.' : 'Página consultada, mas não foi possível localizar uma capa. Você pode compartilhar uma imagem separadamente.');
    } catch (error) { say(error.message || 'Falha ao buscar dados.', 'error'); }
    finally { $('previewButton').disabled = false; $('previewButton').textContent = 'Buscar dados'; }
  }
  function parsePrice(value) {
    const normalized = String(value).trim().replace(/\s/g,'').replace(/\./g,'').replace(',','.');
    if (!normalized) return null;
    const n = Number(normalized);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
  }
  async function sendImport() {
    const sourceUrl = cleanUrl($('sourceUrl').value);
    const title = $('title').value.trim();
    const priceCents = parsePrice($('price').value);
    if (!sourceUrl) return say('Informe o link original do modelo.', 'error');
    if (!title) return say('Informe o nome do modelo.', 'error');
    if (Number.isNaN(priceCents)) return say('Confira o preço informado.', 'error');
    if (!token()) return say('Configure a chave administrativa na seção “Conexão segura”.', 'error');
    const button = $('sendButton'); button.disabled = true; button.textContent = 'Enviando…';
    try {
      const body = new FormData();
      body.append('sourceUrl', sourceUrl); body.append('sourceSite', hostOf(sourceUrl));
      body.append('title', title); body.append('author', $('author').value.trim());
      body.append('category', $('category').value); body.append('priceCents', priceCents == null ? '' : String(priceCents));
      body.append('licenseName', $('previewCard').dataset.licenseName || '');
      const imageUrl = $('previewCard').dataset.imageUrl || '';
      if (imageUrl) body.append('imageUrl', imageUrl);
      if (sharedImage) body.append('image', sharedImage, sharedImage.name || 'imagem-compartilhada');
      const res = await fetch(endpoint('/api/imports'), { method: 'POST', headers: { Authorization: 'Bearer ' + token() }, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar cadastro.');
      $('draftStatus').textContent = 'Enviado · pendente';
      say('Cadastro enviado! Ele está na fila privada para sua aprovação. Código: ' + data.id, 'success');
    } catch (error) { say(error.message || 'Não foi possível enviar. Verifique a conexão.', 'error'); }
    finally { button.disabled = false; button.textContent = 'Enviar para Express’Arte'; }
  }
  $('imageFile').addEventListener('change', event => {
    sharedImage = event.target.files && event.target.files[0] || null;
    if (sharedImage) showImage(sharedImage);
  });
  $('removeImage').addEventListener('click', () => { sharedImage = null; $('imageFile').value = ''; $('filePreview').hidden = true; if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = null; });
  $('previewButton').addEventListener('click', fetchPreview);
  $('sendButton').addEventListener('click', sendImport);
  $('saveConnection').addEventListener('click', () => {
    const value = $('adminToken').value.trim();
    if (value) sessionStorage.setItem('expressarte_admin_token', value);
    const api = $('apiBase').value.trim();
    if (api) sessionStorage.setItem('expressarte_api_base', api);
    say('Configuração guardada somente nesta sessão.', 'success'); checkHealth();
  });
  $('clearButton').addEventListener('click', () => {
    fields.forEach(id => { if (id === 'category') $(id).value = 'Outros'; else $(id).value = ''; });
    $('imageFile').value = ''; sharedImage = null; $('filePreview').hidden = true; $('previewCard').hidden = true;
    $('previewCard').dataset.imageUrl = ''; $('draftStatus').textContent = 'Rascunho local'; say('Formulário limpo.');
  });
  $('apiBase').value = sessionStorage.getItem('expressarte_api_base') || '';
  $('adminToken').value = sessionStorage.getItem('expressarte_admin_token') || '';
  $('adminToken').addEventListener('input', checkHealth);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => setConnectionStatus('Instalação PWA indisponível'));
  loadShared().then(checkHealth);
  if (new URLSearchParams(location.search).has('compartilhado')) history.replaceState({}, '', location.pathname);
})();
