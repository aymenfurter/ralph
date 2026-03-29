# setup_env.ps1
# Usage:
#   .\setup_env.ps1                # Machine scope (global, requires Admin)
#   .\setup_env.ps1 -Scope User    # Current user only

param(
    [ValidateSet('User', 'Machine')]
    [string]$Scope = 'Machine'
)

$ErrorActionPreference = 'Stop'

$EnvFile = ".env"
$TemplateFile = ".env.template"

function New-TemplateFile {
@"
# Telegram Bot Configuration
RALPH_TELEGRAM_BOT_TOKEN=your_token_here
RALPH_TELEGRAM_CHAT_ID=your_chat_id_here
RALPH_TELEGRAM_ALLOWED_USERS=user1,user2
RALPH_TELEGRAM_STATUS_INTERVAL=60

# OpenAI Configuration
RALPH_OPENAI_API_KEY=your_openai_key_here
"@ | Set-Content -Path $TemplateFile -Encoding UTF8

    Write-Host "Created $TemplateFile"
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
    Write-Host "WARNING: $EnvFile not found."
    New-TemplateFile
    Write-Host "Please copy $TemplateFile to $EnvFile, fill in your values, and run this script again."
    exit 1
}

if ($Scope -eq 'Machine') {
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).
        IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if (-not $isAdmin) {
        throw "Machine scope requires running PowerShell as Administrator."
    }
}

Write-Host "Applying variables from $EnvFile to scope: $Scope"

Get-Content -LiteralPath $EnvFile | ForEach-Object {
    $line = $_.Trim()

    if ([string]::IsNullOrWhiteSpace($line)) { return }
    if ($line.StartsWith('#')) { return }

    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }

    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }

    if ([string]::IsNullOrWhiteSpace($key) -or [string]::IsNullOrWhiteSpace($value)) { return }

    $current = [Environment]::GetEnvironmentVariable($key, $Scope)
    if ($current -eq $value) {
        Write-Host "Unchanged: $key"
        return
    }

    [Environment]::SetEnvironmentVariable($key, $value, $Scope)
    Set-Item -Path "Env:$key" -Value $value   # apply to current session too
    Write-Host "Set $key ($Scope)"
}

Write-Host ""
Write-Host "✅ Done. Variables are now persisted at scope: $Scope"
Write-Host "Open a new terminal for other processes to see the changes."
