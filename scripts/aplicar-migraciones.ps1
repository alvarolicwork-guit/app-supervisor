$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ''
Write-Host '=== Aplicar migraciones de App Supervisor ===' -ForegroundColor Cyan
Write-Host 'Este proceso MODIFICA Firestore. Solo debe ejecutarse tras revisar los dry-runs.' -ForegroundColor Red
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

$appProject = $null
if (Test-Path '.firebaserc') {
    $appProject = (Get-Content '.firebaserc' -Raw | ConvertFrom-Json).projects.default
}

if ($appProject -and $appProject -ne $key.project_id) {
    Write-Host "La clave es de '$($key.project_id)' y .firebaserc apunta a '$appProject'." -ForegroundColor Red
    Write-Host 'Se cancela para no escribir en el proyecto equivocado.' -ForegroundColor Red
    exit 1
}

$resolvedKey = (Resolve-Path -LiteralPath $keyPath).Path
$env:GOOGLE_APPLICATION_CREDENTIALS = $resolvedKey
$env:FIREBASE_PROJECT_ID = $key.project_id

Write-Host ''
Write-Host "Proyecto: $($key.project_id)" -ForegroundColor Green

Write-Host ''
Write-Host 'Backup previo...' -ForegroundColor Cyan
& npm run backup
if ($LASTEXITCODE -ne 0) {
    Write-Host 'El backup fallo. No se aplicara nada.' -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Se aplicaran estas migraciones:' -ForegroundColor Yellow
Write-Host '  - personalFormo invalido -> 0'
Write-Host '  - expiresAt de supervisor cerrado -> cierre + 9 dias'
Write-Host '  - bloqueos para servicios abiertos'
Write-Host '  - updatedAt/updatedBy en documentos existentes'
Write-Host ''
$confirm = Read-Host 'Escribe APLICAR para continuar'
if ($confirm -ne 'APLICAR') {
    Write-Host 'Cancelado. No se modifico nada.' -ForegroundColor Yellow
    exit 1
}

$migrations = @(
    @('personalFormo', 'scripts/fix-personal-formo.mjs'),
    @('expiresAt', 'scripts/backfill-expires-at.mjs'),
    @('bloqueos activos', 'scripts/backfill-active-locks.mjs'),
    @('campos de auditoria', 'scripts/backfill-audit-fields.mjs')
)

foreach ($migration in $migrations) {
    $label = $migration[0]
    $file = $migration[1]
    Write-Host ''
    Write-Host "Aplicando $label..." -ForegroundColor Cyan
    & node $file --apply
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Fallo $label. Deteniendo." -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Write-Host ''
Write-Host 'Verificacion final (solo lectura)...' -ForegroundColor Cyan
& npm run migrate:audit
if ($LASTEXITCODE -ne 0) {
    Write-Host 'La verificacion final fallo. Revisa el estado antes de desplegar.' -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Migraciones aplicadas.' -ForegroundColor Green
Write-Host 'El siguiente paso es desplegar reglas e indices.' -ForegroundColor Green
