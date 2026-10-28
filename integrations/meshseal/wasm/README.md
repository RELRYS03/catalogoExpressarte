# Meshseal WASM — implantação no Express'Arte Studio
Motor: jkavalik/meshseal v0.1.3, MIT. A UI foi alterada para usar Web Worker com `repairStl`, eventos de progresso e validação `watertight`, sem servidor local.

## Build
Workflow `Build Meshseal WebAssembly for ExpressArte` compila com Emscripten e gera `meshseal.js` + `meshseal.wasm` (binários não devem ser simulados ou substituídos por stubs). O workflow produz um artefato `expressarte-meshseal-wasm` incluindo `studio-oficina-3d.html` e `integrations/meshseal/wasm/worker.js`.

## Publicação
Baixe o artefato da execução **bem-sucedida** e publique no mesmo diretório do site, preservando:
```
studio-oficina-3d.html
integrations/meshseal/wasm/worker.js
integrations/meshseal/wasm/meshseal.js
integrations/meshseal/wasm/meshseal.wasm
integrations/meshseal/wasm/LICENSE-meshseal.txt
```
Sem os dois arquivos produzidos por Emscripten, o botão informa erro em vez de fingir sucesso. Não execute no `file://`: use HTTPS ou servidor estático.

## Aceitação
Testar arquivo STL com furo, confirmar que Meshseal informa `watertight`, reabrir no visualizador, baixar STL reparado e testar no Bambu Studio. Comparar medidas originais/reparadas. Nenhuma geração de modelo por IA ocorre aqui.

## Segurança
Arquivos STL permanecem no navegador. Web Worker é terminado após uso. Saída parcial/broken é rejeitada antes da reimportação. Preserve a licença MIT do motor e verifique o resultado para impressão.
