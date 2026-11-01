# Recreate the code-drawn Haru application icon with Windows drawing APIs.
Add-Type -AssemblyName System.Drawing
$assetDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\assets'))
[IO.Directory]::CreateDirectory($assetDirectory) | Out-Null
$canvas = [Drawing.Bitmap]::new(256, 256)
$graphics = [Drawing.Graphics]::FromImage($canvas)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$shape = [Drawing.Drawing2D.GraphicsPath]::new()
$shape.AddArc(8, 8, 92, 92, 180, 90)
$shape.AddArc(156, 8, 92, 92, 270, 90)
$shape.AddArc(156, 156, 92, 92, 0, 90)
$shape.AddArc(8, 156, 92, 92, 90, 90)
$shape.CloseFigure()
$brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#7560cb'))
$graphics.FillPath($brush, $shape)
$font = [Drawing.Font]::new('Malgun Gothic', 156, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
$format = [Drawing.StringFormat]::new()
$format.Alignment = [Drawing.StringAlignment]::Center
$format.LineAlignment = [Drawing.StringAlignment]::Center
$graphics.DrawString([string][char]0xD558, $font, [Drawing.Brushes]::White, [Drawing.RectangleF]::new(0, -4, 256, 256), $format)
$canvas.Save((Join-Path $assetDirectory 'haru.png'), [Drawing.Imaging.ImageFormat]::Png)
$images = @()
foreach ($size in @(16, 32, 48, 64, 128, 256)) {
    $scaled = [Drawing.Bitmap]::new($size, $size)
    $drawing = [Drawing.Graphics]::FromImage($scaled)
    $drawing.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $drawing.DrawImage($canvas, 0, 0, $size, $size)
    $stream = [IO.MemoryStream]::new()
    $scaled.Save($stream, [Drawing.Imaging.ImageFormat]::Png)
    $images += @{ Size = $size; Bytes = $stream.ToArray() }
    $stream.Dispose(); $drawing.Dispose(); $scaled.Dispose()
}
$output = [IO.File]::Create((Join-Path $assetDirectory 'haru.ico'))
$writer = [IO.BinaryWriter]::new($output)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$images.Count)
$offset = 6 + 16 * $images.Count
foreach ($item in $images) {
    $dimension = if ($item.Size -eq 256) { 0 } else { $item.Size }
    $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
    $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$item.Bytes.Length); $writer.Write([uint32]$offset)
    $offset += $item.Bytes.Length
}
foreach ($item in $images) { $writer.Write([byte[]]$item.Bytes) }
$writer.Dispose(); $output.Dispose()
$font.Dispose(); $brush.Dispose(); $shape.Dispose(); $format.Dispose(); $graphics.Dispose(); $canvas.Dispose()
Write-Output 'Created assets/haru.png and assets/haru.ico'
