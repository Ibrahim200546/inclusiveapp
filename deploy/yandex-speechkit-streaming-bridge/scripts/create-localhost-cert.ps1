$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$certDir = Join-Path $rootDir "certs"
$pfxPath = Join-Path $certDir "localhost.pfx"
$cerPath = Join-Path $certDir "localhost.cer"
$passphrase = "inclusiveapp-localhost"
$password = ConvertTo-SecureString -String $passphrase -Force -AsPlainText
$computerName = $env:COMPUTERNAME

New-Item -ItemType Directory -Path $certDir -Force | Out-Null

$ipv4Addresses = @(
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -and
      $_.IPAddress -ne "127.0.0.1" -and
      -not $_.IPAddress.StartsWith("169.254.")
    } |
    Select-Object -ExpandProperty IPAddress -Unique
)

$sanEntries = @(
  "DNS=localhost",
  "DNS=$computerName"
)

foreach ($ip in $ipv4Addresses) {
  $sanEntries += "IP=$ip"
}

$existing = Get-ChildItem Cert:\CurrentUser\My |
  Where-Object { $_.Subject -eq "CN=localhost" -and $_.FriendlyName -eq "inclusiveapp-localhost-tts" } |
  Sort-Object NotAfter -Descending |
  Select-Object -First 1

if (-not $existing) {
  $existing = New-SelfSignedCertificate `
    -FriendlyName "inclusiveapp-localhost-tts" `
    -Subject "CN=localhost" `
    -DnsName @("localhost", $computerName) `
    -TextExtension @("2.5.29.17={text}$($sanEntries -join '&')") `
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

Write-Output "Created trusted localhost/LAN certificate."
Write-Output "PFX_PATH=$pfxPath"
Write-Output "CER_PATH=$cerPath"
Write-Output "PFX_PASSPHRASE=$passphrase"
Write-Output "HOSTNAMES=localhost,$computerName"
Write-Output "IP_ADDRESSES=$($ipv4Addresses -join ',')"
