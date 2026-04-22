param(
    [ValidateSet("install", "enable_autostart", "disable_autostart")]
    [string]$Action = "install"
)

$ErrorActionPreference = "Stop"

$projectDir = $PSScriptRoot
$launcherVbs = Join-Path $projectDir "launch_taffy.vbs"
$shortcutName = "Taffy Desktop Pet.lnk"
$wscriptExe = Join-Path $env:SystemRoot "System32\wscript.exe"

if (-not (Test-Path -LiteralPath $launcherVbs)) {
    throw "Launcher script not found: $launcherVbs"
}
if (-not (Test-Path -LiteralPath $wscriptExe)) {
    throw "wscript.exe not found: $wscriptExe"
}

$desktopDir = [Environment]::GetFolderPath("DesktopDirectory")
$programsDir = [Environment]::GetFolderPath("Programs")
$startupDir = [Environment]::GetFolderPath("Startup")

$desktopShortcut = Join-Path $desktopDir $shortcutName
$startMenuShortcut = Join-Path $programsDir $shortcutName
$startupShortcut = Join-Path $startupDir $shortcutName

function New-TaffyShortcut {
    param(
        [Parameter(Mandatory = $true)][string]$Path
    )

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($Path)
    $shortcut.TargetPath = $wscriptExe
    $shortcut.Arguments = '"' + $launcherVbs + '"'
    $shortcut.WorkingDirectory = $projectDir
    $shortcut.Description = "Launch Taffy desktop pet"
    $shortcut.IconLocation = "$wscriptExe,0"
    $shortcut.Save()
}

function Remove-ShortcutIfExists {
    param(
        [Parameter(Mandatory = $true)][string]$Path
    )
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    }
}

switch ($Action) {
    "install" {
        New-TaffyShortcut -Path $desktopShortcut
        New-TaffyShortcut -Path $startMenuShortcut
        Write-Host "Shortcuts created:"
        Write-Host " - Desktop: $desktopShortcut"
        Write-Host " - Start Menu: $startMenuShortcut"
    }
    "enable_autostart" {
        New-TaffyShortcut -Path $startupShortcut
        Write-Host "Autostart enabled: $startupShortcut"
    }
    "disable_autostart" {
        Remove-ShortcutIfExists -Path $startupShortcut
        Write-Host "Autostart disabled."
    }
}
