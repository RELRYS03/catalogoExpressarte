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
  const modeButtons = Array.from(document.querySelectorAll('[data-expressinho-mode]'));
  const quickButtons = Array.from(document.querySelectorAll('[data-expressinho-prompt]'));
  const hero = document.querySelector('.promo-banner');

  if (!panel || !heroTrigger || !floatingTrigger || !form || !input || !messages) return;

  let mode = 'loja';
  let activeTrigger = heroTrigger;
  let history = [];

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
    if (activeTrigger && typeof activeTrigger.focus === 'function') activeTrigger.focus();
  }

  function addMessage(text, role, extraClass) {
    const bubble = document.createElement('div');
    bubble.className = 'expressinho-message ' + role + (extraClass ? ' ' + extraClass : '');
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  function setMode(nextMode) {
    mode = nextMode;
    modeButtons.forEach(button => {
      const active = button.dataset.expressinhoMode === mode;
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function localAnswer(message, selectedMode) {
    const text = message.toLocaleLowerCase('pt-BR');
    if (/\b(aprender|memorizar|guardar|ensinar|corrigir|lembrar|memória|memoria)\b/.test(text)) {
      return 'Nesta primeira versão, eu ainda não salvo novas informações como memória permanente. Posso usar esta conversa enquanto o painel estiver aberto, mas uma correção só vira conhecimento duradouro quando a equipe a aprovar e cadastrar na base. Isso evita guardar informação errada.';
    }

    if (selectedMode === 'loja') {
      if (/\b(pote|anilha|28kg|64lb)\b/.test(text)) {
        return 'Na base de teste está cadastrado o Pote Anilha 28KG / 64LB, com preço provisório de R$ 34,90. O produto continua em rascunho e ainda não deve ser anunciado como preço final. Só a equipe da Express’Arte pode confirmar o valor e a publicação.';
      }
      if (/\b(preço|preco|valor|quanto|custa|custar)\b/.test(text)) {
        return 'Por enquanto, o único preço cadastrado na demonstração é R$ 34,90 para o Pote Anilha 28KG / 64LB. Esse valor é provisório e o produto está em rascunho; não vou inventar preços para outros itens.';
      }
      if (/\b(whatsapp|pedido|comprar|encomenda|instagram|contato)\b/.test(text)) {
        return 'O catálogo está preparado para montar um pedido com produtos e quantidades e abrir o WhatsApp comercial para você confirmar. Antes de divulgar, a equipe ainda precisa aprovar os produtos e os preços que estão em rascunho.';
      }
      return 'Estou começando pela base comercial aprovada. Neste momento, só tenho o Pote Anilha 28KG / 64LB cadastrado como produto de teste, por R$ 34,90 provisórios. Pergunte sobre esse item ou escolha Studio 3D ou Fabricação para mudar de assunto.';
    }

    if (selectedMode === 'studio') {
      if (/\b(blender|malha|stl|3mf|modelo|modelagem|furo|rosca|encaixe)\b/.test(text)) {
        return 'Posso ajudar a planejar modelagem, medidas, malhas, furos, roscas e encaixes. Ainda não estou conectado ao Blender nem consigo alterar arquivos diretamente por esta conversa. Diga o objetivo da peça, as medidas e o formato do arquivo para eu orientar o próximo passo com segurança.';
      }
      return 'No módulo Studio 3D, posso organizar o trabalho de modelagem e ajudar a diagnosticar problemas a partir das informações que você fornecer. A conexão direta com Blender e a edição de arquivos ainda serão implementadas; não vou afirmar que executei uma operação que não fiz.';
    }

    if (/\b(custo|custos|preço|preco|lucro|filamento|gramas|gramagem|tempo|petg|pla|impressão|impressao|bambu)\b/.test(text)) {
      return 'Para calcular fabricação sem inventar números, preciso dos dados disponíveis: material, gramas usadas, preço do quilo, tempo de impressão, custo de embalagem e margem para falhas. Para recomendar configurações, preciso também saber o material e a função da peça. Ainda não estou conectado à impressora nem ao fatiador.';
    }
    return 'No módulo Fabricação, vou ajudar com consumo de material, tempo, custo, acabamento e preparação de impressão. Para um cálculo confiável, envie os dados reais da peça. A conexão automática com impressora e fatiador ainda não está ativa.';
  }

  async function getAnswer(message) {
    if (!endpoint) return localAnswer(message, mode);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, mode: mode, history: history.slice(-10) })
    });
    if (!response.ok) throw new Error('A conexão com o serviço do Expressinho falhou.');
    const data = await response.json();
    if (!data || typeof data.reply !== 'string' || !data.reply.trim()) {
      throw new Error('O serviço do Expressinho não devolveu uma resposta válida.');
    }
    return data.reply.trim();
  }

  async function submitMessage(rawMessage) {
    const message = String(rawMessage || '').trim();
    if (!message || sendButton.disabled) return;

    addMessage(message, 'user');
    history.push({ role: 'user', content: message });
    input.value = '';
    sendButton.disabled = true;
    input.disabled = true;
    const pending = addMessage(endpoint ? 'Pensando…' : 'Consultando a base inicial…', 'assistant', 'pending');

    let answer;
    try {
      answer = await getAnswer(message);
    } catch (error) {
      answer = localAnswer(message, mode) + '\n\nNão consegui acessar o serviço de IA configurado; usei a base inicial local. Nenhuma chave de API deve ser colocada neste site.';
    }

    pending.remove();
    addMessage(answer, 'assistant');
    history.push({ role: 'assistant', content: answer });
    history = history.slice(-12);
    sendButton.disabled = false;
    input.disabled = false;
    input.focus();
  }

  heroTrigger.addEventListener('click', () => openPanel(heroTrigger));
  floatingTrigger.addEventListener('click', () => openPanel(floatingTrigger));
  closeButton.addEventListener('click', closePanel);
  modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.expressinhoMode)));
  quickButtons.forEach(button => button.addEventListener('click', () => {
    if (button.dataset.expressinhoMode) setMode(button.dataset.expressinhoMode);
    submitMessage(button.dataset.expressinhoPrompt);
  }));
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

  window.addEventListener('resize', () => {
    if (!panel.hidden && window.innerWidth > 620) panel.style.maxHeight = '';
  });
})();