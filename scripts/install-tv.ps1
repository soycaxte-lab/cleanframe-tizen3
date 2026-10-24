param(
  [Parameter(Mandatory=$true)][string]$Sdb,
  [Parameter(Mandatory=$true)][string]$TvIp,
  [Parameter(Mandatory=$true)][string]$Widget,
  [string]$DeviceProfile
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$identity = Get-Content (Join-Path $root '.local/tv-identity.json') -Raw | ConvertFrom-Json
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path $Widget).Path)
try {
  foreach ($entry in @('author-signature.xml','signature1.xml')) {
    if (-not $zip.GetEntry($entry)) { throw "Widget sin firma: $entry" }
  }
  $reader = [IO.StreamReader]::new($zip.GetEntry('config.xml').Open())
  try { [xml]$manifest = $reader.ReadToEnd() } finally { $reader.Dispose() }
  $app = $manifest.SelectSingleNode("//*[local-name()='application']")
  if ($app.id -ne $identity.appId) { throw 'La identidad del widget no coincide con la preparación local.' }
} finally { $zip.Dispose() }
$serial = $TvIp + ':26101'
& $Sdb connect $serial
if ($DeviceProfile) {
  [xml]$permit = Get-Content -LiteralPath $DeviceProfile -Raw
  & $Sdb -s $serial push $DeviceProfile /home/owner/share/tmp/sdk_tools/device-profile.xml
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo enviar el permiso Samsung.' }
}
& $Sdb -s $serial push $Widget /home/owner/share/tmp/CleanFrame-install.wgt
if ($LASTEXITCODE -ne 0) { throw 'Falló la transferencia del widget.' }
$result = & $Sdb -s $serial shell 0 vd_appinstall $identity.appId /home/owner/share/tmp/CleanFrame-install.wgt 2>&1
$result | Out-Host
if (($result -join "`n") -notmatch 'install completed') { throw 'El TV no confirmó la instalación. Un código de salida 0 no basta.' }
Write-Host 'Instalación confirmada. Abre CleanFrame TV desde Apps en el televisor.'
