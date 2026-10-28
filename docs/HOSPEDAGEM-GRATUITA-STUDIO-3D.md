# Hospedagem gratuita do Studio 3D Express'Arte — outubro/2026

## Decisão
**Preferencial:** Cloudflare Pages (https://developers.cloudflare.com/pages/) para Studio 3D comercial, caso os limites atuais sejam suficientes. Free: 500 builds/mês e 25 MiB por arquivo (conferir documentação atual antes de publicar).
**Reserva:** Netlify (https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) Free: US$0, 300 créditos/mês, bloqueio por limite; revisar consumo.
**Não usar como hospedagem comercial:** Vercel Hobby (uso não comercial) e GitHub Pages (não pode ser hospedagem grátis para negócio/ecommerce/SaaS).

## Como publicar apenas o ambiente de testes
1. Em GitHub Actions, execute `Meshseal WASM real browser end-to-end` na branch `feature/image-to-relief-3d`.
2. Só quando o job **passar de verdade**, baixe `expressarte-studio-preview-free-hosting`.
3. Descompacte e use a pasta contendo `index.html` como diretório estático num **novo projeto de preview** em Cloudflare Pages, separado do catálogo. Pelo Direct Upload, envie os ativos sem trocar o deploy existente.
4. Verifique as respostas HTTP do `index.html`, `meshseal.js`, `meshseal.wasm` e `worker.js`; a aplicação usa CDN Three.js, então requer internet para carregá-lo.
5. Teste importação e reparo de STL defeituoso, download e reimportação no navegador; conferir o resultado no Bambu Studio.
6. Só após testes, decidir sobre domínio e publicação final; preservar `main`.

## Restrições e estado
- O workflow cria um **artefato estático**, não altera DNS nem publica automaticamente.
- Os binários WASM devem ser gerados pela compilação original; sem sucesso do job, não haverá preview.
- O empacotamento atual contém apenas Oficina 3D e dependências WASM; links do menu para outras páginas do catálogo/gerador exigem empacotar as respectivas páginas antes de uma publicação completa.
- Nunca enviar tokens/API keys ao front-end e nunca incluir arquivos STL dos clientes em artefatos.
- Preços e limites mudam. Confirmar na fonte do provedor antes de contratar/ativar.
- Deploy real e configuração de domínio **não executados** nesta sessão.
