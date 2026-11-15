export function getCompatibleProviderConfig(env = process.env) {
  const enabled = String(env.EXPRESSINHO_ONLINE_ENABLED || 'true').toLowerCase() === 'true';
  if (!enabled) return null;

  // NVIDIA NIM tem prioridade quando suas variáveis estão configuradas.
  const nvidiaBaseUrl = String(env.NVIDIA_API_BASE_URL || env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1').trim().replace(/\/+$/, '');
  const nvidiaApiKey = String(env.NVIDIA_API_KEY || env.NVIDIA_NIM_API_KEY || '').trim();
  const nvidiaModel = String(env.NVIDIA_API_MODEL || env.NVIDIA_NIM_MODEL || '').trim();
  if (nvidiaApiKey && nvidiaModel) {
    if (!/^https:\/\/[^/]+/i.test(nvidiaBaseUrl)) throw new Error('O endpoint NVIDIA precisa usar HTTPS.');
    return { provider: 'nvidia', baseUrl: nvidiaBaseUrl, apiKey: nvidiaApiKey, model: nvidiaModel };
  }

  // OpenAI permanece como segunda opção online.
  const baseUrl = String(env.EXPRESSINHO_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const apiKey = String(env.EXPRESSINHO_API_KEY || '').trim();
  const model = String(env.EXPRESSINHO_API_MODEL || '').trim();
  if (!baseUrl || !apiKey || !model) return null;
  if (!/^https:\/\/[^/]+/i.test(baseUrl)) throw new Error('O endpoint online precisa usar HTTPS.');
  return { provider: 'openai-compatible', baseUrl, apiKey, model };
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
