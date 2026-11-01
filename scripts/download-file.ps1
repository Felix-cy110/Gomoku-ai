param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $true)][string]$Destination
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$partialDownload = $Destination + '.partial'
Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $partialDownload -TimeoutSec 180
Move-Item -LiteralPath $partialDownload -Destination $Destination -Force
