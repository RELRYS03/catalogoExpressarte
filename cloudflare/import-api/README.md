# Express'Arte: API de importação (Cloudflare Workers + D1 + R2)

Esta API recebe cadastros do Express'Arte Importador Mobile e da futura extensão Chrome. Ela não baixa nem hospeda arquivos STL.

## Rotas

- GET /api/health: informa se D1 e armazenamento de imagens estão configurados.
- GET /api/preview?url=...: exige Bearer ADMIN_TOKEN; consulta metadados Open Graph de domínios permitidos (MakerWorld, Printables, Thingiverse, Cults3D e Thangs). É uma tentativa best-effort: alguns sites podem bloquear consultas automatizadas.
- POST /api/imports: exige Bearer ADMIN_TOKEN; aceita JSON ou multipart/form-data. Campos: sourceUrl, sourceSite, title, author, category, priceCents, imageUrl, licenseName. No multipart, pode receber um arquivo no campo image.
- GET /api/imports: exige Bearer ADMIN_TOKEN e lista a fila privada.
- PATCH /api/imports/{id}: exige Bearer ADMIN_TOKEN e altera status. Para aprovar, exige confirmação explícita de licença comercial e autorização de uso da imagem.
- GET /api/products: lista somente itens aprovados com as duas permissões confirmadas.
- DELETE /api/admin/products/{id}: exige autenticação administrativa e retira o produto e suas promoções. Para produtos originais, registra a remoção em D1.

Todos os cadastros começam como pending. O envio nunca publica automaticamente.

## Configuração Cloudflare

O arquivo wrangler.toml é um modelo inicial. Substitua o database_id pelo ID real do D1 e configure um domínio público do R2 em PUBLIC_ASSETS_URL. Não publique com os valores SUBSTITUIR... ainda presentes.

1. Crie o D1 expressarte-catalog-imports.
2. Execute a migração em cloudflare/import-api/schema.sql.
   Em um banco existente, aplique `catalog-removed-products.sql` antes de publicar a rota de exclusão.
   Aplique `catalog-promotion-themes.sql` após `catalog-promotion-items.sql` para ativar os temas das ofertas.
   Aplique `catalog-product-titles.sql` após `product-overrides.sql` antes de publicar a edição de nomes.
3. Crie o bucket R2 expressarte-catalog-images e configure acesso público por domínio customizado (recomendado) ou endpoint público autorizado.
4. Configure os bindings DB (D1) e IMAGES (R2).
5. Configure os valores ALLOWED_ORIGIN com a origem HTTPS exata do PWA e PUBLIC_ASSETS_URL com a origem pública de imagens.
6. Crie o segredo ADMIN_TOKEN com pelo menos 32 caracteres aleatórios usando wrangler secret put ADMIN_TOKEN.
7. A partir desta pasta, instale/configure Wrangler conforme a documentação oficial e publique com wrangler deploy.

O segredo ADMIN_TOKEN nunca deve ser colocado no JavaScript público, no manifesto, no repositório ou em uma extensão distribuída. O administrador o digita no importador; o PWA guarda a chave apenas em sessionStorage durante a sessão. Prefira usar o PWA e a API sob domínios controlados pela loja e mantenha a chave privada.

## PWA Importador Mobile

No endereço oficial, o Pages encaminha as rotas do Importador por `/import-api/`. Configure no projeto Pages o vínculo de serviço `IMPORT_API` com o Worker `expressarte-import-api` e publique novamente após criar o vínculo. O login oficial guarda a sessão em um cookie protegido e converte sessões válidas da versão anterior. Uma integração que acessa o Worker diretamente conserva a autenticação Bearer.

A pasta importador/ contém a aplicação instalável e seu manifesto Web Share Target. Para aparecer no menu Compartilhar do Android, publique-a em HTTPS e instale-a no Chrome. O manifesto recebe title, text, url e, se a origem compartilhar arquivo, imagens.

O importador pode apontar para a API no mesmo domínio (/api) ou para a origem do Worker, informada no campo de conexão. Se usar origem separada, ALLOWED_ORIGIN precisa corresponder exatamente à origem HTTPS onde o PWA está hospedado.

O Bambu Handy do teste compartilhou o título e o link MakerWorld; não compartilhou a capa como arquivo. Por isso o PWA tenta buscar a capa pela rota /api/preview. Se o site de origem bloquear a consulta, o usuário poderá selecionar/compartilhar uma imagem manualmente. O envio de arquivo de imagem exige o binding R2 e PUBLIC_ASSETS_URL.

## Testes

Na raiz do repositório, execute:
- node --check cloudflare/import-api/src/index.js
- node --check importador/app.js
- node --check importador/sw.js
- node --test cloudflare/import-api/tests/bridge.test.mjs

Os testes simulam D1/R2 e verificam importação pendente, aprovação explícita, CORS, upload de imagem e contrato Web Share Target. Eles não substituem teste real no Android ou implantação Cloudflare.

## Estado desta entrega

Código em branch de desenvolvimento isolada. Ainda não foi provisionado D1/R2, não foi publicado o Worker/PWA e não foi testado no Bambu Handy real. A branch main permanece intocada.
