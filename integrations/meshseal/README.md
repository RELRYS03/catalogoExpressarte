# Express'Arte · Reparação Meshseal integrada
O Studio usa diretamente o **motor Meshseal CLI 0.1.3**, em um serviço local Node. É uma integração de execução real, **não um efeito visual de reparo**. O site e a ponte são desenvolvidos pela Express'Arte; o motor [jkavalik/meshseal](https://github.com/jkavalik/meshseal) tem licença MIT (copyright 2026 meshseal contributors).

## Como executar no Windows
1. Instale Git, CMake e compilador C++ (Visual Studio Build Tools com C++). Use Node >= 20.
2. Abra PowerShell e compile o motor:
```powershell
git clone --branch v0.1.3 https://github.com/jkavalik/meshseal.git
cmake -S .\meshseal -B .\meshseal-build -DCMAKE_BUILD_TYPE=Release -DMESHSEAL_BUILD_TESTS=OFF
cmake --build .\meshseal-build --config Release --target meshseal_cli
```
3. Na pasta clonada do `catalogoExpressarte`, branch `feature/image-to-relief-3d`, execute:
```powershell
$env:MESHSEAL_CLI = 'C:\\CAMINHO\\PARA\\meshseal-build\\cli\\Release\\meshseal_cli.exe'
node .\integrations\meshseal\meshseal-local.mjs
```
4. Abra **http://127.0.0.1:8768/studio-oficina-3d.html**. Importe STL/OBJ/GLB, clique **Reparar e abrir resultado**, e depois **Baixar STL reparado**. A ponte atende em localhost, sem enviar malhas para serviços externos.

## Garantias e limitações
- A interface reabre a saída em STL e permite inspecionar/exportar. **Ainda não valida topologia completa no navegador**; use Bambu Studio e ferramentas de diagnóstico antes de imprimir.
- O cliente converte OBJ/GLB em malha STL antes da reparação; cores e texturas não são preservadas nessa conversão. Para 3MF multicolorido, utilize outro fluxo até termos suporte 3MF nativo no Studio.
- Serviço limitado a 40 MB de entrada, 120 segundos por operação e uma operação por vez. Apenas loopback/localhost autorizado.
- É um processo de desenvolvimento local. Não faça deploy deste serviço no Cloudflare e não exponha a porta à internet.
- Meshseal 0.1.3 está em versão **alpha** e pode não reparar todos os arquivos. Preserve o STL original.

## Validação automatizada
GitHub Actions `Build and validate Meshseal native repair` compila o C++ real e tenta reparar um **cubo STL com uma face ausente**; verifica independentemente que o resultado voltou fechado, sem arestas compartilhadas por mais de duas faces e sem mudança extrema de tamanho. A workflow não é um certificado de impressão para todos os modelos.

## Plano de evolução
Compilar e distribuir WASM auto-hospedado para remover também a necessidade da ponte local; essa etapa requer inspecionar a interface do módulo Emscripten, tamanhos de bundle e licenças.
