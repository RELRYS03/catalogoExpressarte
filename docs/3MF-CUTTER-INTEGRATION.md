# Express'Arte · Integração do cortador 3MF / STL
## O que é realmente entregue
O projeto [ialrajhi/3mfModelCut](https://github.com/ialrajhi/3mfModelCut) foi selecionado como motor inicial de corte por planos, recorte por cor, conectores e validação de dois sólidos. A licença do repositório está em MIT. A autoria original é de Faisal Alrajhi, copyright 2026.

A aplicação original é **React/Next 16, Vinext, TypeScript e Three.js**; nosso catálogo atual é HTML estático. Colar arquivos JS da aplicação em uma página do catálogo quebraria imports e runtime. Por isso a integração é isolada.

## Teste gratuito sem serviços pagos
1. No GitHub Actions, execute `Validate open-source 3MF Cutter` na branch `feature/image-to-relief-3d`. O workflow baixa o upstream e verifica TypeScript, testes unitários de geometria e build.
2. No Windows, também pode executar:
```powershell
git clone https://github.com/ialrajhi/3mfModelCut.git
cd 3mfModelCut
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```
3. Acesse http://localhost:3000 para testar arquivos seus de forma local. Requer Node >=22.13 e pnpm 11.
4. Confira corte, fechamento de ambos sólidos, malha, folga dos conectores, volumes e importação dos arquivos no Bambu Studio antes de dizer que está pronto para impressão.

## Como publicar futuramente dentro do Studio
Migrar/capsular o editor como aplicação independente no subdomínio `corte.seu-dominio` ou rota dedicada de um host com suporte a Vinext. Em seguida oferecer navegação de ida/volta no Studio. Não usar iframe sem CSP e isolamento adequados. A primeira implantação NÃO altera a versão de produção do catálogo.

## Atenções
- O processo é local no browser; não exige assinatura nem créditos.
- Arquivos 3MF muito complexos e geometria degenerada podem falhar; o upstream documenta limite de entrada 50 MB e 1,5 milhão de triângulos.
- Faça auditoria de dependências, valide a build e preserve LICENSE ao redistribuir.
- Esta integração inicial prepara teste e distribuição do código separado; ainda não está embutida no site nem validada com peças reais.
