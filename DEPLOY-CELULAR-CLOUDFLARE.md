# Publicação piloto pelo celular: Cloudflare Pages

Objetivo: publicar uma **prévia isolada** do catálogo e do Express'Arte Importador Mobile, sem alterar main, GitHub Pages ou o site atualmente divulgado. Esta etapa publica apenas a interface estática; não ativa a gravação no banco até a API estar pronta.

## Antes de tudo

- Entre em https://dash.cloudflare.com/ usando sua conta.
- Em Workers & Pages, crie um projeto **Pages**, usando **Connect to Git**.
- Autorize o GitHub e escolha `RELRYS03/catalogoExpressarte`.
- Escolha um **novo projeto de prévia** (exemplo: `expressarte-importador-teste`), preservando qualquer projeto Cloudflare já existente.
- Selecione a branch `feat/cloudflare-catalog-import-bridge` para esse projeto de teste. Não use a main nem altere o domínio de produção.
- Configuração de compilação:
  - Framework preset: None.
  - Build command: `node scripts/build-pages-preview.mjs`
  - Build output directory: `dist-preview`
  - Root directory: deixar na raiz do repositório.
- Após deploy, verifique primeiro a página `https://<seu-projeto>.pages.dev/importador/`.
- No Chrome Android, abra esse endereço e escolha **Instalar app** (se o Android/Chrome oferecer a opção).
- Depois compartilhe um modelo a partir do Bambu Handy para verificar se Express'Arte aparece em **Mais**.

## API e persistência

A PWA pode exibir o formulário antes de configurar a API. Para **enviar dados realmente**, provisionar Worker, D1, R2, segredo ADMIN_TOKEN e definir a origem permitida no Cloudflare. Não compartilhe esse segredo em chat, prints ou GitHub; não grave o segredo em arquivos públicos.

A API será publicada separadamente, e seu URL será informado na seção "Conexão segura" da PWA. Só então realizar o teste final Bambu Handy → importador → D1 → fila privada → aprovação → vitrine pública.

A busca automática da imagem usa metadados públicos e pode falhar se a MakerWorld bloquear a consulta. Nenhum download grátis implica licença comercial: confirmar direitos e licença antes de aprovar.

## Verificação técnica

A pipeline GitHub Actions valida o JavaScript e executa 4 testes da API e do contrato de compartilhamento. Também gera `dist-preview` e confirma a presença dos arquivos principais. Isso não substitui teste de instalação no aparelho nem comprova funcionamento no Cloudflare até a implantação.

## Segurança

Não escolha a raiz do repositório como diretório público: a distribuição preparada inclui somente os arquivos estáticos necessários. Não exponha `cloudflare/import-api`, código de testes, SQL ou arquivos administrativos como site público.
