---
name: Studio QA
description: Auditoria de funcionalidades reais e testes para o Studio 3D.
---
# QA da Express'Arte
- Conferir `tests/browser/studio.spec.mjs`, `tests/meshseal/verify_repair.py` e workflows GitHub Actions.
- Testar STL defeituoso, importação/exportação, erros de console e downloads reais.
- Verificar tamanho/volume e topologia de cada STL reparado.
- Uma mensagem de sucesso na interface não equivale a resultado validado.
- Se binários WASM ainda não estão publicados, classificar reparo no navegador como **pendente**.
- Produzir relatório: funcionalidade, comando, evidência, status e falha reproduzível.
- Não aprovar PR sem evidência da execução do teste.
