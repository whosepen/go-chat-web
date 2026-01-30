import { WsMessageType } from "@/types"
import type { WsMessage, SingleMsgPayload } from "@/types"

type MessageHandler = (message: WsMessage) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private handlers: Set<MessageHandler> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private isManualClose = false

  constructor(url: string) {
    this.url = url
  }

  // 连接 WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log("[WS] Connected")
          this.isManualClose = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WsMessage = JSON.parse(event.data)
            // 收到任何消息都说明连接正常，重置心跳计数
            this.handlers.forEach((handler) => handler(message))
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error)
          }
        }

        this.ws.onerror = (error) => {
          console.error("[WS] Error:", error)
          // 不在这里 reject，让 onclose 处理重连
        }

        this.ws.onclose = (event) => {
          console.log("[WS] Disconnected, code:", event.code, "reason:", event.reason)
          this.stopHeartbeat()
          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            console.log(`[WS] Reconnecting... attempt ${this.reconnectAttempts}`)
            setTimeout(() => this.connect(), this.reconnectDelay)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // 发送消息
  send(message: WsMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("WebSocket is not connected")
    }
  }

  // 发送心跳
  sendHeartbeat(): void {
    this.send({
      type: WsMessageType.TypeHeartbeat,
      payload: { timestamp: Date.now() },
    })
  }

  // 发送单聊消息
  sendSingleMsg(payload: SingleMsgPayload): void {
    this.send({
      type: WsMessageType.TypeSingleMsg,
      target_id: payload.target_id,
      content: payload.content,
    })
  }

  // 订阅消息
  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  // 启动心跳机制
  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat()
    }, 30000)
  }

  // 停止心跳机制
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // 关闭连接
  close(): void {
    this.isManualClose = true
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

// 获取 WebSocket URL
export function getWebSocketUrl(token: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const host = import.meta.env.VITE_API_HOST || "localhost:8080"
  return `${protocol}//${host}/api/ws?token=${token}`
}
