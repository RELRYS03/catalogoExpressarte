# Graphify — mapa de conhecimento do Studio 3D

## Decisão técnica (28/10/2026)
Projeto oficial: https://github.com/Graphify-Labs/graphify
Pacote PyPI: `graphifyy` (a ferramenta instalada chama-se `graphify`).
Licença do repositório: Apache-2.0, com arquivos MIT/NOTICE adicionais. Nenhum código Graphify está copiado para este repositório.

**Status:** integração operacional planejada e comandos documentados; nenhuma instalação no Windows ou geração do grafo foi executada.

## Para que serve
Graphify cria o grafo estrutural de funções, imports, chamadas, classes e documentação, com relações `EXTRACTED` e `INFERRED`. É complementar aos testes: não demonstra que o reparador Meshseal realmente funciona nem garante a qualidade de um STL. A análise de código é local, mas etapas semânticas de documentos/mídia podem usar um provedor externo se configurado.

## Instalação no computador do desenvolvedor
No terminal da cópia de `RELRYS03/catalogoExpressarte`, branch `feature/image-to-relief-3d`:

```powershell
uv tool install graphifyy
graphify install --platform opencode --project
graphify .
```

O comando de instalação de skill pode criar/alterar arquivos de configuração; **revisar o diff antes do commit**. No PowerShell, invocar `graphify .`, sem barra inicial. Caso `uv` não esteja instalado, seguir a documentação oficial: https://github.com/Graphify-Labs/graphify.

Resultado esperado (não gerado nesta sessão):
```
graphify-out/graph.html
graphify-out/graph.json
graphify-out/GRAPH_REPORT.md
```

## Perguntas que queremos responder com evidências
1. Quais funções ligam `studio-oficina-3d.html` ao worker Meshseal?
2. Quais arquivos são afetados quando alteramos a exportação STL?
3. Como o RK10 se relaciona com FreeLLMAPI e com a configuração de MCP?
4. Quais módulos não têm testes automatizados?
5. Existem dependências circulares ou funcionalidades documentadas sem implementação?

## Critérios de aceite
- Gerar `graphify-out/graph.json` e `graph.html` sem falhas.
- Confirmar por inspeção que os módulos Studio/Meshseal aparecem no mapa (lembrando que JS embutido em HTML pode precisar de tratamento próprio; não presumir cobertura completa).
- Registrar três relações extraídas e verificar contra os arquivos fontes.
- Não interpretar ligações inferidas como provas de funcionamento.
- Não ativar varredura semântica remota em arquivos pessoais sem autorização.
- Preservar a branch `main` e não comitar segredos.

## Posição na arquitetura
Usuário → RK10 (prioridades) → OpenCode (implementação) → Graphify (mapa de dependências/contexto) → Playwright + testes de malha (validação) → revisão humana.

Graphify não repara arquivos STL, não gera IA 3D e não substitui o motor Meshseal.
