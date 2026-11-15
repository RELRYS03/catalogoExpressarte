const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const randomHex = size => hex(crypto.getRandomValues(new Uint8Array(size)));
const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const sessionPattern = /^session_[0-9a-f]{64}$/;

function sameHash(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bearer(request) {
  const auth = request.headers.get('Authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

async function hasAdminKey(request, env) {
  const token = bearer(request);
  if (!token || !env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32) return false;
  const [actual, expected] = await Promise.all([digest(token), digest(env.ADMIN_TOKEN)]);
  return sameHash(actual, expected);
}

export async function readAdminSession(request, env) {
  const token = bearer(request);
  if (!sessionPattern.test(token)) return null;
  return env.DB.prepare('SELECT expires_at FROM admin_sessions WHERE token_hash=? AND expires_at>?')
    .bind(await digest(token), Date.now()).first();
}

export async function authorized(request, env) {
  return sessionPattern.test(bearer(request))
    ? Boolean(await readAdminSession(request, env))
    : hasAdminKey(request, env);
}

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100000
  }, key, 256));
}

export async function adminAuth(request, env, action, body, respond) {
  if (action === 'logout') {
    const token = bearer(request);
    if (sessionPattern.test(token)) {
      await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await digest(token)).run();
    }
    return respond({ ok: true });
  }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body?.password;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== 'string' || password.length < 12 || password.length > 128) {
    return respond({ error: 'Informe um e-mail válido e uma senha de 12 a 128 caracteres.' }, 400);
  }
  if (action === 'setup') {
    if (!await hasAdminKey(request, env)) return respond({ error: 'Chave administrativa inválida.' }, 401);
    const salt = randomHex(16);
    const result = await env.DB.prepare(
      'INSERT INTO admin_account (id,email,salt,password_hash) VALUES (1,?,?,?) ON CONFLICT(id) DO NOTHING'
    ).bind(email, salt, await passwordHash(password, salt)).run();
    if (!result.meta.changes) return respond({ error: 'O usuário administrador já foi criado. Use Entrar.' }, 409);
  } else {
    const now = Date.now();
    const account = await env.DB.prepare(`UPDATE admin_account
      SET attempts=CASE WHEN retry_after<=? THEN 1 ELSE attempts+1 END,
        retry_after=CASE WHEN retry_after<=? THEN ? ELSE retry_after END
      WHERE id=1 AND email=? AND (retry_after<=? OR attempts<8)
      RETURNING salt, password_hash`).bind(now, now, now + 600000, email, now).first();
    if (!account || !sameHash(await passwordHash(password, account.salt), account.password_hash)) {
      return respond({ error: 'E-mail ou senha incorretos. Após várias tentativas, aguarde 10 minutos.' }, 401);
    }
    await env.DB.prepare('UPDATE admin_account SET attempts=0,retry_after=0 WHERE id=1').run();
  }
  const token = 'session_' + randomHex(32);
  const now = Date.now();
  const expiresAt = now + (body.remember === true ? 30 * 86400000 : 8 * 3600000);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(now),
    env.DB.prepare('INSERT INTO admin_sessions (token_hash,expires_at) VALUES (?,?)').bind(await digest(token), expiresAt)
  ]);
  return respond({ token });
}
