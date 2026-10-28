# Avaliação de Claudex e Open Generative AI — 2026-10-28

## Claudex
"Claudex" não é nome único de uma skill. Um projeto examinado é https://github.com/livoras/claudex-gateway-skill: sua skill encaminha Claude Code para um gateway que utiliza credenciais OAuth do Codex/ChatGPT. **Não instalar nem sincronizar credenciais sem auditoria de segurança e conformidade com os termos de autenticação.** Nossa arquitetura atual continua RK10 + FreeLLMAPI, com chaves configuradas apenas localmente e nenhum token no GitHub.

## Open Generative AI
Projeto confirmado: https://github.com/anil-matcha/open-generative-ai (MIT no LICENSE). Editor de imagens/vídeos/áudio e fluxos de IA; não é um motor de reparação STL. O README promove serviços MuAPI e opção white-label paga a partir de US$49/mês. **Código aberto não implica geração ilimitada gratuita.** Não conectar automaticamente nem inserir credenciais no Studio.

## Decisão
Concluir primeiro o motor Meshseal WASM: gerar binários reais `meshseal.js` e `meshseal.wasm`, fazer smoke tests com STL aberto e fechado, verificar que a saída reabre no Studio e é fatiável no Bambu Studio. Depois, avaliar uma integração **opcional** do Open Generative AI para vídeos de produtos, condicionada a custos e licenças dos modelos. Claudex fica em avaliação até identificar a skill exata pretendida e limites de autorização.


## Claudex identificado especificamente pelo usuário
Repositório: https://github.com/l3tchupkt/Claudex

README inspecionado em 2026-10-28: fork da fonte do Claude Code com shim para OpenAI Chat Completions, Ollama, NVIDIA NIM, Gemini, roteador inteligente, Telegram e suporte a MCP. O README declara expressamente origem em um source map de código-fonte do Claude Code e propriedade da Anthropic sobre o material original. Uma consulta ao caminho LICENSE na raiz retornou 404. A menção a domínio público no README refere-se apenas a modificações do shim, não ao código-fonte original.

**Decisão gerencial:** NÃO copiar arquivos, empacotar, instalar automaticamente, nem incorporar o fork ao Studio devido a direitos de distribuição pouco claros. A compatibilidade entre provedores pode ser implementada com clientes de API independentes de licença comprovada, como o OpenCode, e endpoints autorizados. O Claudex é uma referência arquitetural, não uma dependência aprovada.

Para uma eventual reavaliação, exigir licença inequívoca do projeto completo e das dependências, confirmação de compatibilidade com os termos pertinentes, revisão de segurança de instalação, e testes de tool calling com FreeLLMAPI em ambiente isolado e sem segredos no GitHub.
