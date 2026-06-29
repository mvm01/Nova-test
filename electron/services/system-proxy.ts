import { exec, execSync, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

const REFRESH_SCRIPT = `
$source = @"
using System;
using System.Runtime.InteropServices;
public class ProxySettings {
    [DllImport("wininet.dll")]
    public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
    public const int INTERNET_OPTION_SETTINGS_CHANGED = 39;
    public const int INTERNET_OPTION_REFRESH = 37;
    public static void Refresh() {
        InternetSetOption(IntPtr.Zero, INTERNET_OPTION_SETTINGS_CHANGED, IntPtr.Zero, 0);
        InternetSetOption(IntPtr.Zero, INTERNET_OPTION_REFRESH, IntPtr.Zero, 0);
    }
}
"@
Add-Type -TypeDefinition $source
[ProxySettings]::Refresh()
`

async function runPsScript(script: string, sync: boolean = false) {
  const tmpFile = path.join(os.tmpdir(), `proxy-${Date.now()}-${Math.floor(Math.random() * 1000)}.ps1`)
  fs.writeFileSync(tmpFile, script, 'utf8')
  try {
    if (sync) {
      execSync(`powershell -ExecutionPolicy Bypass -File "${tmpFile}"`, { stdio: 'ignore' })
    } else {
      await execAsync(`powershell -ExecutionPolicy Bypass -File "${tmpFile}"`)
    }
  } finally {
    try { fs.unlinkSync(tmpFile) } catch (e) {}
  }
}

export async function enableSystemProxy(port: number) {
  if (process.platform !== 'win32') return
  
  const script = `
Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -name ProxyServer -Value "127.0.0.1:${port}"
Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -name ProxyEnable -Value 1
${REFRESH_SCRIPT}
`
  try {
    await runPsScript(script)
    console.log(`[SystemProxy] Enabled system proxy on 127.0.0.1:${port}`)
    
    // Start watchdog via inline script to avoid missing dist file issues
    const watchdogPs1 = `
$ParentPID = ${process.pid}
while ($true) {
    if (-not (Get-Process -Id $ParentPID -ErrorAction SilentlyContinue)) {
        Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -name ProxyEnable -Value 0
${REFRESH_SCRIPT}
        Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue
        exit
    }
    Start-Sleep -Seconds 1
}
`
    const watchdogFile = path.join(os.tmpdir(), `proxy-watchdog-${Date.now()}-${Math.floor(Math.random() * 1000)}.ps1`)
    fs.writeFileSync(watchdogFile, watchdogPs1, 'utf8')

    const child = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', watchdogFile], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    })
    child.unref()
    console.log(`[SystemProxy] PowerShell Watchdog started with PID ${child.pid} monitoring parent PID ${process.pid}`)
  } catch (err) {
    console.error('[SystemProxy] Error enabling proxy:', err)
  }
}

export async function disableSystemProxy() {
  if (process.platform !== 'win32') return
  
  const script = `
Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -name ProxyEnable -Value 0
${REFRESH_SCRIPT}
`
  try {
    await runPsScript(script)
    console.log(`[SystemProxy] Disabled system proxy`)
  } catch (err) {
    console.error('[SystemProxy] Error disabling proxy:', err)
  }
}

export function disableSystemProxySync() {
  if (process.platform !== 'win32') return
  
  const script = `
Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -name ProxyEnable -Value 0
${REFRESH_SCRIPT}
`
  try {
    runPsScript(script, true)
    console.log(`[SystemProxy] Disabled system proxy (Sync)`)
  } catch (err) {
    console.error('[SystemProxy] Error disabling proxy synchronously:', err)
  }
}

export async function installCertificate(certPath: string) {
  if (process.platform !== 'win32') return
  
  if (!fs.existsSync(certPath)) {
    console.warn('[SystemProxy] CA cert not found at', certPath)
    return
  }

  console.log('[SystemProxy] Ensuring CA Certificate is installed...')
  try {
    // Check if EXACT certificate is already installed by comparing thumbprints
    const checkScript = `
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("${certPath}")
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
$store.Open("ReadOnly")
$found = $store.Certificates.Find("FindByThumbprint", $cert.Thumbprint, $false)
$store.Close()
if ($found.Count -gt 0) { Write-Output "INSTALLED" } else { Write-Output "NOT_INSTALLED" }
`
    const tmpFile = path.join(os.tmpdir(), `cert-check-${Date.now()}.ps1`)
    fs.writeFileSync(tmpFile, checkScript, 'utf8')
    const { stdout } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${tmpFile}"`)
    try { fs.unlinkSync(tmpFile) } catch (e) {}

    if (stdout.includes('INSTALLED')) {
      console.log('[SystemProxy] CA Certificate already installed.')
      return
    }
  } catch (e) {
    console.warn('[SystemProxy] Error checking certificate:', e)
  }

  console.log('[SystemProxy] Triggering certificate installation prompt...')
  try {
    // Use Start-Process to ensure the GUI prompt is visible to the user
    await runPsScript(`Start-Process -FilePath "certutil.exe" -ArgumentList "-addstore -user Root \`"${certPath}\`"" -Wait -NoNewWindow`)
    console.log('[SystemProxy] CA Certificate installation completed.')
  } catch (err) {
    console.error('[SystemProxy] CA certificate installation failed or was cancelled.')
  }
}
