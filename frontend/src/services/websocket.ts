/**
 * WebSocket service for real-time job updates
 */

import type { WSMessage } from '../types'

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ||
  (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host

export class JobWebSocket {
  private ws: WebSocket | null = null
  private jobId: string
  private onMessage: (message: WSMessage) => void
  private onError: (error: Event) => void
  private onClose: () => void

  constructor(
    jobId: string,
    onMessage: (message: WSMessage) => void,
    onError: (error: Event) => void = console.error,
    onClose: () => void = () => {}
  ) {
    this.jobId = jobId
    this.onMessage = onMessage
    this.onError = onError
    this.onClose = onClose
  }

  connect(): void {
    const url = `${WS_BASE_URL}/ws/jobs/${this.jobId}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log(`WebSocket connected for job ${this.jobId}`)
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        this.onMessage(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.onError(error)
    }

    this.ws.onclose = () => {
      console.log(`WebSocket closed for job ${this.jobId}`)
      this.onClose()
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export function connectToJob(
  jobId: string,
  onMessage: (message: WSMessage) => void,
  onError?: (error: Event) => void,
  onClose?: () => void
): JobWebSocket {
  const socket = new JobWebSocket(jobId, onMessage, onError, onClose)
  socket.connect()
  return socket
}
