# Catálogo de APIs e serviços free-for-dev — triagem Express'Arte (2026-10-28)

## Fontes
Enviado pelo usuário: https://github.com/jixserver/free-for-dev — lista legada, vários limites e links históricos potencialmente desatualizados.
Catálogo principal: https://github.com/ripienaar/free-for-dev — usar como índice de candidatos; NÃO assumir que informações de preços, uptime e funcionalidades estejam vigentes.

## Priorização
| Serviço | Uso | Ação | Dependências e cautelas |
|---|---|---|---|
| Better Stack | uptime do catálogo, serviços e API | Avaliar piloto read-only | Conta e plano, alertas e dados |
| Checkly | browser checks em fluxos públicos | Comparar a Playwright/GitHub Actions existente | Não duplicar custos nem rodar browser cloud sem necessidade |
| CodeRabbit | review de PR | Avaliar para a branch de testes | Acesso ao repositório, escopo de dados e revisão humana |
| CodeFactor | qualidade estática | Comparar ao check:studio atual | Integração GitHub/escopo do repositório |
| AnyHook | teste de webhook e reenvio de evento | Piloto somente em ambiente fictício | NUNCA enviar payloads sensíveis para URL pública de testes |
| APITemplate.io | PDFs/imagens promocionais | Avaliar depois do pipeline de produto 3D | Gratuidade limitada, privacidade das fotos |
| Brave Search API | pesquisa estruturada da RK10 | POC condicionada à análise de preço atual | Cartão/chave, limitar consultas e cobranças |
| Apify | coleta de dados e automações | Baixa prioridade | Créditos escassos, termos dos sites e privacidade |
| GitHub Actions / Playwright | testes end-to-end de reparo STL | **Preferência atual** | Sem serviço externo além do GitHub; rodar suíte E2E Meshseal real |
| Graphify local | grafo de dependências | Primeiro construir grafo verificável | Sem plano pago |

## Regras de aprovação
1. Consultar a página oficial de preço atual e condições do nível gratuito.
2. Marcar se exige cartão, chaves de API, dados pessoais ou permissões amplas.
3. Confirmar limites, custos de excedentes, região e direito de uso comercial.
4. Preferir soluções locais/gratuitas já implementadas se tiverem equivalência.
5. Guardar segredos fora do GitHub. Não integrar serviços não validados.
6. Exigir métricas reais e rollback para integrações de produção.

## Estado
Pesquisa e shortlist somente: nenhuma conta conectada, serviço pago contratado ou API ativada.
Os testes Meshseal WebAssembly em `.github/workflows/meshseal-wasm-e2e.yml` continuam exigindo execução e resultado comprovado. Não confundir CI configurado com CI verde.
