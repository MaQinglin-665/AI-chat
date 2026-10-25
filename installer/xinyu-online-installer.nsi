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

!define APP_NAME "馨语桌宠"
!define APP_PUBLISHER "AI-chat open-source preview"
!define START_MENU_DIR "馨语桌宠"

Name "${APP_NAME}"
Caption "${APP_NAME} ${APP_VERSION}"
OutFile "${OUT_FILE}"
InstallDir "$LOCALAPPDATA\XinyuAI\DesktopPet"
BrandingText "馨语桌宠 · 实验预览版"
ShowInstDetails show
ShowUninstDetails show

!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"

Section "Install"
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  File /r "${PAYLOAD_ROOT}\*"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateDirectory "$SMPROGRAMS\${START_MENU_DIR}"
  CreateShortcut "$SMPROGRAMS\${START_MENU_DIR}\馨语首次设置.lnk" "$INSTDIR\install_and_start.bat" "" "$INSTDIR\install_and_start.bat" 0 SW_SHOWNORMAL "" "准备依赖并启动馨语"
  CreateShortcut "$SMPROGRAMS\${START_MENU_DIR}\馨语桌宠.lnk" "$INSTDIR\start_electron.bat" "" "$INSTDIR\start_electron.bat" 0 SW_SHOWNORMAL "" "启动馨语桌宠"
  CreateShortcut "$SMPROGRAMS\${START_MENU_DIR}\卸载馨语桌宠.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\馨语桌宠.lnk" "$INSTDIR\start_electron.bat" "" "$INSTDIR\start_electron.bat" 0 SW_SHOWMINIMIZED "" "启动馨语桌宠"

  IfSilent skip_guided_first_run
  ExecShell "open" "$INSTDIR\install_and_start.bat"
  skip_guided_first_run:
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$DESKTOP\馨语桌宠.lnk"
  Delete "$SMPROGRAMS\${START_MENU_DIR}\馨语首次设置.lnk"
  Delete "$SMPROGRAMS\${START_MENU_DIR}\馨语桌宠.lnk"
  Delete "$SMPROGRAMS\${START_MENU_DIR}\卸载馨语桌宠.lnk"
  RMDir "$SMPROGRAMS\${START_MENU_DIR}"
  RMDir /r "$INSTDIR"
SectionEnd
