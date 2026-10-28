# RK10 — ponte local FreeLLMAPI (primeira implementação)

A instalação FreeLLMAPI Desktop em `C:\\Users\\relry\\AppData\\Local\\Programs\\freellmapi-desktop` deve estar **em execução** no Windows. A pasta indica onde foi instalada, mas não permite acesso remoto pelo GitHub.

## O que funciona neste módulo
- Encaminha `/ask` para a API local compatível OpenAI `/v1/chat/completions` com modelo `auto`, onde o FreeLLMAPI escolhe e faz fallback.
- Preserva em arquivo local privado histórico recente de cada `session_id` e notas de contexto consolidado. Outra IA recebe o histórico em cada nova chamada.
- Indica `served_model` e `fallback_attempts` quando o roteador informar.
- Escuta **somente 127.0.0.1**, nunca deve ser publicado no Cloudflare nem configurado como endpoint público.
- Não gera 3D nem controla Blender sozinho. Ações e testes de código exigem agentes/ponte com permissões apropriadas.
- Requer uma **chave unificada FreeLLMAPI** válida e provedores realmente habilitados, com quotas disponíveis.

## Rodar (PowerShell)
```powershell
$env:FREELLMAPI_API_KEY = 'COLE_SUA_CHAVE_AQUI_SOMENTE_NO_SEU_PC'
node .\integrations\freellmapi\rk10-bridge.mjs
```
A chave acima é apenas exemplo: não compartilhe sua chave nem a adicione aos commits.

## Testar
```powershell
Invoke-RestMethod http://127.0.0.1:8767/health
$body = @{session_id='expressarte-studio';prompt='Resuma nossa meta: importar STL, cortar em duas peças fechadas e validar a impressão.'} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8767/ask -ContentType 'application/json' -Body $body
```
## Troca suave de IA
Quando o modelo A falha, o próprio FreeLLMAPI pode escolher o modelo B conforme suas chaves, prioridades e regras. Como nossa ponte salva o histórico em `.rk10-private`, a conversa retomada conserva decisões anteriores. **Não existe transferência automática do raciocínio interno de um modelo para outro**; transferimos mensagens e notas de estado. O contexto preservado é limitado às últimas 30 mensagens mais as notas (até 12 mil caracteres), e não equivale a memória ilimitada.

## Produção e segurança
Não use a ponte em um website público: não há login, autenticação de usuário, autorização de ferramentas nem isolamento multiusuário. É exclusivamente um protótipo de uso local, com loopback. Não exponha a porta por proxy/túnel. Configure controle de acesso e sessões autenticadas antes de integrar ao site em produção.

## Nota sobre uso
O FreeLLMAPI permite roteamento por muitos provedores, mas oferta gratuita depende de chaves, quotas, termos e disponibilidade reais. Alguns serviços gratuitos podem restringir uso comercial; audite as condições específicas. O software ser aberto não torna inferência de IA ilimitada.
