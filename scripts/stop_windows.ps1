# Stop and remove the FinAlly container. Does NOT remove the data volume.
# Idempotent: a missing container is not an error.

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$ContainerName = 'finally'

$existing = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $ContainerName }
if ($existing) {
    Write-Host "Stopping container $ContainerName..."
    docker stop $ContainerName *> $null
    docker rm   $ContainerName *> $null
    Write-Host 'Stopped.'
} else {
    Write-Host "No container named $ContainerName is running."
}

Write-Host 'Note: the finally-data volume is preserved. Remove it manually with:'
Write-Host '  docker volume rm finally-data'
