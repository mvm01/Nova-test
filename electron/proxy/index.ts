import mitmProxy from 'http-mitm-proxy'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { addSession, updateSession } from '../services/session-store.js'
import { installCertificate, enableSystemProxy } from '../services/system-proxy.js'
import { getAppNameFromPort } from '../services/process-resolver.js'

export async function startProxy() {
  const PAYLOADS_DIR = path.join(app.getPath('documents'), 'Fiddler-Killer-Payloads')
  if (!fs.existsSync(PAYLOADS_DIR)) {
    fs.mkdirSync(PAYLOADS_DIR, { recursive: true })
  }

  const ProxyConstructor = (mitmProxy as any).Proxy || mitmProxy
  const proxy = new ProxyConstructor()

  proxy.onError(function(_ctx: any, err: any) {
    console.error('Proxy error:', err)
  })

  proxy.onRequest(function(ctx: any, _callback: any) {
    const req = ctx.clientToProxyRequest
    const sessionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9)
    ctx.sessionId = sessionId
    ctx.startTime = Date.now()

    let reqBodySize = 0
    let reqChunks: Buffer[] = []
    let reqStream: fs.WriteStream | null = null
    let reqTmpFile = ''
    const MAX_MEMORY_SIZE = 1024 * 1024 // 1 MB limit

    ctx.onRequestData(function(_ctx: any, chunk: any, callback: any) {
      reqBodySize += chunk.length
      if (reqBodySize <= MAX_MEMORY_SIZE && !reqStream) {
        reqChunks.push(chunk)
        return callback(null, chunk)
      } else {
        if (!reqStream) {
          reqTmpFile = path.join(PAYLOADS_DIR, `req-${sessionId}.bin`)
          reqStream = fs.createWriteStream(reqTmpFile)
          for (const c of reqChunks) {
            reqStream.write(c)
          }
          reqChunks = [] // Free memory
        }
        
        const canWrite = reqStream.write(chunk)
        if (!canWrite) {
          reqStream.once('drain', () => callback(null, chunk))
        } else {
          return callback(null, chunk)
        }
      }
    })

    ctx.onRequestEnd(function(_ctx: any, callback: any) {
      if (reqStream !== null) {
        reqStream.end(() => finalizeRequest())
      } else {
        finalizeRequest()
      }

      function finalizeRequest() {
        const finalReqBody = reqStream ? undefined : Buffer.concat(reqChunks).toString('utf8')

        console.log(`[Proxy] Caught request: ${req.method} ${req.url}`)
        addSession({
          id: sessionId,
          request: {
            url: req.url || '',
            method: req.method || 'GET',
            headers: req.headers,
            body: finalReqBody,
            bodyFile: reqStream ? reqTmpFile : undefined,
            bodySize: reqBodySize
          },
          status: 'pending'
        })
        
        const clientPort = _ctx.connectRequest?.socket?.remotePort || req.socket?.remotePort
        if (clientPort) {
          getAppNameFromPort(clientPort).then(appName => {
            if (appName) {
              updateSession(sessionId, { processName: appName })
            }
          }).catch(() => {})
        }
        
        return callback()
      }
    })

    return _callback()
  })

  proxy.onResponse(function(ctx: any, _callback: any) {
    const res = ctx.serverToProxyResponse
    let resBodySize = 0
    let resChunks: Buffer[] = []
    let resStream: fs.WriteStream | null = null
    let resTmpFile = ''
    const MAX_MEMORY_SIZE = 1024 * 1024 // 1 MB limit

    ctx.onResponseData(function(_ctx: any, chunk: any, callback: any) {
      resBodySize += chunk.length
      if (resBodySize <= MAX_MEMORY_SIZE && !resStream) {
        resChunks.push(chunk)
        return callback(null, chunk)
      } else {
        if (!resStream) {
          resTmpFile = path.join(PAYLOADS_DIR, `res-${ctx.sessionId}.bin`)
          resStream = fs.createWriteStream(resTmpFile)
          for (const c of resChunks) {
            resStream.write(c)
          }
          resChunks = []
        }
        
        const canWrite = resStream.write(chunk)
        if (!canWrite) {
          resStream.once('drain', () => callback(null, chunk))
        } else {
          return callback(null, chunk)
        }
      }
    })

    ctx.onResponseEnd(function(_ctx: any, callback: any) {
      if (resStream !== null) {
        resStream.end(() => finalizeResponse())
      } else {
        finalizeResponse()
      }

      function finalizeResponse() {
        const finalResBody = resStream ? undefined : Buffer.concat(resChunks).toString('utf8')
        const endTime = Date.now()
        
        updateSession(ctx.sessionId, {
          status: 'completed',
          response: {
            statusCode: res.statusCode || 0,
            statusMessage: res.statusMessage || '',
            headers: res.headers,
            body: finalResBody,
            bodyFile: resStream ? resTmpFile : undefined,
            bodySize: resBodySize,
            timing: {
              startTime: ctx.startTime,
              endTime: endTime,
              duration: endTime - ctx.startTime
            }
          }
        })
        return callback()
      }
    })

    return _callback()
  })

  const caDir = path.join(app.getPath('userData'), 'proxy-certs')
  proxy.listen({ port: 8080, host: '::', sslCaDir: caDir })
  console.log(`HTTP MITM Proxy listening on port 8080 (CA Dir: ${caDir})`)

  const certPath = path.join(caDir, 'certs', 'ca.pem')
  
  // Wait up to 5 seconds for the cert to be generated
  let retries = 0
  while (!fs.existsSync(certPath) && retries < 10) {
    await new Promise(r => setTimeout(r, 500))
    retries++
  }

  await installCertificate(certPath)
  await enableSystemProxy(8080)
}
