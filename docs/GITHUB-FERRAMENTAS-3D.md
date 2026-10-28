# Express’Arte Studio 3D — levantamento de componentes GitHub
Data: 2026-10-28. Status: pesquisa e triagem técnica, **não implementação nem aprovação de qualidade**.

## Critérios
1. Repositório público e documentação verificável.
2. Licença compatível com a distribuição pretendida (prioridade MIT, Apache-2.0, BSD).
3. Funcionalidade demonstrável, integração pequena e testes para STL/OBJ/GLB/3MF.
4. Segurança: nenhuma chave API no navegador, arquivos do usuário preferencialmente processados localmente.
5. Nunca prometer “sem bugs” sem testes com modelos reais.

## Candidatos priorizados

| Projeto | Área | Licença / cautela | Decisão |
|---|---|---|---|
| [ialrajhi/3mfModelCut](https://github.com/ialrajhi/3mfModelCut) | Corte STL/3MF, conectores, validação das duas peças e preservação de cor | MIT, LICENSE inspecionada. Verificar dependências | **P1: prototipar adaptação em módulo isolado** |
| [ahujasid/mcp-for-blender](https://github.com/ahujasid/mcp-for-blender) | Ponte Blender com agentes MCP | MIT, LICENSE inspecionada | **P1: avaliar para ponte local** |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | Viewport e exportação web | MIT (confirmar pacote/versão na integração) | **P1: já usado no protótipo** |
| [nitrobin/meshchopper-stlfixer](https://github.com/nitrobin/meshchopper-stlfixer) | Diagnóstico e reparo de STL no navegador | Licença **não confirmada nesta rodada** | P1: auditar LICENSE e casos de geometria |
| [mikedh/trimesh](https://github.com/mikedh/trimesh) | Análise de malha em Python, medidas, processamento | Licença **não confirmada nesta rodada** | P2: backend Blender/serviço local |
| [Rage4er/tinkercraft](https://github.com/Rage4er/tinkercraft) | CAD paramétrico e booleanas com Manifold | GPL-3.0, LICENSE inspecionada | P2: estudar arquitetura; não copiar sem plano de conformidade GPL |
| [imgly/background-removal-js](https://github.com/imgly/background-removal-js) | Remoção de fundo com ML local no browser | AGPL-3.0, declarado no README | P2: testar isoladamente e analisar obrigações |
| [MeshInspector/MeshLib](https://github.com/MeshInspector/MeshLib) | Operações de malha avançadas | LICENSE do repositório consultado indica **uso não comercial/educacional**; conferir variantes | **Não incorporar à distribuição comercial sem licença adequada** |
| [storytold/cadcraft](https://github.com/storytold/cadcraft) | CAD em Rust, MCP/CLI | MIT ou Apache 2.0 no README | P2: integração via processo, não copiar interface inteira |
| [storytold/vectorcraft](https://github.com/storytold/vectorcraft) | Vetores/SVG | MIT ou Apache 2.0 no README | P2: comparar com editor SVG atual |
| [storytold/photocraft](https://github.com/storytold/photocraft) | Edição de imagens e PSD | MIT ou Apache 2.0 no README | P3: integração grande; evitar duplicar um editor inteiro |
| [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | Viewport React | Confirmar versão/licença | P2 apenas se migrarmos a aplicação estática para React |
| [GeekatplayStudio/Meshwright](https://github.com/GeekatplayStudio/Meshwright) | Auditoria e reparo | Licença pendente | Backlog |
| [Exulizer/MeshDoc](https://github.com/Exulizer/MeshDoc) | Diagnóstico/auto-reparo no navegador | Licença pendente | Backlog |

## Próximo pacote de implementação (ordem recomendada)
- **Fase A:** importar um STL/3MF com geometria conhecida; adicionar diagnóstico explícito de malha (watertight, faces degeneradas, bordas abertas), sem dizer que o algoritmo corrigiu quando apenas mudou normais.
- **Fase B:** dividir em dois sólidos fechados com plano ajustável; validar ambas as partes e exportar, usando a base MIT do 3mfModelCut ou algoritmo independente devidamente testado.
- **Fase C:** criar encaixes com folgas configuráveis e validação das duas partes; testes com modelos da Bambu A1.
- **Fase D:** conectar ponte Blender/MCP por serviço local autenticado, mantendo processo nativo fora do navegador.
- **Fase E:** remover fundo com segmentação avançada depois de resolver licença e custo local.

## Regras para incorporar
Não clonar 5.000 repositórios para dentro do site: risco enorme de dependências, vulnerabilidades, versões incompatíveis e licenças. Usar somente dependências necessárias e com versões fixadas; registrar origem, licença, alterações e testes. Nenhum merge na main até smoke test no navegador e teste com STL real.

## Limitações do levantamento
Os projetos foram encontrados por buscas GitHub/web dirigidas, não por leitura exaustiva de milhares de repositórios. Licenças marcadas como pendentes não devem ser tratadas como permissões. Nenhuma ferramenta externa foi incorporada por este documento.
