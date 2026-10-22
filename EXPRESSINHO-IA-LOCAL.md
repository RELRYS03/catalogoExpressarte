# Expressinho IA — primeira base local

## O que esta etapa faz

- Serve o catálogo local em http://127.0.0.1:8767/.
- Conecta o painel do Expressinho ao Ollama local, sem colocar chaves de API no navegador.
- Mantém uma base de fatos comerciais aprovados em knowledge.json.
- Se o Ollama não estiver disponível, o catálogo continua abrindo e o painel usa respostas iniciais limitadas.
- Não salva conversas como memória permanente e não executa ações no Blender ou na impressora.

## Como iniciar no Windows

1. Abra o aplicativo Ollama e confirme que há um modelo de conversa instalado.
2. Execute INICIAR-EXPRESSINHO-LOCAL.bat na pasta principal do catálogo.
3. Abra http://127.0.0.1:8767/ no navegador.
4. Para verificar o serviço local, abra http://127.0.0.1:8767/api/health.

Por padrão, o servidor escolhe o primeiro modelo de conversa que encontrar no Ollama. Para fixar um modelo, defina a variável de ambiente OLLAMA_MODEL antes de iniciar o arquivo BAT.

## Segurança e limites

- O servidor escuta somente em 127.0.0.1; não fica exposto à rede.
- Não há dependências npm nem chaves de API.
- O painel público do site continua em modo de respostas iniciais enquanto não houver um backend HTTPS seguro publicado.
- A base só deve receber preços, produtos ou regras confirmados pelo proprietário.
- Esta etapa não altera o Blender, o fatiador, a impressora ou arquivos de fabricação.
