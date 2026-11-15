function isAllowedBaseUrl(value) {
  let url;
  try { url = new URL(value); }
  catch { return false; }
  if (url.protocol === 'https:') return true;
  // HTTP só é permitido para o FreeLLMAPI na própria máquina.
  return url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname.toLowerCase());
}

function makeConfig(provider, baseUrl, apiKey, model) {
  const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\\/+$/, '');
  if (!normalizedBaseUrl || !apiKey || !model) return null;
  if (!isAllowedBaseUrl(normalizedBaseUrl)) {
    throw new Error('Use HTTPS para provedores externos. HTTP só é permitido em localhost.');
  }
  return { provider, baseUrl: normalizedBaseUrl, apiKey: String(apiKey).trim(), model: String(model).trim() };
}

export function getCompatibleProviderConfig(env = process.env) {
  const enabled = String(env.EXPRESSINHO_ONLINE_ENABLED || 'true').toLowerCase() === 'true';
  if (!enabled) return null;

  // FreeLLMAPI é o roteador principal: ele escolhe NVIDIA e aplica sua própria cadeia de fallback.
  const freeLlmConfig = makeConfig(
    'freellmapi',
    env.FREELLMAPI_BASE_URL || 'http://127.0.0.1:31415/v1',
    String(env.FREELLMAPI_API_KEY || '').trim(),
    String(env.FREELLMAPI_MODEL || 'auto').trim()
  );
  if (freeLlmConfig) return freeLlmConfig;

  // NVIDIA NIM direto continua disponível como alternativa ao roteador.
  const nvidiaBaseUrl = String(env.NVIDIA_API_BASE_URL || env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1').trim();
  const nvidiaApiKey = String(env.NVIDIA_API_KEY || env.NVIDIA_NIM_API_KEY || '').trim();
  const nvidiaModel = String(env.NVIDIA_API_MODEL || env.NVIDIA_NIM_MODEL || '').trim();
  const nvidiaConfig = makeConfig('nvidia', nvidiaBaseUrl, nvidiaApiKey, nvidiaModel);
  if (nvidiaConfig) return nvidiaConfig;

  // Provedor OpenAI-compatible legado.
  return makeConfig(
    'openai-compatible',
    env.EXPRESSINHO_API_BASE_URL,
    String(env.EXPRESSINHO_API_KEY || '').trim(),
    String(env.EXPRESSINHO_API_MODEL || '').trim()
  );
}

export async function generateCompatibleReply({ config, messages, fetchImpl = fetch, timeoutMs = 45000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(config.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.25,
        max_tokens: 700
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error('Provedor online respondeu com erro (' + response.status + '): ' + detail);
    }
    const payload = await response.json();
    const reply = payload?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      throw new Error('O provedor online não devolveu uma resposta de texto.');
    }
    return reply.trim();
  } finally {
    clearTimeout(timer);
  }
}
