# Express'Arte Importador Mobile (PWA)

Aplicativo auxiliar do Express'Arte Catálogo. Não cria outro catálogo nem outra base de produtos.

## O que esta primeira versão faz

- É uma PWA instalável no Android quando publicada em HTTPS.
- Registra um destino de compartilhamento Android (Web Share Target API).
- Recebe título, texto, URL e, quando o aplicativo de origem enviar, arquivos de imagem.
- Guarda o compartilhamento localmente no IndexedDB até abrir o formulário.
- Permite revisar nome, autor, preço, categoria e imagem.
- Pode consultar a prévia do modelo e enviar cadastro à API Cloudflare.
- O envio é sempre privado e pendente de aprovação.

## Como usar no Android depois da publicação HTTPS

1. Abra a URL /importador/ no Chrome.
2. Use o menu do Chrome e escolha Instalar app ou Adicionar à tela inicial.
3. Abra o Bambu Handy/MakerWorld e compartilhe o modelo.
4. Toque em Mais e selecione Express'Arte, quando aparecer.
5. Revise o formulário e envie.

O Android só mostrará o app na lista de compartilhamento depois de ele estar publicado em HTTPS, instalado e o Chrome reconhecer o manifesto com share_target. A primeira vez pode exigir fechar e reabrir o menu de compartilhamento.

## Configuração da API

O campo de conexão aceita /api (mesma origem) ou a URL base do Worker Cloudflare, por exemplo https://nome-do-worker.workers.dev. A chave administrativa fica na sessão do navegador por padrão. Em um aparelho pessoal, marque **Lembrar neste aparelho** ao entrar para manter o acesso após fechar o app. Use **Sair** para remover a chave guardada no navegador.

A API precisa permitir a origem HTTPS exata do PWA em ALLOWED_ORIGIN. A implantação segura precisa configurar D1, segredo ADMIN_TOKEN, binding R2 IMAGES e PUBLIC_ASSETS_URL se for receber imagens enviadas como arquivos. Sem R2, links e metadados podem ser importados, mas upload de arquivo de imagem deve ser habilitado depois de provisionar o bucket.

## Limites conhecidos

- O Bambu Handy mostrado no teste compartilhou título e link, não a fotografia como arquivo. A capa será buscada na página original pelo endpoint de prévia; isso depende de a MakerWorld permitir a consulta automatizada.
- Alguns aplicativos compartilham apenas texto/link, outros podem compartilhar imagens como arquivo. O app aceita ambos.
- A PWA não lê a tela de outros aplicativos nem cria bolha sobreposta. Isso não é necessário para o fluxo de compartilhamento.
- A vitrine principal também tem uma integração opcional: configure catalogApiEndpoint em config.js com a origem do Worker para carregar apenas produtos aprovados. A aplicação ainda não está publicada nem conectada a uma instância Cloudflare provisionada.
