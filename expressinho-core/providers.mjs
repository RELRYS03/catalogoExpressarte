export function getCompatibleProviderConfig(env = process.env) {
  const enabled = String(env.EXPRESSINHO_ONLINE_ENABLED || '').toLowerCase() === 'true';
  const baseUrl = String(env.EXPRESSINHO_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const apiKey = String(env.EXPRESSINHO_API_KEY || '').trim();
  const model = String(env.EXPRESSINHO_API_MODEL || '').trim();
  if (!enabled || !baseUrl || !apiKey || !model) return null;
  if (!/^https:\/\/[^/]+/i.test(baseUrl)) {
    throw new Error('O endpoint online precisa usar HTTPS.');
  }
  return { baseUrl, apiKey, model };
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
