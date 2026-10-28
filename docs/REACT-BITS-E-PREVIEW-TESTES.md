# React Bits — decisão técnica e validação da prévia
Fonte: https://github.com/DavidHDev/react-bits
Licença consultada: https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md — **MIT + Commons Clause**, não MIT puro. Permite usar componentes dentro de site/produto comercial, mas proíbe revender/redistribuir os próprios componentes, suas versões portadas ou as ferramentas como serviço equivalente.

## Compatibilidade
O Studio atual (`studio-oficina-3d.html`) é uma página estática HTML/JS com Three.js. React Bits oferece componentes React (JS/TS, CSS/Tailwind), que não podem ser inseridos diretamente em HTML sem introduzir React/build. Não instalar a biblioteca inteira nem mudar arquitetura do reparador 3D só para animações.

## Integração fase 2, após teste hospedado
- Começar com efeitos CSS simples, originais, inspirados por padrões visuais de interface (sem copiar/redistribuir componentes).
- Se já houver frontend React em outro módulo, avaliar individualmente componentes de loading, tabs, cards e navegação; conferir dependências, mobile, reduced-motion, performance WebGL e atribuição de licença.
- Nunca misturar efeitos pesados (shaders, partículas) com a renderização 3D no mobile sem benchmarks.

## Teste de homologação HTTPS
O workflow `.github/workflows/studio-preview-qa.yml` recebe a URL HTTPS da **prévia isolada** do Cloudflare Pages/Netlify e executa Playwright com um STL defeituoso e validação de download. Não executa deploy, não envia STL de cliente e não altera `main`.
O ambiente de prévia precisa conter os binários reais `meshseal.js` / `meshseal.wasm` obtidos de um job Meshseal aprovado.
O workflow não prova a fatiabilidade específica na Bambu Lab A1; a validação manual no Bambu Studio continua pendente.
