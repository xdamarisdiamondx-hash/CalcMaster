param(
    [ValidateSet('debug', 'release')]
    [string]$Variant = 'debug',
    [switch]$SkipBranding,
    [switch]$DetectOnly
)

# Builds the CalcMaster Android APK end to end:
#   web bundle -> capacitor sync -> icons/splash -> gradle -> dist/*.apk
#
# Requires: Node (npm.cmd), the Android SDK (ANDROID_HOME) and a JDK 17+.
# Run from anywhere:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-apk.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Get-JdkVersion([string]$JdkPath) {
    $exe = Join-Path $JdkPath 'bin\java.exe'
    if (-not (Test-Path $exe)) { return $null }
    # java -version prints to stderr; map only that call to Continue so the
    # script-wide Stop preference does not abort, while 2>&1 still captures text
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $out = (& $exe -version 2>&1 | Out-String) }
    finally { $ErrorActionPreference = $prevEap }
    if ($out -match 'version\s+"(\d+)') { return [int]$Matches[1] }
    return $null
}

function Find-Jdk {
    $candidates = @()
    if ($env:JAVA_HOME -and (Test-Path $env:JAVA_HOME)) { $candidates += (Resolve-Path $env:JAVA_HOME).Path }

    $roots = @(
        (Join-Path $env:LOCALAPPDATA 'Temp\opencode'),
        'C:\Program Files\Java',
        'C:\Program Files\Eclipse Adoptium',
        'C:\Program Files\Microsoft',
        'C:\Program Files\Zulu',
        (Join-Path $env:LOCALAPPDATA 'Programs')
    )
    foreach ($r in $roots) {
        if (-not (Test-Path $r)) { continue }
        # the JDK may sit in the root, one directory below, or two (temp/jdk21/jdk-21.x)
        $dirs = @($r)
        foreach ($l1 in @(Get-ChildItem $r -Directory -ErrorAction SilentlyContinue)) {
            $dirs += $l1.FullName
            $dirs += @(Get-ChildItem $l1.FullName -Directory -ErrorAction SilentlyContinue | ForEach-Object FullName)
        }
        foreach ($d in $dirs) {
            if (Test-Path (Join-Path $d 'bin\java.exe')) { $candidates += $d }
        }
    }

    # pick the newest JDK we can find - Capacitor 7 compiles with source release 21
    $best = $null
    $bestVer = 0
    foreach ($c in ($candidates | Sort-Object -Unique -Descending)) {
        $v = Get-JdkVersion $c
        if ($v -and $v -gt $bestVer) { $bestVer = $v; $best = $c }
    }
    if ($best) { Write-Host "      detected JDK $bestVer at $best" }
    return $best
}

if ($DetectOnly) {
    $probe = Find-Jdk
    if ($probe) { Write-Host "JDK $($probe | ForEach-Object { Get-JdkVersion $_ }) -> $probe" }
    else { Write-Host 'No JDK found' }
    exit 0
}

Write-Host '[1/4] Building web bundle'
node (Join-Path $root 'scripts\build-web.mjs')

if (-not (Test-Path (Join-Path $root 'android'))) {
    Write-Host '[2/4] Adding android platform'
    & npx.cmd cap add android
    if ($LASTEXITCODE -ne 0) { throw "cap add android failed ($LASTEXITCODE)" }
} else {
    Write-Host '[2/4] android platform present'
}

Write-Host '      syncing web assets'
& npx.cmd cap sync android
if ($LASTEXITCODE -ne 0) { throw "cap sync failed ($LASTEXITCODE)" }

if (-not $SkipBranding) {
    Write-Host '[3/4] Regenerating branded icons + splash'
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'scripts\make-android-icons.ps1')
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'scripts\make-android-splash.ps1')
}

$jdk = Find-Jdk
if (-not $jdk) { throw 'No JDK found. Install JDK 21+ or set JAVA_HOME.' }
$jdkVer = Get-JdkVersion $jdk
if ($jdkVer -lt 21) { throw "JDK $jdkVer found at $jdk, but Capacitor 7 compiles with source release 21 - JDK 21+ required." }

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path $sdk)) { throw "Android SDK not found at $sdk" }

$env:JAVA_HOME = $jdk
$env:Path = (Join-Path $jdk 'bin') + ';' + $env:Path
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
Write-Host "      JDK : $jdk"
Write-Host "      SDK : $sdk"

$task = if ($Variant -eq 'release') { 'assembleRelease' } else { 'assembleDebug' }
Write-Host "[4/4] gradle $task (first run downloads Gradle + AndroidX, please wait)"

Push-Location (Join-Path $root 'android')
try {
    & .\gradlew.bat $task --no-daemon --console=plain
    if ($LASTEXITCODE -ne 0) { throw "gradle $task failed ($LASTEXITCODE)" }
} finally {
    Pop-Location
}

$apk = Join-Path $root "android\app\build\outputs\apk\$Variant\app-$Variant.apk"
if (-not (Test-Path $apk)) {
    # unsigned release output has a different name
    $alt = Join-Path $root "android\app\build\outputs\apk\release\app-release-unsigned.apk"
    if (Test-Path $alt) { $apk = $alt } else { throw "APK not found at $apk" }
}

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$name = if ($Variant -eq 'release') { 'CalcMaster-release.apk' } else { 'CalcMaster.apk' }
$out = Join-Path $dist $name
Copy-Item $apk $out -Force

$size = [Math]::Round((Get-Item $out).Length / 1MB, 2)
Write-Host ''
Write-Host "APK ready: $out ($size MB)"
Write-Host 'Install: copy it to an Android phone and open it (allow "install from unknown sources").'
