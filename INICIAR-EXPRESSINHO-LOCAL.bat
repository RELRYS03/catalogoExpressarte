@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado. Instale ou habilite o Node.js antes de continuar.
  pause
  exit /b 1
)

echo.
echo EXPRESSINHO IA - MODO LOCAL
echo.
echo Confirme que o Ollama esta aberto e que ha um modelo de conversa instalado.
echo O servico fica restrito ao proprio computador: 127.0.0.1
echo.
echo Quando o servidor iniciar, abra: http://127.0.0.1:8767/
echo Para encerrar, pressione Ctrl+C nesta janela.
echo.
node "%~dp0expressinho-core\server.mjs"
pause
