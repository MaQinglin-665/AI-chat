# Native browser voices have no PCM output in Chromium. Synthesize the selected
# installed voice to an in-memory mono WAV. Only the parent process reads stdout.
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
Add-Type -ReferencedAssemblies System.Speech -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Speech.Synthesis;
public class RoomVisemes {
    public readonly List<string> Marks = new List<string>();
    public void Bind(SpeechSynthesizer speaker) {
        speaker.VisemeReached += (sender,e) => {
            string[] map = {"","A","A","O","E","E","I","U","O","A","O","A"};
            if(e.Viseme > 0 && e.Viseme < map.Length)
                Marks.Add(((int)e.AudioPosition.TotalMilliseconds).ToString()+":"+map[e.Viseme]);
        };
    }
}
"@
$marks = New-Object RoomVisemes
$marks.Bind($synth)
try {
  while ($null -ne ($line = [Console]::ReadLine())) {
    $inputData = $line | ConvertFrom-Json
    $buffer = New-Object System.IO.MemoryStream
    $marks.Marks.Clear()
    $voices = @($synth.GetInstalledVoices() | Where-Object Enabled | ForEach-Object VoiceInfo)
    $requested = (([string]$inputData.voice -split ' - ')[0] -replace ' Desktop$', '').Trim()
    $voice = $voices | Where-Object { ($_.Name -replace ' Desktop$', '') -eq $requested } | Select-Object -First 1
    $matched = [bool]$voice
    if (!$voice) { $voice = $voices | Where-Object { $_.Culture.Name -like 'zh-*' } | Select-Object -First 1 }
    if (!$voice) { throw 'No installed Chinese speech voice' }
    $synth.SelectVoice($voice.Name)
    $synth.SetOutputToWaveStream($buffer)
    $synth.Speak([string]$inputData.text)
    $synth.SetOutputToNull()
    [Console]::Out.WriteLine((@{voice=$voice.Name; matched=$matched; visemes=@($marks.Marks.ToArray()); audio=[Convert]::ToBase64String($buffer.ToArray())} | ConvertTo-Json -Compress))
    [Console]::Out.Flush()
    $buffer.Dispose()
  }
} finally { $synth.Dispose() }
