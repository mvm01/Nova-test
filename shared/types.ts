export interface HttpHeaders {
  [key: string]: string | string[] | undefined
}

export interface SessionRequest {
  url: string
  method: string
  headers: HttpHeaders
  body?: string
  bodyFile?: string
  bodySize?: number
}

export interface SessionResponse {
  statusCode: number
  statusMessage?: string
  headers: HttpHeaders
  body?: string
  bodyFile?: string
  bodySize?: number
  timing?: {
    startTime: number
    endTime: number
    duration: number
  }
}

export interface Session {
  id: string
  request: SessionRequest
  response?: SessionResponse
  status: 'pending' | 'completed' | 'error'
  processName?: string
}
