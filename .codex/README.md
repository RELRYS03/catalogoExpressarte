# Codex + Cloudflare neste projeto

Este repositório inclui `.codex/config.toml` com o servidor oficial Cloudflare MCP em `https://mcp.cloudflare.com/mcp`.

## Ativação no computador onde o Codex está instalado

1. Abra este repositório no Codex e marque o projeto como confiável. O Codex só carrega configurações `.codex/` de projetos confiáveis.
2. Faça login no MCP Cloudflare pelo terminal do computador: `codex mcp login cloudflare`.
3. Instale as Cloudflare Skills para Codex no ambiente local: `npx -y skills add cloudflare/skills --skill '*' --yes --global`.
4. Reinicie o Codex para carregar as skills e as ferramentas MCP.
5. Verifique a conexão com `codex mcp list` e teste uma consulta Cloudflare sem executar alterações de infraestrutura.

A configuração do MCP é por projeto e não substitui a autenticação OAuth. A instalação global de skills e o login OAuth alteram o ambiente local do usuário, portanto precisam ocorrer no computador que executa o Codex. Não coloque tokens, chaves ou credenciais neste repositório.

## Fonte

Instruções oficiais: https://developers.cloudflare.com/agent-setup/prompt.md
Configuração por projeto no Codex: https://learn.chatgpt.com/docs/config-file/config-basic

## Instalador Windows

Na raiz do repositório, execute `scripts/setup-cloudflare-codex.ps1` no PowerShell. O script instala as Cloudflare Skills globalmente, inicia o OAuth do MCP e verifica a lista de servidores. Ele requer Node.js/npm e Codex CLI já instalados. O login OAuth exige interação no navegador e consentimento do titular da conta.
