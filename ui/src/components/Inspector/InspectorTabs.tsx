import * as Tabs from '@radix-ui/react-tabs'
import type { Session, HttpHeaders } from '../../../../shared/types.js'
import { JsonViewer } from './JsonViewer.js'

interface InspectorTabsProps {
  session: Session
}

function HeadersView({ headers }: { headers: HttpHeaders }) {
  if (!headers || Object.keys(headers).length === 0) {
    return <div className="p-4 text-gray-500">No headers</div>
  }

  return (
    <div className="flex flex-col">
      {Object.entries(headers).map(([key, value]) => (
        <div key={key} className="flex border-b border-gray-800 p-2 text-sm">
          <div className="w-1/3 font-semibold text-gray-400">{key}</div>
          <div className="w-2/3 break-all text-gray-200">
            {Array.isArray(value) ? value.join(', ') : value}
          </div>
        </div>
      ))}
    </div>
  )
}

interface BodyViewProps {
  body?: string
  bodyFile?: string
  bodySize?: number
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function BodyView({ body, bodyFile, bodySize }: BodyViewProps) {
  if (bodyFile) {
    const handleSave = async () => {
      await (window as any).api.invoke('files:save-body', bodyFile)
    }

    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-gray-400 space-y-4">
        <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div>
          <div className="text-lg font-semibold text-gray-300">Massive Binary Payload</div>
          <div className="text-sm mt-1">This payload is too large to render directly ({bodySize ? formatBytes(bodySize) : 'Unknown size'}).</div>
          <div className="text-sm mt-1">It has been safely cached to disk.</div>
        </div>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Save Body to Disk
        </button>
      </div>
    )
  }

  if (!body) {
    return <div className="p-4 text-gray-500">No body content</div>
  }

  try {
    // Try to format JSON nicely if it is JSON
    const parsed = JSON.parse(body)
    return (
      <div className="p-4">
        <JsonViewer data={parsed} />
      </div>
    )
  } catch (e) {
    // leave as is
  }

  return (
    <pre className="p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap break-all overflow-auto">
      {body}
    </pre>
  )
}

export function InspectorTabs({ session }: InspectorTabsProps) {
  return (
    <div className="flex h-full flex-col bg-gray-900">
      <div className="border-b border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-semibold truncate" title={session.request.url}>
          {session.request.method} {session.request.url}
        </h2>
        <div className="mt-1 flex space-x-4 text-sm text-gray-400">
          <span>Status: {session.response?.statusCode || 'Pending...'}</span>
          {session.response?.timing && (
            <span>Time: {session.response.timing.duration}ms</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs.Root className="flex flex-col flex-1" defaultValue="req-headers">
          <Tabs.List className="flex border-b border-gray-700 bg-gray-800">
            <Tabs.Trigger value="req-headers" className="px-4 py-2 text-sm text-gray-400 hover:text-white data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400">
              Request Headers
            </Tabs.Trigger>
            <Tabs.Trigger value="req-body" className="px-4 py-2 text-sm text-gray-400 hover:text-white data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400">
              Request Body
            </Tabs.Trigger>
            <Tabs.Trigger value="res-headers" className="px-4 py-2 text-sm text-gray-400 hover:text-white data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400">
              Response Headers
            </Tabs.Trigger>
            <Tabs.Trigger value="res-body" className="px-4 py-2 text-sm text-gray-400 hover:text-white data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400">
              Response Body
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="req-headers" className="flex-1 overflow-auto">
            <HeadersView headers={session.request.headers} />
          </Tabs.Content>
          
          <Tabs.Content value="req-body" className="flex-1 overflow-auto">
            <BodyView body={session.request.body} bodyFile={session.request.bodyFile} bodySize={session.request.bodySize} />
          </Tabs.Content>
          
          <Tabs.Content value="res-headers" className="flex-1 overflow-auto">
            <HeadersView headers={session.response?.headers || {}} />
          </Tabs.Content>
          
          <Tabs.Content value="res-body" className="flex-1 overflow-auto">
            <BodyView body={session.response?.body} bodyFile={session.response?.bodyFile} bodySize={session.response?.bodySize} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  )
}
