const legacyHost = 'expressarte-importador-teste.pages.dev';

export function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname !== legacyHost || !['GET', 'HEAD'].includes(request.method)) return next();

  return new Response(null, {
    status: 302,
    headers: {
      Location: 'https://expressarte.pages.dev/' + url.search,
      'Cache-Control': 'no-store'
    }
  });
}
