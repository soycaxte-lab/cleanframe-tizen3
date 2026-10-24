param([Parameter(Mandatory=$true)][string]$SdkPath)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$local = Join-Path $root '.local'
$target = Join-Path $local 'legacy-cli'
New-Item $target -ItemType Directory -Force | Out-Null
# Official packages only; Certificate Manager and credentials stay in the user's SDK.
foreach ($package in @('new-common-cli_2.4.73','new-web-cli_2.5.107')) {
  $archive = Join-Path $local ($package + '.zip')
  Invoke-WebRequest ('https://download.tizen.org/sdk/tizenstudio/official/binary/' + $package + '_windows-64.zip') -OutFile $archive
  Expand-Archive -LiteralPath $archive -DestinationPath $target -Force
}
$sdk = (Resolve-Path $SdkPath).Path.Replace('\','/')
$data = Join-Path $local 'legacy-cli-data'
New-Item $data -ItemType Directory -Force | Out-Null
@("TIZEN_SDK_INSTALLED_PATH=$sdk", "TIZEN_SDK_DATA_PATH=$data", "JDK_PATH=$sdk/jdk") | Set-Content (Join-Path $target 'data/sdk.info')
Write-Host "Empaquetador preparado en $target/data/tools/ide/bin/tizen.bat"
Write-Host 'Usa Java 8 incluido con el SDK para este empaquetador. Consulta el tutorial.'
