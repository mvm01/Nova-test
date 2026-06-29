# Fiddler-Killer: Technical Documentation

Fiddler-Killer is a powerful, cross-platform HTTP/HTTPS interceptor and debugging proxy built with Electron, React, and Node.js. It allows developers to monitor system-wide web traffic, deeply inspect massive payloads without freezing, and trace network requests back to their exact source applications.

## System Architecture

The application follows the standard Electron multi-process architecture:

### 1. Main Process (Node.js)
Handles the heavy lifting, deep OS integration, and network proxying.
- **Proxy Engine**: Utilizes `http-mitm-proxy` to spin up a local proxy server (default port 8080).
- **Certificate Management**: Automatically generates a localized Root CA (`ca.pem`) into the Electron `userData` directory (`proxy-certs`). It installs this certificate into the Windows Root Trust store to seamlessly decrypt HTTPS traffic without browser warnings.
- **OS Integration**: Automatically enables the Windows system proxy when launched by directly editing the Windows Registry (`HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`) and immediately refreshing system settings via PowerShell API calls. It reverts these settings gracefully upon exit or unexpected crashes.

### 2. Renderer Process (React & Vite)
Provides a rich, highly responsive User Interface.
- **Tech Stack**: React, TypeScript, TailwindCSS, and Radix UI components.
- **Real-Time Data**: Receives live traffic data from the Main process via IPC (Inter-Process Communication) events and renders it into a highly performant virtualized list.
- **Deep Inspection**: Allows users to dive into request/response headers, view syntax-highlighted JSON, and seamlessly export massive binary payloads directly to disk.

---

## Core Features & Technical Implementation

### 1. Advanced Process Resolution
Unlike standard proxies, Fiddler-Killer tells you *which app* made the request.
- **Mechanism**: When a request hits the proxy, the proxy extracts the source `remotePort`. It then runs `netstat -ano` to map that specific ephemeral port to a Process ID (PID). Finally, it uses a lightweight PowerShell query (`Get-Process`) to map the PID to a human-readable executable name (e.g., `Minecraft Launcher.exe`, `chrome.exe`).
- **Caching**: PID mappings are temporarily cached in a Map to reduce CPU overhead on rapidly repeating requests.

### 2. Memory-Safe Payload Streaming
Proxies notoriously crash or freeze when attempting to capture large game assets or video streams. Fiddler-Killer solves this through asynchronous dynamic streaming.
- **The 1MB Threshold**: By default, the proxy buffers incoming chunks in RAM. If the combined chunks exceed 1MB, the proxy instantly flushes the memory to a temporary file located at `Documents/Fiddler-Killer-Payloads`.
- **Asynchronous Writes**: It uses `fs.createWriteStream()` for all subsequent chunks. This strictly enforces non-blocking I/O, ensuring the Node.js event loop is never stalled. This guarantees that heavy apps (like Minecraft) never experience network timeouts while downloading 500MB+ assets.

### 3. Smart Garbage Collection
Fiddler-Killer ensures your hard drive is never bloated with obsolete data.
- **Session Clearing**: When the "Clear" button is clicked in the UI, the backend aggressively unlinks (deletes) all physical temporary payload files associated with those sessions.
- **Exit Prompt Integration**: When the user closes the application, the `window-all-closed` event is intercepted. The app scans the `Documents/Fiddler-Killer-Payloads` directory and presents a native dialog box, giving the user the choice to completely wipe the cached session files or preserve them for future hex-inspection.

### 4. IPC Communication Layer
Bridging the backend and frontend securely.
- **`sessions:update`**: Fired from Main to Renderer whenever a new request is caught or finished, updating the UI in real-time.
- **`apps:get_active`**: Allows the frontend to fetch the unique list of applications currently generating traffic for the dropdown filter.
- **`files:save-body`**: Triggers a native `dialog.showSaveDialog`, securely copying a cached large payload from the temporary folder to the user's desired export location.

## Development Setup

- **Start Development**: `npm run dev`
- **Build**: `npm run build`

When running in development, Vite handles Hot Module Replacement (HMR) for the React frontend, while the Electron main process is compiled separately. The proxy logic runs entirely out of `dist-electron`.
