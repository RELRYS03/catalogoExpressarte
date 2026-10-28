# Replica — reconhecimento Express’Arte Studio 3D
Atualizado: 2026-10-28. Baseado nos arquivos do repositório (não em uma inspeção visual do navegador).

## Telas e fluxos existentes
| Tela | Arquivo | Fluxo | Estado |
|---|---|---|---|
| Oficina 3D | studio-oficina-3d.html | abrir STL/OBJ/GLB → girar → medir → aplicar cor → exportar GLB/STL | Implementado, browser smoke test pendente |
| Relevo 2,5D | imagem-para-3d.html | enviar PNG/JPG/WebP → escolher parâmetros → gerar malha → STL | Implementado, browser smoke test pendente |
| Visualizador | visualizador-3d.html | importar STL/OBJ/GLB → inspecionar | Implementado, browser smoke test pendente |
| IA remota | imagem-para-3d-ia.html | solicitar inferência via Worker externo | Depende da configuração de provedor pago, NÃO validado |
| Corte 3MF | implementação de terceiros | validar e dividir sólidos, exportar duas peças | Apenas pipeline de integração preparado |
| RK10 | integrations/freellmapi/rk10-bridge.mjs | sessão → modelo roteado → guardar histórico | Depende de chave válida e instalação local; NÃO testado no Windows |

## Lacunas prioritárias
1. Validar exportação STL → reimportação e geometria não vazia.
2. Validar carregamento de WebGL, importmap, dependências e erros de console.
3. Validar remoção de fundo PNG com imagem com pixels brancos e imagem com objetos de fundo branco.
4. Validar relevos watertight, orientation de normais, impressão na Bambu A1.
5. Validar importação/edição real de 3MF com corte sólido.
6. Exibir erros claros para arquivo inválido/grande, ausência de WebGL e CDN indisponível.
7. Armazenar contexto de IA por projeto e evitar perda após troca, testar compatibilidade do roteador.

## Competidores / padrões para estudo sem copiar interface
- Threepipe: bom motor de viewport; licença Apache-2.0.
- 3mfModelCut: cortes e conectores; licença MIT.
- TinkerCraft: UX CAD; GPL-3.0 exige conformidade.
Nenhum código de terceiros foi copiado nesta etapa Replica.

## Critérios de aceitação
- Upload/download em navegador Chromium real, sem erro JavaScript.
- STL/GLB com geometria reimportável, não apenas nome de arquivo.
- Para cortes, duas peças fechadas e passíveis de fatiamento.
- Mensagens de erro recuperáveis; sem cobrança invisível.
- Sem tocar na branch main até aprovação.
