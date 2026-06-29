# Nova test

A modern, fast, and lightweight system-wide HTTP/HTTPS proxy and network inspector built with Electron, React, and TypeScript.

Nova Test intercepts system traffic and displays it in a beautiful, real-time UI, allowing you to inspect network requests made by any desktop application (like Chrome, Spotify, Teams, etc.).

## Features

- **System-Wide Interception:** Automatically configures the Windows System Proxy and installs a trusted local CA certificate to intercept both HTTP and HTTPS traffic.
- **Process Resolution:** Automatically resolves the name of the desktop application (e.g., `chrome.exe`, `Teams.exe`) that made the request.
- **Active App Filtering:** Scan the desktop for all running applications and filter the network traffic to only show requests from the app you care about.
- **Real-Time UI:** Built with React and Virtualized lists to handle thousands of requests seamlessly without dropping frames.

## Development

To start the development server (which launches both the Vite frontend and the Electron backend):

```bash
npm install
npm run dev
```

## Troubleshooting

### "My internet stopped working after using the app!"

**The Problem:** 
When the app starts, it changes your Windows System Proxy settings to route traffic through its internal server (usually `localhost:8080`). Normally, when you gracefully close the app, it cleans up and restores your internet settings. However, if the app crashes, is forcefully killed (e.g., via Task Manager or killing the terminal process during development), the system proxy may remain enabled while the internal server is dead, leaving you with no internet access.

**The Fix:**
You can easily restore your internet by disabling the system proxy manually. 

**Method 1 (Settings):**
1. Open Windows **Settings**.
2. Go to **Network & internet** > **Proxy**.
3. Under "Manual proxy setup", click **Edit** next to "Use a proxy server" and turn it **Off**.

**Method 2 (Command Line):**
Run the following command in PowerShell or Command Prompt to instantly disable the proxy:
```cmd
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f
```

## Architecture & Technical Details

**Fiddler-Killer** (Nova Test) is designed to intercept, record, and inspect network traffic while automatically attributing it to the originating application.

### High-Level Architecture

The application is built on modern web and desktop technologies, utilizing an **Electron** framework to bridge a fast, reactive UI with low-level system networking.

- **Frontend (UI):** Built with **React**, **TypeScript**, and **Tailwind CSS**. Packaged via **Vite** for lightning-fast module bundling. It utilizes modern UI components (Radix UI) and icons (Lucide) to provide a clean, Fiddler-like inspection interface.
- **Backend (Main Process):** Powered by **Node.js** within Electron. This handles all the heavy lifting: booting the proxy server, managing certificates, resolving Windows processes, and safely writing massive network payloads to disk.
- **Communication:** The frontend and backend communicate via **Electron IPC** (Inter-Process Communication). As the proxy captures traffic, it broadcasts real-time `SESSIONS_UPDATE` events to the React frontend.

### Core Mechanics: How the Proxy Works

At the heart of the application is `http-mitm-proxy`, an engine that sits between your computer and the internet. 

#### The Man-In-The-Middle (MITM) Approach
To read encrypted HTTPS traffic, the app acts as a secure intermediary:
1. When launched, the app generates a **Root Certificate Authority (CA)** (`ca.pem`).
2. This certificate is automatically installed into the Windows **Trusted Root Certification Authorities** store using `certutil`.
3. When an application requests a secure site (e.g., `https://google.com`), the app intercepts the connection and dynamically generates a fake certificate for `google.com` signed by its own CA.
4. Because Windows trusts the CA, the browser trusts the fake certificate, allowing the proxy to decrypt, read, and re-encrypt the data before sending it to the real server.

#### System Proxy Integration
The app seamlessly intercepts system-wide traffic without requiring manual browser configuration.
- It executes a PowerShell script to modify the Windows Registry (`HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings`).
- It toggles `ProxyEnable` to `1` and sets the `ProxyServer` to `127.0.0.1:8080`.
- It broadcasts an OS-level settings refresh, immediately forcing apps like Chrome, Edge, and Slack to route their traffic through it.
- When the app is closed, it cleans up after itself, restoring the previous proxy settings.

### Innovative Feature: Process Resolution

One of the standout features is its ability to tell you *exactly* which application sent a specific request (e.g., `chrome.exe`, `Slack.exe`, `curl.exe`).

**How it achieves this:**
1. When the proxy intercepts a request, it records the **client port** (the internal port the OS used to talk to the proxy).
2. The `process-resolver` module asynchronously executes `netstat -ano` to find the Windows Process ID (PID) associated with that specific local port.
3. Once the PID is identified, it executes `tasklist /FI "PID eq [PID]"` to retrieve the executable name.
4. This mapping is cached for performance and seamlessly attached to the network session displayed in the UI.

### Performance & Memory Management

Capturing network traffic can consume enormous amounts of RAM, especially when downloading large files or streaming video. The app handles this gracefully:

- **Smart Buffering:** Small requests/responses (under 1MB) are buffered directly in RAM for instant UI rendering.
- **Disk Offloading:** If a payload exceeds 1MB, the proxy intelligently stops storing it in memory and instead opens a **File Stream**, writing the payload directly to the user's `Documents/Fiddler-Killer-Payloads` directory.
- This prevents the Electron app from crashing due to Out-Of-Memory (OOM) errors during heavy downloads.

## Known Limitations & Edge Cases

1. **Certificate Pinning:** 
   Highly secure applications (like Minecraft, Xbox Live, and some banking apps) use "Certificate Pinning." They have hardcoded the exact certificate they expect from their server. Even though Windows trusts the local CA, the application itself will realize it's being intercepted and intentionally abort the connection (often yielding a `0x800705b4` error). Currently, traffic from these strict applications cannot be inspected.
2. **Heavy Data Applications ("Big Queries"):**
   Applications that make unusually large queries, maintain heavy WebSockets, or use non-standard TCP/UDP streams over the proxy port might experience performance degradation or dropped connections.
3. **Command Line Tools:**
   While browsers (Chrome/Edge) read Windows registry proxy settings automatically, developer tools like `Node.js`, `Python`, or `curl` often do not. Users must manually set environment variables (e.g., `set HTTP_PROXY=http://127.0.0.1:8080`) to capture their traffic.
