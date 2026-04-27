param(
    [ValidateSet("install", "enable_autostart", "disable_autostart")]
    [string]$Action = "install"
)

$ErrorActionPreference = "Stop"

$projectDir = $PSScriptRoot
$launcherVbs = Join-Path $projectDir "launch_taffy.vbs"
$shortcutName = "馨语AI桌宠.lnk"
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

function New-DesktopPetShortcut {
    param(
        [Parameter(Mandatory = $true)][string]$Path
    )

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($Path)
    $shortcut.TargetPath = $wscriptExe
    $shortcut.Arguments = '"' + $launcherVbs + '"'
    $shortcut.WorkingDirectory = $projectDir
    $shortcut.Description = "Launch 馨语AI桌宠"
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
        New-DesktopPetShortcut -Path $desktopShortcut
        New-DesktopPetShortcut -Path $startMenuShortcut
        Write-Host "Shortcuts created:"
        Write-Host " - Desktop: $desktopShortcut"
        Write-Host " - Start Menu: $startMenuShortcut"
    }
    "enable_autostart" {
        New-DesktopPetShortcut -Path $startupShortcut
        Write-Host "Autostart enabled: $startupShortcut"
    }
    "disable_autostart" {
        Remove-ShortcutIfExists -Path $startupShortcut
        Write-Host "Autostart disabled."
    }
}
