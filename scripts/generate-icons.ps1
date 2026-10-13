Add-Type -AssemblyName System.Drawing

$src = "C:\Users\Budy3\.gemini\antigravity\brain\ddf3fd3b-e99c-4bf0-b8ae-c43225bba99a\bridge_app_icon_1791906179248.jpg"
if (!(Test-Path $src)) {
    Write-Error "Source icon not found at $src"
    exit 1
}

$img = [System.Drawing.Image]::FromFile($src)

function Resize-Icon($width, $height, $destPath) {
    $dir = [System.IO.Path]::GetDirectoryName($destPath)
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $dest = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $width, $height)
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    Write-Host "Generated: $destPath"
}

# Web icons
Resize-Icon 192 192 "public\icon.png"
Resize-Icon 64 64 "public\favicon.png"

# Android mipmap icons
$sizes = @{
    "mdpi" = 48
    "hdpi" = 72
    "xhdpi" = 96
    "xxhdpi" = 144
    "xxxhdpi" = 192
}

foreach ($entry in $sizes.GetEnumerator()) {
    $k = $entry.Key
    $s = $entry.Value
    Resize-Icon $s $s "android\app\src\main\res\mipmap-$k\ic_launcher.png"
    Resize-Icon $s $s "android\app\src\main\res\mipmap-$k\ic_launcher_round.png"
    Resize-Icon $s $s "android\app\src\main\res\mipmap-$k\ic_launcher_foreground.png"
}

$img.Dispose()
Write-Host "Success! All icons generated."
