Option Explicit

Dim fso, shell, projectDir, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "cmd /c """ & projectDir & "\start_local_taffy.bat"""

' 0 = hidden window, False = do not wait
shell.Run cmd, 0, False
