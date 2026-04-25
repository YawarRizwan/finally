# Start the FinAlly container on Windows (PowerShell).
# Idempotent: safe to re-run. Pass -Build to force an image rebuild,
# -Open to open the app in the default browser.

[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$Open
)

$ErrorActionPreference = 'Stop'

$ImageName     = 'finally:latest'
$ContainerName = 'finally'
$VolumeName    = 'finally-data'
$HostPort      = 8000
$ContainerPort = 8000

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Resolve-Path (Join-Path $ScriptDir '..')
Set-Location $RepoRoot

if (-not (Test-Path (Join-Path $RepoRoot '.env'))) {
    Write-Error "ERROR: .env not found at $RepoRoot\.env. Copy .env.example to .env and fill in OPENROUTER_API_KEY."
    exit 1
}

# Check whether the image exists (docker image inspect exits non-zero if not).
$imageExists = $false
docker image inspect $ImageName *> $null
if ($?) { $imageExists = $true }

if ($Build -or -not $imageExists) {
    Write-Host "Building image $ImageName..."
    docker build -t $ImageName .
    if (-not $?) { Write-Error 'docker build failed'; exit 1 }
} else {
    Write-Host "Image $ImageName already present. Use -Build to rebuild."
}

# Remove any previous container with the same name.
$existing = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $ContainerName }
if ($existing) {
    Write-Host "Removing existing container $ContainerName..."
    docker stop $ContainerName *> $null
    docker rm   $ContainerName *> $null
}

Write-Host "Starting container $ContainerName..."
docker run -d `
    --name $ContainerName `
    --env-file .env `
    -p "$HostPort`:$ContainerPort" `
    -v "$VolumeName`:/app/db" `
    --restart unless-stopped `
    $ImageName *> $null

if (-not $?) { Write-Error 'docker run failed'; exit 1 }

$Url = "http://localhost:$HostPort"
Write-Host "FinAlly is starting at $Url"
Write-Host "View logs with: docker logs -f $ContainerName"

if ($Open) {
    Start-Process $Url
}
