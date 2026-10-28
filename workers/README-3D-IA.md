# Express'Arte — Image to 3D IA (Hunyuan3D v3)

Código em desenvolvimento na branch `feature/image-to-relief-3d`. O módulo **não está publicado ou operacional até configurar serviço e autenticação**.

## O que foi integrado
- Endpoint confirmado no código Storytold ArtCraft: `fal-ai/hunyuan3d-v3/image-to-3d`.
- Interface: `imagem-para-3d-ia.html`. Envia PNG/JPEG/WebP, acompanha fila e oferece links GLB/OBJ.
- Backend: `workers/hunyuan3d-worker.js`. Protege a credencial da fal.ai no servidor, usa fila REST e limita imagens (~5MB).
- A saída é artefato 3D e **não é STL pronto para impressão**. Revisar/reparar malha no Blender e fatiar no Bambu Studio.

## Necessário para funcionamento
1. Ter conta fal.ai com créditos e uma API key.
2. Publicar o Worker no Cloudflare com rotas `/api/3d/*` **no mesmo domínio** da página.
3. Secret `FAL_KEY` no ambiente do Worker e variável `ALLOWED_ORIGIN` com origem exata HTTPS do site (sem barra final).
4. Vincular obrigatoriamente `RATE_LIMITER` como Cloudflare rate limiting binding, configurado no dashboard. O código recusa chamadas caso falte.
5. **Proteger as rotas pagas com Cloudflare Access ou autenticação equivalente verificada no edge**. Checagem de Origin NÃO é autenticação; sem Access, não publique. Também aplicar cotas de gastos na conta fal.ai.
6. Fazer smoke test real no ambiente configurado com 1 imagem pequena. Validar download do GLB e abrir no Blender.

## Limitações / próximos passos
- O módulo não usa a GPU local, e a fal.ai é um serviço externo sujeito a preço e disponibilidade.
- O app ArtCraft é Rust/Tauri e não oferece automaticamente uma API HTTP local por estar instalado. Aqui utilizamos o mesmo endpoint de geração identificado no código aberto, não clonagem completa do aplicativo.
- A licença do código fonte Storytold ArtCraft é MIT/Apache-2.0; licenças dos modelos e serviços são independentes. Não copiamos branding/código proprietários.
- Integração com `main` somente após o teste de ponta a ponta; o PR fica em draft até então.

Fontes:
- https://github.com/storytold/artcraft
- https://github.com/storytold/artcraft/blob/main/crates/api_clients/fal_client/src/requests_old/http/object/http_hunyuan3d_v3_image_to_3d.rs
- https://fal.ai/models/fal-ai/hunyuan3d-v3/image-to-3d/api
