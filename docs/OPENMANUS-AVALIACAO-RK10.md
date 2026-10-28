# OpenManus — avaliação para Express'Arte Studio 3D
Data: 2026-10-28

## Fonte verificada
URL enviada: https://github.com/mannaandpoem/OpenManus (README declara migração)
Repositório oficial atual: https://github.com/FoundationAgents/OpenManus
Licença verificada: MIT (FoundationAgents/OpenManus LICENSE).

## Função
Agente de execução de tarefas multi-etapa, com browser-use via MCP, suporte a LLMs OpenAI-compatible, Ollama e módulos adicionais de análise. Não é motor geométrico, slicer, nem substituto do Meshseal.

## Decisão de arquitetura
RK10 permanece supervisor lógico: o OpenManus é um agente executor *opcional* para tarefas com autorização e escopo definidos, não terá permissão irrestrita sobre GitHub, PC, credenciais, catálogo em produção ou impressora.
OpenCode: desenvolvimento; Ruflo: orquestração de agentes de código (avaliar sobreposição); n8n: automação de eventos; OpenManus: fluxos de pesquisa/navegador/teste e relatório.
Não empilhar múltiplos orquestradores no mesmo fluxo por padrão.

## Compatibilidade
O exemplo oficial mostra `[llm]` com `base_url`, `model`, `api_key`; e `api_type='ollama'` para modelos locais. A URL do FreeLLMAPI local é candidata (127.0.0.1:3001/v1), mas a compatibilidade da API de chat/tool calling e do campo `model` precisa de teste com uma instância efetiva.

## Primeiro piloto recomendado
1. Instalar em ambiente Python 3.12 isolado, sem login no navegador pessoal.
2. Testar acesso ao endpoint LLM local e um prompt sem ferramentas.
3. Testar uma tarefa de leitura sobre artefatos de teste (sem editar código).
4. Testar navegador apenas em páginas locais de teste; verificar que respeita domínio/permissão.
5. Encaminhar relatório para revisão do gerente (usuário); somente então permitir edições controladas em branch feature.
6. Nunca conceder acesso de impressão automática Bambu, deploy, compras ou credenciais ao agente.

## Estado
Pesquisa e avaliação registradas. OpenManus NÃO foi instalado, conectado à RK10 ou executado no Windows. O teste real do Meshseal WebAssembly no navegador continua pendente.
