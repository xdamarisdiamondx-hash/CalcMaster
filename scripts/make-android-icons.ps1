param([string]$RepoRoot = (Split-Path $PSScriptRoot -Parent))

# Generates CalcMaster launcher artwork for the Android build:
#   - mipmap-*/ic_launcher(_round).png   full artwork (Android 5-7 fallback)
#   - mipmap-*/ic_launcher_foreground.png adaptive-icon foreground (Android 8+)
#   - values/ic_launcher_background.xml  adaptive-icon background colour
# The calculator is drawn once on a transparent 512x512 layer; the flat
# launcher icon is that layer over an orange rounded square.

Add-Type -AssemblyName System.Drawing

$orange = [System.Drawing.Color]::FromArgb(255, 140, 0)
$white  = [System.Drawing.Color]::White
$dark   = [System.Drawing.Color]::FromArgb(255, 45, 45, 45)

function New-RoundRectPath([System.Drawing.RectangleF]$r, [float]$rad) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $rad * 2
    $p.AddArc($r.X, $r.Y, $d, $d, 180, 90)
    $p.AddArc($r.Right - $d, $r.Y, $d, $d, 270, 90)
    $p.AddArc($r.Right - $d, $r.Bottom - $d, $d, $d, 0, 90)
    $p.AddArc($r.X, $r.Bottom - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
}

function New-Scaled([System.Drawing.Image]$src, [int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    return $bmp
}

# --- Layer 1: calculator on transparent, centred inside the adaptive safe zone ---
$fg = New-Object System.Drawing.Bitmap 512, 512
$g = [System.Drawing.Graphics]::FromImage($fg)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

$bodyBrush    = New-Object System.Drawing.SolidBrush $white
$displayBrush = New-Object System.Drawing.SolidBrush $dark
$keyBrush     = New-Object System.Drawing.SolidBrush $orange

$g.FillPath($bodyBrush, (New-RoundRectPath (New-Object System.Drawing.RectangleF 169, 133, 174, 246) 26))
$g.FillPath($displayBrush, (New-RoundRectPath (New-Object System.Drawing.RectangleF 189, 158, 134, 51) 10))
foreach ($cy in 261, 307, 353) {
    foreach ($cx in 210, 256, 302) {
        $g.FillEllipse($keyBrush, ($cx - 18), ($cy - 18), 36, 36)
    }
}
$g.Dispose()

# --- Layer 2: flat launcher icon = orange rounded square + calculator ---
$flat = New-Object System.Drawing.Bitmap 512, 512
$g = [System.Drawing.Graphics]::FromImage($flat)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)
$g.FillPath($bodyBrush, (New-RoundRectPath (New-Object System.Drawing.RectangleF 0, 0, 512, 512) 110))
$g.DrawImage($fg, 0, 0, 512, 512)
$g.Dispose()

$resRoot = Join-Path $RepoRoot 'android\app\src\main\res'
$written = 0

# Standard launcher densities
$launcherSizes = @{ 'mdpi' = 48; 'hdpi' = 72; 'xhdpi' = 96; 'xxhdpi' = 144; 'xxxhdpi' = 192 }

foreach ($density in $launcherSizes.Keys) {
    $dir = Join-Path $resRoot "mipmap-$density"
    if (-not (Test-Path $dir)) { continue }

    $icon = New-Scaled $flat $launcherSizes[$density]
    foreach ($name in 'ic_launcher.png', 'ic_launcher_round.png') {
        $out = Join-Path $dir $name
        if (Test-Path $out) { $icon.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); $written++ }
    }
    $icon.Dispose()

    # Adaptive foreground keeps whatever size Capacitor generated
    $fgPath = Join-Path $dir 'ic_launcher_foreground.png'
    if (Test-Path $fgPath) {
        $existing = [System.Drawing.Image]::FromFile($fgPath)
        $w = $existing.Width
        $existing.Dispose()
        $layer = New-Scaled $fg $w
        $layer.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $layer.Dispose()
        $written++
    }
}

# Adaptive background colour
$bgFile = Join-Path $resRoot 'values\ic_launcher_background.xml'
if (Test-Path $bgFile) {
    Set-Content -Path $bgFile -Value '<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FF8C00</color>
</resources>' -Encoding UTF8
    $written++
}

$fg.Dispose()
$flat.Dispose()
Write-Host "icons: $written files written under android\app\src\main\res"
