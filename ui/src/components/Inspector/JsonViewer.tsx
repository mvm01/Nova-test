import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

interface JsonViewerProps {
  data: any
  initiallyExpanded?: boolean
  level?: number
}

export function JsonViewer({ data, initiallyExpanded = true, level = 0 }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded)

  const isObject = data !== null && typeof data === 'object'
  const isArray = Array.isArray(data)

  if (!isObject) {
    let color = 'text-green-400' // string
    if (typeof data === 'number') color = 'text-blue-400'
    else if (typeof data === 'boolean') color = 'text-purple-400'
    else if (data === null) color = 'text-gray-500'

    return <span className={color}>{JSON.stringify(data)}</span>
  }

  const keys = Object.keys(data)
  if (keys.length === 0) {
    return <span className="text-gray-400">{isArray ? '[]' : '{}'}</span>
  }

  return (
    <div className="font-mono text-sm">
      <div 
        className="flex cursor-pointer select-none items-center hover:bg-gray-800/50 -ml-4 pl-4 py-0.5 rounded"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="mr-1 h-3 w-3 text-gray-500" />
        ) : (
          <ChevronRight className="mr-1 h-3 w-3 text-gray-500" />
        )}
        <span className="text-gray-400">{isArray ? '[' : '{'}</span>
        {!expanded && (
          <span className="text-gray-500 ml-1">
            {keys.length} item{keys.length !== 1 ? 's' : ''} {isArray ? ']' : '}'}
          </span>
        )}
      </div>

      {expanded && (
        <div className="ml-4 border-l border-gray-700/50 pl-2">
          {keys.map((key, index) => (
            <div key={key} className="py-0.5">
              {!isArray && <span className="text-blue-300 mr-1">"{key}":</span>}
              <JsonViewer data={data[key as keyof typeof data]} initiallyExpanded={level < 2} level={level + 1} />
              {index < keys.length - 1 && <span className="text-gray-500">,</span>}
            </div>
          ))}
        </div>
      )}
      
      {expanded && (
        <div className="text-gray-400">
          {isArray ? ']' : '}'}
        </div>
      )}
    </div>
  )
}
