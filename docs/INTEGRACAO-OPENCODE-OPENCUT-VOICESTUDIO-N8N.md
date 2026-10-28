# Express’Arte — OpenCode, OpenCut, VoiceStudio e n8n
Data: 2026-10-28. Registro de integração, **não ativação**.

## Responsabilidades
- OpenCode (https://opencode.ai/) — agente de programação; trabalha no checkout local, propõe alterações, executa testes e cria commits quando autorizado. Utilizar a configuração do FreeLLMAPI/RK10 apenas depois de comprovar protocolo compatível e segurança.
- OpenCut (https://github.com/OpenCut-app/OpenCut) — editor de vídeo; o projeto principal está em reescrita. Testar primeiro https://github.com/OpenCut-app/opencut-classic e preservar atribuições/licença.
- VoiceStudio (https://github.com/debpalash/voicestudio) — ferramentas locais de voz, transcrição e dublagem. Verificar requisitos de GPU/CPU e API antes de automatizar.
- n8n (https://github.com/n8n-io/n8n) — automações internas, ex.: solicitação de render → tarefa → validação de arquivo → revisão → publicação. Self-host Community não pode ser revendido como plataforma de automação a clientes sem analisar licença SUL.

## Etapas de validação (sem assinaturas)
1. OpenCode: instalar **uma única versão** no Windows e abrir clone da branch feature/image-to-relief-3d. Verificar que executa checagens de sintaxe e não comita na main.
2. n8n: instalar em ambiente próprio, configurar credenciais pelo gerenciador de secrets e testar webhook local sem divulgar porta publicamente.
3. VoiceStudio: fazer uma transcrição curta e testar exportação de áudio em português; nunca clonar voz de terceiros sem autorização.
4. OpenCut Classic: abrir vídeo curto e exportar arquivo MP4 de teste.
5. Só conectar serviços via APIs estáveis, com permissões mínimas; logs não devem conter credenciais nem arquivos pessoais.

## Arquitetura sugerida
Usuário → Studio 3D / RK10 → Fila n8n (apenas automação interna) → OpenCode (desenvolvimento) / Blender (modelos) / VoiceStudio (voz) / OpenCut (vídeos) → testes → aprovação → GitHub/Cloudflare.

As ferramentas de vídeo e voz **não geram STL**; nenhum dos produtos substitui o motor de geometria 3D.

## Estado
Links e atribuições pesquisados, integração documentada. Nenhum processo foi iniciado no PC, aplicativo foi instalado ou API foi conectada neste commit.
