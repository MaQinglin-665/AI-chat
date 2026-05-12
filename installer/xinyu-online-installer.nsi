Unicode true
RequestExecutionLevel user

!include "MUI2.nsh"

!ifndef APP_VERSION
  !define APP_VERSION "preview"
!endif
!ifndef PAYLOAD_ROOT
  !error "PAYLOAD_ROOT must be defined"
!endif
!ifndef OUT_FILE
  !define OUT_FILE "Xinyu-AI-Desktop-Pet-Setup.exe"
!endif

!define APP_NAME "Xinyu AI Desktop Pet"
!define APP_PUBLISHER "AI-chat open-source preview"
!define START_MENU_DIR "Xinyu AI Desktop Pet"

Name "${APP_NAME}"
Caption "${APP_NAME} ${APP_VERSION}"
OutFile "${OUT_FILE}"
InstallDir "$LOCALAPPDATA\XinyuAI\DesktopPet"
BrandingText "Xinyu AI Desktop Pet MVP preview"
ShowInstDetails show
ShowUninstDetails show

!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  File /r "${PAYLOAD_ROOT}\*"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateDirectory "$SMPROGRAMS\${START_MENU_DIR}"
  CreateShortcut "$SMPROGRAMS\${START_MENU_DIR}\Xinyu Guided First Run.lnk" "$INSTDIR\install_and_start.bat" "" "$INSTDIR\install_and_start.bat" 0 SW_SHOWNORMAL "" "Prepare dependencies and start Xinyu"
  CreateShortcut "$SMPROGRAMS\${START_MENU_DIR}\Start Xinyu.lnk" "$INSTDIR\start_electron.bat" "" "$INSTDIR\start_electron.bat" 0 SW_SHOWNORMAL "" "Start Xinyu AI Desktop Pet"
  CreateShortcut "$SMPROGRAMS\${START_MENU_DIR}\Uninstall Xinyu.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Xinyu AI Desktop Pet.lnk" "$INSTDIR\start_electron.bat" "" "$INSTDIR\start_electron.bat" 0 SW_SHOWMINIMIZED "" "Start Xinyu AI Desktop Pet"

  ExecShell "open" "$INSTDIR\install_and_start.bat"
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$DESKTOP\Xinyu AI Desktop Pet.lnk"
  Delete "$SMPROGRAMS\${START_MENU_DIR}\Xinyu Guided First Run.lnk"
  Delete "$SMPROGRAMS\${START_MENU_DIR}\Start Xinyu.lnk"
  Delete "$SMPROGRAMS\${START_MENU_DIR}\Uninstall Xinyu.lnk"
  RMDir "$SMPROGRAMS\${START_MENU_DIR}"
  RMDir /r "$INSTDIR"
SectionEnd
