# Publish codex/profile-visual-assets to your fork and open a PR compare URL.
# Prerequisite: fork https://github.com/PinkR1ver/vibe-wrapper to your account first.

$ErrorActionPreference = "Stop"
$Upstream = "PinkR1ver/vibe-wrapper"
$Branch = "codex/profile-visual-assets"
$Gh = Join-Path $env:TEMP "gh-cli\bin\gh.exe"

Push-Location (Split-Path (Split-Path $PSScriptRoot))

$user = $null
if (Test-Path $Gh) {
  try { $user = & $Gh api user -q .login 2>$null } catch {}
}
if (-not $user) {
  $user = Read-Host "GitHub username (e.g. ShinjukuZhu)"
}

$fork = "https://github.com/$user/vibe-wrapper.git"
Write-Host "Checking fork: $fork"

try {
  python -c "import urllib.request; urllib.request.urlopen('https://api.github.com/repos/$user/vibe-wrapper', timeout=15); print('fork ok')"
} catch {
  Write-Host "Fork not found. Open: https://github.com/$Upstream/fork"
  exit 1
}

git remote remove fork 2>$null
git remote add fork $fork
git push -u fork $Branch

$compare = "https://github.com/$Upstream/compare/$Branch...${user}:vibe-wrapper:$Branch?expand=1"
Write-Host "Opening PR compare: $compare"
Start-Process $compare
Write-Host "Done. Click 'Create pull request' on GitHub."

Pop-Location
