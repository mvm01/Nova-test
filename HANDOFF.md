# Fiddler-Killer: Project Handoff

## 📌 Project Status
**Status**: Packaged Build - Bug Fixing Phase
**Core Architecture**: Electron, React, Vite, Node.js (`http-mitm-proxy`), `electron-builder`

The application has been fully developed and successfully packaged into a distributable Windows executable (Portable and NSIS installer). However, there is a critical runtime bug isolated strictly to the **production/packaged build**. 

In the development environment (`npm run dev`), the proxy captures traffic perfectly. In the packaged executable (`release/Fiddler-Killer 0.0.0.exe`), no traffic is captured.

## ✅ Accomplished Milestones

1. **Core Proxy Integration**: `http-mitm-proxy` successfully integrated, generating its own Root CA inside `app.getPath('userData')`.
2. **System Proxy Override**: Implemented PowerShell scripts to automatically route system traffic through the proxy (modifying `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`).
3. **App/Process Resolution**: Pipeline engineered to map ephemeral ports to PIDs, and PIDs to application names.
4. **Resilient Watchdog**: Built a detached **PowerShell watchdog script** that cleanly monitors the main process ID and disables the proxy if the app crashes, completely avoiding `.asar` Node execution limits.
5. **Memory-Safe Payload Streaming**: Asynchronous disk streaming for payloads over 1MB.
6. **Production Packaging**: `electron-builder` fully configured. Application `.ico` generated. Strict TypeScript compilation errors fixed. Logging disabled for production builds.

---

## 🐛 Active Bug: Packaged App Not Capturing Traffic

**The Problem**: When running the packaged executable, the UI works perfectly, but no network traffic is intercepted. The UI constantly shows the generic "No traffic captured" fallback tip.

**Potential Causes to Investigate in Next Session**:
1. **Proxy Server Boot Failure**: `http-mitm-proxy` might be silently failing to start or bind to port `8080` when packaged inside the `.asar` archive.
2. **PowerShell Execution Context**: The `system-proxy.ts` scripts (which write to `os.tmpdir()` and execute via `child_process.spawn`/`execAsync`) might be blocked, silently failing, or not applying the registry settings fast enough in the production environment.
3. **Certificate Installation Failure**: The dynamically generated Root CA might be failing to generate fast enough, causing the `certutil` prompt to silently fail, meaning the proxy is up but browsers reject it due to SSL errors (though Chrome usually shows `ERR_CERT_AUTHORITY_INVALID` in the browser instead of bypassing it entirely).
4. **Dependency Resolution**: While `electron-builder` packages `dependencies` automatically, `http-mitm-proxy` or one of its sub-dependencies might have dynamic `require()` calls or native bindings that break when compressed into an `.asar` archive. We may need to add `http-mitm-proxy` to `asarUnpack` in the `package.json` build config.

## 🏁 How to Resume
When you are ready to continue, read this document and begin investigating the **Active Bug** section. Start by verifying if `http-mitm-proxy` is successfully binding to port `8080` when the `.exe` is running, and check if the Windows Proxy Settings are actually being toggled in the OS settings menu.
