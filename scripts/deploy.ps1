# ============================================================================
# Deploy Invisionary su Supabase (Windows / PowerShell).
# Automatizza: link al progetto, applicazione migrazioni, deploy Edge Function.
#
# Prima esegui una volta:  npx supabase login
# Uso:                     .\scripts\deploy.ps1 -ProjectRef <ref>
#
# NB: i SECRET e il SEED restano manuali (contengono chiavi private):
#   npx supabase secrets set ANTHROPIC_API_KEY=... VOYAGE_API_KEY=... METAAPI_TOKEN=...
#   $env:SUPABASE_URL=...; $env:SUPABASE_SERVICE_ROLE_KEY=...; node scripts/seed-demo-users.mjs
# ============================================================================
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef
)

$ErrorActionPreference = 'Stop'

Write-Host "== Link al progetto $ProjectRef ==" -ForegroundColor Cyan
npx supabase link --project-ref $ProjectRef

Write-Host "== Applico le migrazioni (db push) ==" -ForegroundColor Cyan
Write-Host "Se il push non riconosce i file 000x, applica le migrazioni dal SQL Editor (vedi DEPLOY.md)." -ForegroundColor Yellow
npx supabase db push

$functions = @('ai-chat', 'ai-ingest', 'renewal-reminders', 'mt5-connect', 'mt5-sync')
foreach ($f in $functions) {
  Write-Host "== Deploy function: $f ==" -ForegroundColor Cyan
  npx supabase functions deploy $f
}

Write-Host ""
Write-Host "Deploy completato." -ForegroundColor Green
Write-Host "Restano da fare a mano (chiavi private):" -ForegroundColor Yellow
Write-Host "  1) npx supabase secrets set ANTHROPIC_API_KEY=... VOYAGE_API_KEY=... METAAPI_TOKEN=..."
Write-Host "  2) Utenti demo: imposta SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY e lancia node scripts/seed-demo-users.mjs"
Write-Host "  3) Authentication -> Email -> disattiva 'Confirm email' per la demo"
