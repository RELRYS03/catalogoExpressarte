# GitHub Skills → Express'Arte Studio 3D
Fonte oficial: https://github.com/skills (organização GitHub Skills de **exercícios educacionais**, não um catálogo de skills instaláveis para IA).
Verificado em 2026-10-28.

## Referências escolhidas
- https://github.com/skills/agent-orchestration-build-your-ai-dream-team — método de orquestrador e agentes especializados; curso pressupõe Copilot CLI/Codespaces. Adotamos apenas o padrão de divisão de responsabilidade.
- https://github.com/skills/ship-with-quality — qualidade, cobertura e políticas de PR. Seu exercício de GitHub Code Quality exige organização habilitada; não supor que está disponível em conta pessoal.
- https://github.com/skills/integrate-mcp-with-copilot — conceitos MCP e permissões.
- https://github.com/skills/test-and-debug-with-github-copilot — técnica de depuração e casos de teste.
- https://github.com/skills/agentic-workflows-that-read-the-room — padrões de automação controlada por eventos.

## Adaptação implantada
Agentes descritivos em `.github/agents/rk10-orchestrator.agent.md` e `.github/agents/studio-qa.agent.md`, focados em metas e limites da Express'Arte. Não copiamos código dos exercícios e não presumimos que o OpenCode registre automaticamente o formato de agentes do Copilot; esse uso requer verificação.

## Próximos portões de qualidade
1. Confirmar build real de `meshseal.js` e `meshseal.wasm` e publicar artefato no ambiente de testes.
2. Confirmar teste de STL com furo na execução GitHub Actions `test-meshseal.yml`.
3. Rodar Playwright contra uma versão servida que inclua os binários reais WASM; não contra stubs.
4. Comparar medidas e verificar fatiamento na Bambu A1.
5. Habilitar proteções de branch/PR apenas se a conta/repositório suportarem; não afirmar proteção ativada.
6. Manter secrets fora de logs e do código.

Estado: agentes e política escritos; nenhuma execução de agente, integração Copilot ou sucesso de CI alegados.
