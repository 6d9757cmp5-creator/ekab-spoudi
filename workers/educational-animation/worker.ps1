param(
  [ValidateSet('doctor','prepare','verify','route','test','check','browser-check','app-check','render','ai','tts','dispatch')]
  [string]$Command = 'doctor',
  [string]$InputPath,
  [string]$OutputPath
)
$ErrorActionPreference='Stop'
$runtime=Join-Path $env:LOCALAPPDATA 'EKABAnimationWorker\node-v24.22.2-win-x64'
if (!(Test-Path -LiteralPath (Join-Path $runtime 'node.exe'))) { throw 'Verified Node 24 runtime missing. See SETUP.md.' }
$env:PATH=$runtime+';'+[Environment]::GetEnvironmentVariable('PATH','User')+';'+[Environment]::GetEnvironmentVariable('PATH','Machine')
$env:VIDEO_GENERATION_ENABLED='false'
$env:NODE_OPTIONS='--max-old-space-size=2048'
Push-Location $PSScriptRoot
try {
  if($Command -eq 'test') { & node --test worker.test.mjs }
  elseif($Command -eq 'check') { & npm.cmd run check }
  elseif($Command -eq 'browser-check') { & node browser-check.mjs }
  elseif($Command -eq 'app-check') { & node app-check.mjs }
  else {
    $workerArguments=@('worker.mjs',$Command)
    if($InputPath) { $workerArguments+=$InputPath }
    if($OutputPath) { $workerArguments+=$OutputPath }
    & node @workerArguments
  }
  if($LASTEXITCODE -ne 0) { throw "Worker command failed ($LASTEXITCODE)" }
} finally { Pop-Location }
