# Borrowing System - Automated Setup Script
# Run from project root: .\scripts\setup.ps1

param(
    [string]$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL,
    [string]$SupabaseServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY,
    [string]$ResendApiKey = $env:RESEND_API_KEY
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "`n=== Borrowing System Setup ===" -ForegroundColor Cyan

# 1. Check .env.local
$envFile = Join-Path $ProjectRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "`n[1/5] Creating .env.local from template..." -ForegroundColor Yellow
    Copy-Item (Join-Path $ProjectRoot ".env.example") $envFile
    Write-Host "  Created .env.local - PLEASE FILL IN YOUR KEYS:" -ForegroundColor Red
    Write-Host "  - NEXT_PUBLIC_SUPABASE_URL"
    Write-Host "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    Write-Host "  - SUPABASE_SERVICE_ROLE_KEY"
    Write-Host "  - RESEND_API_KEY"
    Write-Host "  - EMAIL_FROM (use: Borrowing System <onboarding@resend.dev> for testing)"
    Write-Host "`n  Get Supabase keys from: Dashboard > Project Settings > API"
    Write-Host "  Get Resend key from: resend.com > API Keys"
    exit 1
}

Write-Host "[1/5] .env.local exists" -ForegroundColor Green

# Load .env.local
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$SupabaseServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SupabaseUrl -or $SupabaseUrl -like "*your-project*") {
    Write-Host "`nERROR: Fill in Supabase URL in .env.local first" -ForegroundColor Red
    exit 1
}

# 2. Install dependencies
Write-Host "`n[2/5] Installing dependencies..." -ForegroundColor Yellow
Set-Location $ProjectRoot
npm install --silent

# 3. Run tests
Write-Host "`n[3/5] Running tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) { Write-Host "Tests failed!" -ForegroundColor Red; exit 1 }
Write-Host "  All tests passed" -ForegroundColor Green

# 4. Generate admin setup token (if service key available)
if ($SupabaseServiceKey -and $SupabaseServiceKey -notlike "*your-service*") {
    Write-Host "`n[4/5] Generating admin setup token..." -ForegroundColor Yellow
    $token = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
    # Use hex from random bytes via .NET
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $token = [BitConverter]::ToString($bytes).Replace("-", "").ToLower()

    $headers = @{
        "apikey" = $SupabaseServiceKey
        "Authorization" = "Bearer $SupabaseServiceKey"
        "Content-Type" = "application/json"
        "Prefer" = "return=representation"
    }
    $expiresAt = (Get-Date).AddHours(24).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $body = @{ token = $token; expires_at = $expiresAt } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/setup_tokens" -Method POST -Headers $headers -Body $body
        $appUrl = if ($env:NEXT_PUBLIC_APP_URL) { $env:NEXT_PUBLIC_APP_URL } else { "http://localhost:3000" }
        Write-Host "`n  ADMIN SETUP URL (valid 24 hours):" -ForegroundColor Green
        Write-Host "  $appUrl/setup/$token" -ForegroundColor White -BackgroundColor DarkBlue
        Write-Host "`n  Open this URL to create your first admin account." -ForegroundColor Cyan
    } catch {
        Write-Host "  Could not create setup token automatically." -ForegroundColor Yellow
        Write-Host "  Run this SQL in Supabase SQL Editor instead:" -ForegroundColor Yellow
        Write-Host "  INSERT INTO setup_tokens (token, expires_at) VALUES (encode(gen_random_bytes(32), 'hex'), NOW() + INTERVAL '24 hours') RETURNING token;"
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "`n[4/5] Skipping admin token (add SUPABASE_SERVICE_ROLE_KEY to .env.local)" -ForegroundColor Yellow
}

# 5. Start dev server reminder
Write-Host "`n[5/5] Ready!" -ForegroundColor Green
Write-Host "  Run: npm run dev"
Write-Host "  Then open: http://localhost:3000"
Write-Host "`n  BEFORE first use, run migrations in Supabase SQL Editor:"
Write-Host "    1. supabase/migrations/001_initial_schema.sql"
Write-Host "    2. supabase/migrations/002_rls_policies.sql"
Write-Host "    3. supabase/migrations/003_storage_policies.sql"
Write-Host "  Create storage buckets: inventory-photos (public), borrower-photos, transaction-photos (private)"
Write-Host ""
