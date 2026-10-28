# Regra operacional RK10: dependências antes da edição

Graphify oficial: https://github.com/Graphify-Labs/graphify — pacote `graphifyy`.
Com o mapa disponível, executar ANTES de modificar módulos:
```powershell
graphify .
node scripts/rk10-graph-check.mjs graphify-out/graph.json studio-oficina-3d.html
```

Se o mapa estiver ausente, expirado (>24h) ou sem cobertura dos arquivos, não liberar automaticamente a mudança. Inspecionar dependências manualmente e registrar a lacuna — JS embutido em HTML nem sempre é coberto integralmente pelo Graphify.

1. Gerar mapa Graphify atualizado.
2. Identificar módulos, imports, chamadas e testes correlatos no relatório.
3. Distinguir relações EXTRACTED de INFERRED.
4. Definir plano de mudança e regressão.
5. Executar testes (Meshseal E2E antes da publicação).
6. Revisar diff, solicitar autorização antes do deploy.

Nota: o script é um gate local preparatório; **não está conectado automaticamente a hooks do OpenCode** e apenas identifica referências textuais a arquivos no JSON. Não prova análise de impacto concluída.
