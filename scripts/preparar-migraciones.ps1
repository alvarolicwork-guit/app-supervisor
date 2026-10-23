$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ''
Write-Host '=== Preparacion de migraciones de App Supervisor ===' -ForegroundColor Cyan
Write-Host 'Este proceso es de solo lectura: auditoria, backup local y dry-runs.' -ForegroundColor Yellow
Write-Host 'No ejecuta migraciones con --apply ni despliega reglas.' -ForegroundColor Yellow
Write-Host ''

$keyPath = Read-Host 'Arrastra aqui el archivo JSON de la cuenta de servicio o pega su ruta'
$keyPath = $keyPath.Trim()
if ($keyPath.StartsWith('&')) {
    $keyPath = $keyPath.Substring(1).Trim()
}
$keyPath = $keyPath.Trim([char]34).Trim([char]39)

if (-not (Test-Path -LiteralPath $keyPath)) {
    Write-Host "No existe el archivo: $keyPath" -ForegroundColor Red
    exit 1
}

try {
    $key = Get-Content -LiteralPath $keyPath -Raw | ConvertFrom-Json
} catch {
    Write-Host 'El archivo no es un JSON valido.' -ForegroundColor Red
    exit 1
}

if ($key.type -ne 'service_account' -or -not $key.project_id -or -not $key.private_key) {
    Write-Host 'El JSON no parece una cuenta de servicio de Firebase/Google Cloud.' -ForegroundColor Red
    exit 1
}

$resolvedKey = (Resolve-Path -LiteralPath $keyPath).Path
$env:GOOGLE_APPLICATION_CREDENTIALS = $resolvedKey
$env:FIREBASE_PROJECT_ID = $key.project_id

Write-Host ''
Write-Host "Proyecto de la clave: $($key.project_id)" -ForegroundColor Green
Write-Host 'Cuenta de servicio: ' -NoNewline
Write-Host $key.client_email -ForegroundColor DarkGray

$appProject = $null
if (Test-Path '.firebaserc') {
    $appProject = (Get-Content '.firebaserc' -Raw | ConvertFrom-Json).projects.default
}

if ($appProject -and $appProject -ne $key.project_id) {
    Write-Host ''
    Write-Host "ATENCION: .firebaserc apunta a '$appProject' y la clave es de '$($key.project_id)'." -ForegroundColor Yellow
    $confirm = Read-Host 'Continuar de todos modos? (s/N)'
    if ($confirm -notin @('s', 'S', 'si', 'SI')) {
        Write-Host 'Cancelado.' -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ''
Write-Host '1/6 Auditoria (solo lectura)...' -ForegroundColor Cyan
& npm run migrate:audit
if ($LASTEXITCODE -ne 0) {
    Write-Host 'La auditoria fallo. Revisa el error antes de continuar.' -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host '2/6 Backup local...' -ForegroundColor Cyan
& npm run backup
if ($LASTEXITCODE -ne 0) {
    Write-Host 'El backup fallo. No se continuara con los dry-runs.' -ForegroundColor Red
    exit $LASTEXITCODE
}

$dryRuns = @(
    'migrate:personal-formo',
    'migrate:expires-at',
    'migrate:active-locks',
    'migrate:audit-fields'
)

$index = 3
foreach ($script in $dryRuns) {
    Write-Host ''
    Write-Host "$index/6 Dry-run: $script..." -ForegroundColor Cyan
    & npm run $script
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Fallo $script. Revisa el error antes de continuar." -ForegroundColor Red
        exit $LASTEXITCODE
    }
    $index += 1
}

Write-Host ''
Write-Host 'Listo. No se aplico ningun cambio.' -ForegroundColor Green
Write-Host 'Revisa la carpeta backups y los reportes de cada dry-run.' -ForegroundColor Green
Write-Host ''
Write-Host 'Para desplegar reglas/indices, la CLI debe ver el proyecto:' -ForegroundColor Yellow
Write-Host '  npx firebase projects:list' -ForegroundColor Yellow
Write-Host 'Si no aparece, inicia sesion con la cuenta duena del proyecto.' -ForegroundColor Yellow
