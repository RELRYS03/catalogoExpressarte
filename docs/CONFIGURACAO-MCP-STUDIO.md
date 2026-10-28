# Express'Arte Studio — MCP para desenvolvimento local

Esta configuração é para **VS Code com suporte MCP**. O arquivo `.vscode/mcp.json` registra servidores, mas **não conecta automaticamente contas externas**, não implanta o site e não instala MCP no FreeLLMAPI. É necessário iniciar servidores no cliente e autorizar login OAuth.

## Servidores
- **Chrome DevTools MCP**: `npx -y chrome-devtools-mcp@1.12.0 --isolated`; versão fixada de 22/10/2026. Abre Chrome isolado para inspeção de erros, logs e testes visuais. Requer Node LTS, Chrome estável e acesso ao npm.
- **Supabase MCP**: `https://mcp.supabase.com/mcp` (servidor oficial; autorização Supabase). Criar projeto de desenvolvimento separado antes de conceder permissões de banco.
- **Vercel MCP**: `https://mcp.vercel.com` (OAuth; cliente suportado). Não migrar automaticamente nosso deploy do Cloudflare.
- **Oh My ChatGPT**: **não configurado**. Precisa de URL exata do repositório/servidor. Não confundir com nomes semelhantes como oh-my-opencode.

## Ativação no VS Code (Windows)
1. Abra a pasta clonada `catalogoExpressarte` no VS Code.
2. Instale Node.js LTS e Chrome estável. Confirme com `node -v`.
3. Abra a paleta Ctrl+Shift+P → `MCP: List Servers`. Inicie Chrome DevTools, Supabase e Vercel conforme necessidade.
4. Quando solicitada a autorização, faça login diretamente na página oficial. Não cole tokens em chat nem neste repositório.
5. Teste Chrome DevTools com uma página **local do Studio** e verifique console, erros de importações, upload e download.
6. Supabase: manter ferramentas destrutivas desabilitadas quando possível; usar projeto de testes e revisão humana para qualquer mudança estrutural. Vercel: limitar acesso ao projeto de desenvolvimento.

## Segurança
Servidores MCP concedem acesso a recursos externos. Não conceder permissão de escrita em produção antes de auditoria. Nunca registrar credenciais em arquivos versionados. Chrome DevTools pode visualizar cookies, dados das páginas e sessões: usar instância isolada. O RK10 FreeLLMAPI requer um cliente/orquestrador que suporte MCP para usar esses servidores; só definir a API de chat não adiciona ferramentas automaticamente.

## Links oficiais
- Supabase: https://github.com/supabase/mcp
- Vercel: https://vercel.com/docs/agent-resources/vercel-mcp
- Chrome: https://github.com/ChromeDevTools/chrome-devtools-mcp

## Resultado esperado
O arquivo é preparação de ambiente. Não é confirmação de autorização OAuth, instalação Windows, execução nem conexão de serviços.
