# Express’Arte Studio 3D — decisão de arquitetura e repositórios
Data: 2026-10-28.

## Decisão
**Base recomendada: manter nossa oficina e evoluir sobre Three.js + Threepipe (Apache-2.0).** Para corte e encaixes, integrar o 3mfModelCut (MIT) como módulo isolado. Para operações CAD robustas, avaliar Manifold WASM (licença e versão a fixar) antes de copiar código de aplicações inteiras.

### Por que não clonar tudo?
Nosso catálogo é HTML/CSS/JS estático; JumpStart é uma aplicação distribuível, TinkerCraft é React/Vite, 3mfModelCut é Next/Vinext. A união direta de códigos heterogêneos gera conflitos e não funciona como simples cópia. Reuso por módulo isolado e integração de arquivos é mais confiável.

## Comparativo verificado nos repositórios (README + LICENSE)
| Código | Função | Licença constatada | Decisão |
|---|---|---|---|
| https://github.com/repalash/threepipe | visualizador/editor de cenas com materiais, plugins e importações | Apache-2.0 | **Base visual e renderização; protótipo separado** |
| https://github.com/ialrajhi/3mfModelCut | corte STL/3MF, conectores, validação das partes | MIT | **Módulo específico prioritário** |
| https://github.com/Rage4er/tinkercraft | CAD React, CSG/Manifold, STL e histórico | GPL-3.0 | Estudar conceitos e comparar; não copiar ao produto comercial fechado sem conformidade com GPL |
| https://github.com/MaxSikorski/jumpstart-3d | CAD de navegador pronto para uso | **AGPL-3.0 no LICENSE do fork** | Avaliar como aplicativo separado ou sob conformidade AGPL; não tratar como MIT |
| https://github.com/ahujasid/mcp-for-blender | ponte MCP para Blender | MIT | Integração local futura, com autenticação e controles |
| https://github.com/storytold/cadcraft | CAD e automação via MCP | MIT / Apache-2.0 declaradas | Avaliar integração por CLI, não copiar toda aplicação |
| https://github.com/mrdoob/three.js | renderização WebGL, loaders/exporters | MIT | Já presente no protótipo |
 
**Atenção JumpStart:** o README atribui a versão original a J.Siwek sob MIT, mas o arquivo LICENSE deste fork é AGPL-3.0. Dependências e arquivos específicos devem ser auditados caso se pretenda reutilizar partes.

## Ordem prática e critérios de aceitação
1. Studio visual: abrir STL/OBJ/GLB, rotação fluida, medida, cor e salvar GLB — já codificado na oficina de teste, **ainda carece smoke test visual real**.
2. Cortador: executar pipeline de teste do 3mfModelCut, fatiar dois modelos de controle, confirmar malha fechada e download das duas peças.
3. Acabamento: detecção de bordas abertas, normais invertidas e faces degeneradas. Recalcular normais não conta como reparo geométrico.
4. Manipulação: escala em mm, alinhamento, translação, rotação, desfazer/refazer e histórico.
5. Blender: ponte local para reparos avançados e exportação final. Não expor uma porta de automação sem autenticação.
6. IA: somente conectores gratuitos/com créditos explicitamente disponíveis; Cloudflare Worker não gera IA 3D pesada sozinho.

## Custos
- Three.js/Threepipe, oficina local e motor MIT de corte: sem custo obrigatório de licença nem inferência.
- Hospedagem e processamento remoto não necessariamente gratuitos.
- Modelos Hunyuan3D/TRELLIS exigem hardware compatível ou serviços de inferência, potencialmente pagos.

## Segurança e conformidade
Não usar tokens em arquivos ou screenshots, não importar executáveis arbitrários de repos pesquisados, fixar commits/versões, validar licenças e testar artefatos em branch de desenvolvimento. Não prometer ausência de bugs antes de executar testes.

## Situação
Documento de arquitetura atualizado. Não representa implementação do Threepipe nem do editor de corte no site público.
