@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado.
  echo Instale Node.js 20.6 ou superior e tente novamente.
  pause
  exit /b 1
)

echo.
echo EXPRESSINHO IA - MODO LOCAL
echo.
echo Verificando Node.js...
node --version
echo.
echo Confirme que o Ollama esta aberto e que ha um modelo de conversa instalado.
echo O servico fica restrito ao proprio computador: 127.0.0.1
echo.
echo Quando o servidor iniciar, abra: http://127.0.0.1:8767/
echo Para verificar: http://127.0.0.1:8767/api/health
echo Para encerrar, pressione Ctrl+C nesta janela.
echo.

if exist "%~dp0expressinho-core\.env" (
  node --env-file="%~dp0expressinho-core\.env" "%~dp0expressinho-core\server.mjs"
) else (
  node "%~dp0expressinho-core\server.mjs"
)
pause
