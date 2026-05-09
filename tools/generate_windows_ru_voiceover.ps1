param(
  [string]$Manifest = "tools/ru_voiceover_manifest.json",
  [string]$Prompt = "tools/elevenlabs_ru_alippe_prompt.txt",
  [int]$Limit = [int]::MaxValue,
  [switch]$Force,
  [string]$VoiceName = "Microsoft Irina Desktop"
)

$ErrorActionPreference = "Stop"

function Convert-ToMp3Target {
  param([string]$Target)
  return ($Target -replace "\.wav$", ".mp3").Replace("\", "/")
}

function Clean-SpeechText {
  param([string]$Text)
  if ($null -eq $Text) { return "" }
  return (($Text -replace "[\u200B-\u200D\uFE0E\uFE0F]", "") -replace "\s+", " ").Trim()
}

function Test-ExistingInRoots {
  param([string[]]$Roots, [string]$RelativePath)
  foreach ($root in $Roots) {
    $candidate = Join-Path $root $RelativePath
    if (!(Test-Path -LiteralPath $candidate)) { return $false }
    if ((Get-Item -LiteralPath $candidate).Length -le 0) { return $false }
  }
  return $true
}

$workspace = (Resolve-Path ".").Path
$roots = @(
  (Join-Path $workspace "public/original/sounds/ru"),
  (Join-Path $workspace "public/sounds/ru")
)

$ffmpeg = Join-Path $workspace "node_modules/ffmpeg-static/ffmpeg.exe"
if (!(Test-Path -LiteralPath $ffmpeg)) {
  $ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
}
if (!$ffmpeg -or !(Test-Path -LiteralPath $ffmpeg)) {
  throw "ffmpeg not found."
}

$manifestItems = Get-Content -LiteralPath $Manifest -Raw -Encoding UTF8 | ConvertFrom-Json
$phraseMap = @{}
if (Test-Path -LiteralPath $Prompt) {
  foreach ($line in Get-Content -LiteralPath $Prompt -Encoding UTF8) {
    $clean = Clean-SpeechText $line
    if (!$clean) { continue }
    $parts = $clean -split " ", 2
    if ($parts.Count -lt 2) { continue }
    $phraseMap[(Clean-SpeechText $parts[1]).ToLowerInvariant()] = "$($parts[0]). $($parts[1])."
  }
}

$selected = New-Object System.Collections.Generic.List[object]
foreach ($item in $manifestItems) {
  $relativePath = Convert-ToMp3Target $item.target
  if (!$Force -and (Test-ExistingInRoots $roots $relativePath)) { continue }

  $speechText = Clean-SpeechText $item.text
  if ($item.kind -eq "alippe-word") {
    $wordKey = $speechText.ToLowerInvariant()
    if ($phraseMap.ContainsKey($wordKey)) {
      $speechText = $phraseMap[$wordKey]
    } elseif ($speechText.Length -gt 0) {
      $speechText = "$($speechText.Substring(0, 1)). $speechText."
    }
  } elseif ($item.kind -eq "letter") {
    $speechText = "$speechText."
  }

  $selected.Add([PSCustomObject]@{
    Kind = $item.kind
    RelativePath = $relativePath
    SpeechText = $speechText
  })

  if ($selected.Count -ge $Limit) { break }
}

Write-Output ("Selected {0} item(s)." -f $selected.Count)
if ($selected.Count -eq 0) { exit 0 }

Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voice = $speaker.GetInstalledVoices() |
    Where-Object { $_.VoiceInfo.Name -eq $VoiceName } |
    Select-Object -First 1

  if (!$voice) {
    $voice = $speaker.GetInstalledVoices() |
      Where-Object { $_.VoiceInfo.Culture.Name -eq "ru-RU" } |
      Select-Object -First 1
  }
  if (!$voice) { throw "No ru-RU SAPI voice found." }

  $speaker.SelectVoice($voice.VoiceInfo.Name)
  $speaker.Rate = -1
  $speaker.Volume = 100
  Write-Output ("Using Windows voice: {0}" -f $voice.VoiceInfo.Name)

  $tempRoot = Join-Path $workspace ".voice-cache/windows-sapi"
  New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

  for ($i = 0; $i -lt $selected.Count; $i++) {
    $entry = $selected[$i]
    Write-Output ("[{0}/{1}] {2} {3} <= {4}" -f ($i + 1), $selected.Count, $entry.Kind, $entry.RelativePath, $entry.SpeechText)

    $wavPath = Join-Path $tempRoot ("voice_{0:0000}.wav" -f $i)
    $speaker.SetOutputToWaveFile($wavPath)
    $speaker.Speak($entry.SpeechText)
    $speaker.SetOutputToNull()

    $firstOutput = Join-Path $roots[0] $entry.RelativePath
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $firstOutput) | Out-Null
    & $ffmpeg -hide_banner -loglevel error -y -i $wavPath -codec:a libmp3lame -b:a 128k $firstOutput
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for $($entry.RelativePath)" }

    for ($rootIndex = 1; $rootIndex -lt $roots.Count; $rootIndex++) {
      $copyTarget = Join-Path $roots[$rootIndex] $entry.RelativePath
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $copyTarget) | Out-Null
      Copy-Item -LiteralPath $firstOutput -Destination $copyTarget -Force
    }
  }
} finally {
  if ($speaker) {
    $speaker.Dispose()
  }
}
