$ErrorActionPreference = "Stop"

Write-Host "Express'Arte - configuração Cloudflare para Codex" -ForegroundColor Cyan
Write-Host "Este script instala as Cloudflare Skills no Codex e inicia o login OAuth do MCP."
Write-Host "Ele não cria recursos Cloudflare nem altera produção."

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  throw "Codex CLI não encontrado. Instale/abra o Codex CLI neste computador e execute novamente."
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw "npx não encontrado. Instale Node.js LTS neste computador e execute novamente."
}

Write-Host "[1/3] Instalando Cloudflare Skills globalmente..." -ForegroundColor Yellow
npx -y skills add cloudflare/skills --skill '*' --yes --global
if ($LASTEXITCODE -ne 0) { throw "A instalação das Cloudflare Skills falhou (código $LASTEXITCODE)." }

Write-Host "[2/3] Iniciando autenticação OAuth do Cloudflare MCP..." -ForegroundColor Yellow
codex mcp login cloudflare
if ($LASTEXITCODE -ne 0) { throw "O login OAuth do Cloudflare MCP não foi concluído." }

Write-Host "[3/3] Conferindo servidores MCP configurados..." -ForegroundColor Yellow
codex mcp list
if ($LASTEXITCODE -ne 0) { throw "Não foi possível verificar a lista de servidores MCP." }

Write-Host ""
Write-Host "Configuração concluída. Reinicie o Codex e abra este repositório confiável." -ForegroundColor Green
Write-Host "Depois, peça ao Codex para verificar acesso de leitura ao Cloudflare antes de criar recursos."
