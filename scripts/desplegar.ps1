$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
$env:FIREBASE_CLI_DISABLE_UPDATE_CHECK = 'true'

Write-Host ''
Write-Host '=== Desplegar reglas e indices de App Supervisor ===' -ForegroundColor Cyan
Write-Host 'Este proceso cambia las reglas de Firestore en produccion.' -ForegroundColor Red
Write-Host ''

$projectsJson = ((& npx --no-install firebase projects:list --json) -join "`n")
if ($LASTEXITCODE -ne 0) {
    Write-Host 'No se pudo listar los proyectos. Revisa el login de Firebase CLI.' -ForegroundColor Red
    exit $LASTEXITCODE
}

$projects = $projectsJson | ConvertFrom-Json
$project = $projects.result | Where-Object { $_.projectId -eq 'registro-de-supervisor' }
if (-not $project) {
    Write-Host 'La cuenta actual de la CLI no ve registro-de-supervisor.' -ForegroundColor Red
    Write-Host 'Ejecuta: npx firebase login:use alvarlicquin@gmail.com' -ForegroundColor Yellow
    exit 1
}

$active = ((& npx --no-install firebase use) | Select-Object -Last 1).Trim()
if ($active -ne 'registro-de-supervisor') {
    Write-Host "Proyecto activo: $active. Cambiando a registro-de-supervisor..." -ForegroundColor Yellow
    & npx --no-install firebase use registro-de-supervisor
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host 'Proyecto: registro-de-supervisor' -ForegroundColor Green
Write-Host 'Se desplegaran firestore.rules y firestore.indexes.json.' -ForegroundColor Yellow
$confirm = Read-Host 'Escribe DESPLEGAR para continuar'
if ($confirm -ne 'DESPLEGAR') {
    Write-Host 'Cancelado. No se desplego nada.' -ForegroundColor Yellow
    exit 1
}

Write-Host ''
Write-Host 'Desplegando reglas...' -ForegroundColor Cyan
& npm run deploy:rules
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Fallo el despliegue de reglas.' -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Desplegando indices...' -ForegroundColor Cyan
& npm run deploy:indexes
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Fallo el despliegue de indices.' -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Reglas e indices desplegados.' -ForegroundColor Green
