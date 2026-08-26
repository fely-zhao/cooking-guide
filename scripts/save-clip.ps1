# 将剪贴板截图保存到项目根目录
param(
  [string]$Path = (Join-Path (Split-Path $PSScriptRoot -Parent) "clip.png")
)

Add-Type -AssemblyName System.Windows.Forms
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($img) {
  $img.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved to $Path"
} else {
  Write-Host "剪贴板中没有图片"
}
