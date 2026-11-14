# Expressinho IA Econômico — proposta de arquitetura

Status: proposta técnica inicial. Este documento não altera o funcionamento do catálogo nem ativa provedores.

## Objetivo

Manter o Expressinho disponível com o menor custo possível, priorizando respostas determinísticas e modelos locais/gratuitos, usando provedores pagos somente quando necessário e autorizado pelo orçamento.

## Estado atual observado

- O navegador envia `message`, `mode` e histórico para o endpoint configurado em `expressinhoEndpoint`.
- O servidor local `expressinho-core/server.mjs` atende em `127.0.0.1:8767`.
- O servidor local consulta o Ollama em `127.0.0.1:11434`.
- O endpoint local atual implementa `/api/chat` e `/api/health`, com um único motor Ollama.
- O painel possui os modos Loja, Studio 3D e Fabricação.
- A base aprovada está em `expressinho-core/knowledge.json`.
- Não foi encontrada integração de API GPT nem implementação de PrintCalc no código inspecionado.

## Arquitetura proposta

Separar o recebimento da pergunta da escolha do motor de IA:

1. **Camada de atendimento**: valida a mensagem, modo, tamanho e limite de histórico.
2. **Respostas determinísticas**: responde perguntas frequentes e fatos estruturados diretamente da base aprovada, sem chamar modelo.
3. **Cache**: procura resposta reutilizável antes de chamar um modelo.
4. **Roteador de provedores**: seleciona um provedor conforme modo, disponibilidade, custo estimado e orçamento.
5. **Adaptadores**: um adaptador por provedor (Ollama, API OpenAI e provedores gratuitos compatíveis).
6. **Validação da resposta**: verifica formato, tamanho e falhas; não inventa fatos comerciais.
7. **Métricas e limites**: registra consumo agregado, latência, falhas e custo estimado, sem guardar dados pessoais desnecessários.

## Política de prioridade sugerida

Modo Automático:
1. Resposta determinística aprovada, quando suficiente.
2. Cache de resposta segura, quando aplicável.
3. Ollama, se o serviço local estiver acessível de forma segura.
4. Provedor gratuito configurado e dentro da cota.
5. API paga somente se habilitada, dentro do teto de gastos e se a tarefa justificar.

Modo Econômico:
- Priorizar respostas determinísticas, cache e Ollama.
- Não usar API paga automaticamente.
- Se nenhum motor estiver disponível, informar indisponibilidade com clareza.

Modo Manual:
- Permitir que o administrador escolha um provedor habilitado.
- Nunca permitir que a escolha do navegador exponha segredos ou ignore o teto de gastos.

## Observações importantes sobre acesso público e Ollama

O servidor atual escuta em `127.0.0.1`, o que protege o serviço de acesso direto pela rede. Um site hospedado publicamente não consegue chamar esse endereço no computador do proprietário.

Para clientes públicos utilizarem o Ollama do computador da loja, será necessária uma ponte de saída autenticada e protegida, com limites de requisição, autenticação, proteção contra abuso e tratamento de indisponibilidade. Não se deve expor a porta do Ollama diretamente à internet. Alternativamente, o Ollama pode ser usado apenas no painel administrativo/local e os visitantes usam provedores hospedados.

## Cache: regras para evitar respostas erradas

- Começar com cache exato para perguntas frequentes e respostas determinísticas.
- Cache semântico só depois de testes; similaridade não garante que duas perguntas tenham a mesma intenção.
- Não reutilizar respostas com preço, estoque, prazo, disponibilidade ou promoção sem validar a versão atual dos dados.
- Não compartilhar cache de conversas privadas entre clientes.
- Incluir versão da base de conhecimento e do prompt na chave do cache.
- Definir expiração e mecanismo de invalidação.

## Segurança e orçamento

- Chaves de API somente no servidor/segredo de hospedagem, nunca em JavaScript público, `config.js` ou repositório.
- Cotas por visitante/IP, limites de tamanho e proteção contra abuso.
- Teto diário e mensal de gastos para APIs pagas; ao atingir o teto, bloquear chamadas pagas e continuar com opções gratuitas/locais.
- Não tratar a assinatura ChatGPT Free ou Go como cota de API. O uso da API é separado.
- Informar claramente quando um provedor gratuito estiver limitado ou indisponível.

## Plano incremental

### Etapa 0 — concluída nesta branch
- Registrar a arquitetura proposta sem alterar arquivos de produção.

### Etapa 1 — protótipo local
- Extrair interface comum de provedores.
- Manter Ollama como primeiro adaptador.
- Implementar respostas determinísticas e cache exato.
- Criar testes automatizados para roteamento e fallback.

### Etapa 2 — provedores online opcionais
- Adicionar adaptador OpenAI API e, após avaliação, um provedor gratuito.
- Guardar segredos somente no servidor.
- Implementar orçamento, cotas e observabilidade.

### Etapa 3 — publicação segura
- Definir a ponte segura entre o site hospedado e os provedores.
- Só oferecer Ollama aos visitantes se a ponte autenticada estiver instalada e testada.
- Executar testes de segurança, carga, falhas e custos antes de ativar.

## Fora do escopo desta primeira etapa

- Não alterar `index.html`, `expressinho.js`, `config.js` ou o servidor atual.
- Não publicar novos endpoints.
- Não adicionar chaves, dependências ou provedores ativos.
- Não modificar o trabalho do Codex nem a branch `main`.
- Não prometer integração direta com o ChatGPT Free; para o site, modelos acessíveis por API precisam de uma API/provedor próprio.

## Implementação inicial do roteador

Na branch `feature/expressinho-ai-economico` foi adicionado um primeiro adaptador para APIs compatíveis com o formato Chat Completions.

- O Ollama continua sendo a primeira opção.
- A API online fica desativada por padrão.
- O fallback online só é tentado quando `EXPRESSINHO_ONLINE_ENABLED=true` e URL HTTPS, chave e modelo estão configurados no ambiente do servidor.
- A chave é lida no servidor e não deve ser colocada no site nem versionada.
- O adaptador limita a resposta a 700 tokens e usa timeout.
- O cache de respostas Ollama permanece apenas em memória e não armazena perguntas voláteis ou com histórico.

Variáveis documentadas em `expressinho-core/.env.example`.

**Limitação nesta etapa:** ainda não há seleção entre vários provedores, cota gratuita automática, teto monetário por período ou painel de gastos. O fallback é um único endpoint OpenAI-compatible configurado pelo administrador. A configuração não está ativada e não houve chamada externa.


## Etapa de ferramentas com evidências — implementação inicial

Foi adicionada uma camada local inspirada nos contratos explícitos de ferramentas do REA, sem importar o servidor MCP nem as dependências de engenharia reversa.

Arquivos:
- `expressinho-core/tools.mjs`: catálogo fechado de ferramentas internas de consulta.
- `expressinho-core/tools.test.mjs`: testes de contrato, cálculo e limites.
- `expressinho-core/server.mjs`: inclui as evidências retornadas pelas ferramentas no contexto do provedor de IA.

Ferramentas disponíveis nesta etapa:
- `catalog_summary`: conta produtos e separa publicados de rascunhos.
- `product_lookup`: consulta somente campos existentes na base.
- `estimate_total`: calcula quantidade × preço provisório; não funciona sem ambos.

Regras:
- As ferramentas só executam no modo Loja.
- Não executam ações externas nem alteram a base.
- A origem `knowledge.json` acompanha os resultados.
- Campos ausentes permanecem ausentes; o modelo recebe instrução explícita para não completá-los por suposição.
- Estimativas não são ofertas nem confirmação de venda.

Verificação pendente: executar `node --test expressinho-core/*.test.mjs` e `node --check expressinho-core/server.mjs` no checkout da branch. Nenhum teste é declarado como aprovado até essa execução.
