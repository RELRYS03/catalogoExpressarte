# Ponte de importação Express'Arte Catálogo (prévia isolada)

**Escopo atual:** preparar a ligação entre a extensão Chrome já existente e o catálogo, **sem recriar a extensão**. Este código foi adicionado em branch separada; não está publicado e não altera a vitrine da branch main.

## Situação encontrada

Na main, o site é HTML/CSS/JavaScript estático. `app.js` contém uma lista fixa de produtos e lógica de pedido. Uma página estática, sozinha, não consegue persistir os cadastros enviados pela extensão. Esta API em Cloudflare Workers + D1 preenche a lacuna.

## Fluxo proposto

1. A extensão original captura link, imagem/capa, nome, preço e categoria.
2. O usuário confirma o cadastro. A extensão envia JSON com autorização para `POST /api/imports`.
3. O Worker registra no D1 como `pending`. **Nada é publicado automaticamente.**
4. O administrador consulta `GET /api/imports` e revisa direitos/licença, preço e categoria.
5. `PATCH /api/imports/:id` aprova explicitamente. Só entram em `GET /api/products` os registros com confirmação de licença comercial **e** autorização de uso da imagem.
6. A ligação do catálogo público a `GET /api/products` será implementada após validar o contrato com a extensão recuperada.

Não faça upload de STL nesta fase. Não trate “download grátis” como permissão de venda ou reutilização de fotos. Não armazene a chave de administração diretamente nos arquivos públicos do catálogo ou em uma extensão distribuída.

## Cloudflare

Crie um banco D1 e rode a migração `schema.sql` **no ambiente escolhido**. Configure um Worker com a pasta `src` e binding D1 `DB`. Defina `ADMIN_TOKEN` como segredo longo (mínimo 32 caracteres) e `ALLOWED_ORIGIN` como origem exata do painel administrativo/Chrome extension que for aprovada. Não há recursos provisionados automaticamente por este commit, e não há dependências globais a instalar.

Rotas:
- `GET /api/health` verifica serviço.
- `POST /api/imports` exige `Authorization: Bearer <ADMIN_TOKEN>`, JSON `{ "sourceUrl":"https://makerworld.com/...", "title":"...", "imageUrl":"https://...", "author":"...", "category":"Religiosos", "priceCents": 2990, "licenseName":"..." }`.
- `GET /api/imports` exige autenticação e lista a fila.
- `PATCH /api/imports/{id}` exige autenticação e JSON `{"status":"approved","commercialUseAllowed":true,"imageUseAllowed":true}`.
- `GET /api/products` é somente leitura pública e retorna produtos aprovados.

## Pendências antes da implantação

- Recuperar a extensão Chrome original para inspecionar formato do formulário e requisições (o computador está indisponível).
- Definir login de administração seguro (evitar colocar o segredo no código da extensão ou no JavaScript do site); potencialmente usar Cloudflare Access com sessão/autorização específica.
- Revisar permissão de imagens externas, CSP, antifraude, limite de requisições e proteção contra URLs indevidas antes de publicação.
- Conectar a vitrine pública à API e testar em ambiente de prévia.
- Validar o fluxo real extensão → Worker → D1 → catálogo após recuperar o computador.
