# Replica — plano de testes Express’Arte
Os testes automáticos estão em `tests/browser/studio.spec.mjs` e `scripts/check-studio.mjs`.

| Fluxo | Comprovação | Prioridade |
|---|---|---|
| Renderização da oficina | H1 visível, sem pageerror | Crítica |
| Modelo demo | Triângulos exibidos, exportação ativa | Crítica |
| Trocar cor | Status confirma; exportação GLB disponível | Média |
| Exportar STL e GLB | Evento de download + extensão | Crítica |
| Roundtrip STL | Exportar demo → importar STL → geometria exibida | Crítica |
| Remover fundo | PNG → remover fundo → baixar PNG | Alta |
| Foto inválida | SVG rejeitado; botão gerar desabilitado | Alta |
| Relevo 2,5D | Carregar PNG real → gerar STL → reimportar e validar geometria | Crítica; teste a adicionar |
| Corte 3MF | Modelo sólido → dois sólidos → fatiar no Bambu Studio | Crítica; não integrado |
| RK10 | Resposta real FreeLLMAPI, troca entre dois modelos e persistência de contexto | Alta; PC local exigido |

## Execução
GitHub Actions → `Browser smoke tests ExpressArte 3D`. Rodar no branch `feature/image-to-relief-3d`. Se o teste falhar, usar `expressarte-browser-failures` para reproduzir e corrigir. Sem confirmação da execução, não marcar aprovado.

## Questões conhecidas
- Testes no Chromium do GitHub Actions dependem do WebGL/driver de software do runner.
- O teste do PNG sintético é curto e deve ser complementado com fixture PNG validada e resolução maior.
- A oficina não faz corte ou reparação geométrica real nesta etapa.
