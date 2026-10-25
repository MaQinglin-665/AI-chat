param(
    [ValidateSet("install", "enable_autostart", "disable_autostart")]
    [string]$Action = "install"
)

$ErrorActionPreference = "Stop"

$projectDir = $PSScriptRoot
$launcherVbs = Join-Path $projectDir "launch_taffy.vbs"
$shortcutName = "馨语桌宠.lnk"
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
    $shortcut.Description = "Launch 馨语桌宠"
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

# Migrate only links owned by this checkout; unrelated installations stay intact.
function Remove-LegacyOwnedShortcuts {
    param([string]$Directory)
    $shell = New-Object -ComObject WScript.Shell
    foreach ($oldName in @("馨语AI桌宠.lnk", "Taffy Desktop Pet.lnk")) {
        $oldPath = Join-Path $Directory $oldName
        if (Test-Path -LiteralPath $oldPath) {
            $link = $shell.CreateShortcut($oldPath)
            if ($link.TargetPath -eq $wscriptExe -and $link.Arguments -eq ('"' + $launcherVbs + '"')) {
                Remove-ShortcutIfExists -Path $oldPath
            }
        }
    }
}

switch ($Action) {
    "install" {
        New-DesktopPetShortcut -Path $desktopShortcut
        New-DesktopPetShortcut -Path $startMenuShortcut
        Remove-LegacyOwnedShortcuts -Directory $desktopDir
        Remove-LegacyOwnedShortcuts -Directory $programsDir
        Write-Host "Shortcuts created:"
        Write-Host " - Desktop: $desktopShortcut"
        Write-Host " - Start Menu: $startMenuShortcut"
    }
    "enable_autostart" {
        New-DesktopPetShortcut -Path $startupShortcut
        Remove-LegacyOwnedShortcuts -Directory $startupDir
        Write-Host "Autostart enabled: $startupShortcut"
    }
    "disable_autostart" {
        Remove-ShortcutIfExists -Path $startupShortcut
        Remove-LegacyOwnedShortcuts -Directory $startupDir
        Write-Host "Autostart disabled."
    }
}
