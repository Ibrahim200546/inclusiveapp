$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$certDir = Join-Path $rootDir "certs"
$pfxPath = Join-Path $certDir "localhost.pfx"
$cerPath = Join-Path $certDir "localhost.cer"
$passphrase = "inclusiveapp-localhost"
$password = ConvertTo-SecureString -String $passphrase -Force -AsPlainText

New-Item -ItemType Directory -Path $certDir -Force | Out-Null

$existing = Get-ChildItem Cert:\CurrentUser\My |
  Where-Object { $_.Subject -eq "CN=localhost" -and $_.FriendlyName -eq "inclusiveapp-localhost-tts" } |
  Sort-Object NotAfter -Descending |
  Select-Object -First 1

if (-not $existing) {
  $existing = New-SelfSignedCertificate `
    -FriendlyName "inclusiveapp-localhost-tts" `
    -Subject "CN=localhost" `
    -DnsName "localhost" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyExportPolicy Exportable `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(3)
}

Export-PfxCertificate -Cert $existing -FilePath $pfxPath -Password $password -Force | Out-Null
Export-Certificate -Cert $existing -FilePath $cerPath -Force | Out-Null
Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null

Write-Output "Created trusted localhost certificate."
Write-Output "PFX_PATH=$pfxPath"
Write-Output "PFX_PASSPHRASE=$passphrase"
