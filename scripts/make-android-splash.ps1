param([string]$RepoRoot = (Split-Path $PSScriptRoot -Parent))

# Replaces Capacitor's default splash art with CalcMaster branding:
# a solid orange launch screen with the calculator glyph centred.

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

# Calculator glyph on a transparent 512x512 layer (same geometry as the icon)
$art = New-Object System.Drawing.Bitmap 512, 512
$g = [System.Drawing.Graphics]::FromImage($art)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)
$g.FillPath((New-Object System.Drawing.SolidBrush $white), (New-RoundRectPath (New-Object System.Drawing.RectangleF 169, 133, 174, 246) 26))
$g.FillPath((New-Object System.Drawing.SolidBrush $dark), (New-RoundRectPath (New-Object System.Drawing.RectangleF 189, 158, 134, 51) 10))
$keyBrush = New-Object System.Drawing.SolidBrush $orange
foreach ($cy in 261, 307, 353) {
    foreach ($cx in 210, 256, 302) {
        $g.FillEllipse($keyBrush, ($cx - 18), ($cy - 18), 36, 36)
    }
}
$g.Dispose()

$resRoot = Join-Path $RepoRoot 'android\app\src\main\res'
$files = Get-ChildItem $resRoot -Recurse -Filter 'splash.png' -ErrorAction SilentlyContinue
$written = 0

foreach ($f in $files) {
    $existing = [System.Drawing.Image]::FromFile($f.FullName)
    $w = $existing.Width
    $h = $existing.Height
    $existing.Dispose()

    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear($orange)

    # The glyph's bounding box in the art layer is 174x246, centred on 256,256
    $targetH = [Math]::Min($w, $h) * 0.38
    $scale = $targetH / 246.0
    $drawSize = 512 * $scale
    $x = ($w / 2.0) - ($drawSize / 2.0)
    $y = ($h / 2.0) - ($drawSize / 2.0)
    $g.DrawImage($art, [float]$x, [float]$y, [float]$drawSize, [float]$drawSize)
    $g.Dispose()

    $bmp.Save($f.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $written++
}

$art.Dispose()
Write-Host "splash: $written files written under android\app\src\main\res"
