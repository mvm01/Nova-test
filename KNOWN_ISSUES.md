# Known Issues

## 1. Certificate Pinning in Certain Applications (e.g., Minecraft, Xbox Live)
Applications that employ **Certificate Pinning** (such as Minecraft, Xbox Live services, and certain banking or secure corporate apps) will reject the proxy's self-signed interception certificates, even if the Fiddler-Killer CA is installed in the Windows Root store.
- **Symptoms:** You may see errors like `0x800705b4` (timeout/connection failure) when starting the game or attempting to sign in. The application realizes the certificate issuer is not the hardcoded, expected Microsoft/Xbox CA, and it aborts the TLS handshake.
- **Workaround:** Currently, traffic from these strict applications cannot be easily inspected without applying specific bypasses (ignoring those hosts in the proxy) or patching the application itself to disable pinning.

## 2. Heavy Data Applications ("Big Queries")
Applications that make unusually large queries, maintain heavy WebSockets, or use non-standard TCP/UDP streams over the proxy port might experience performance degradation or dropped connections.
- **Symptoms:** Large queries might time out, or the application might disconnect unexpectedly if the payload processing delays the network stream.
- **Workaround:** For raw TCP/UDP heavy applications, you may need to selectively bypass the system proxy for those specific domains. We write payloads > 1MB to disk to save memory, but intense disk I/O could bottleneck heavy stream processing.
