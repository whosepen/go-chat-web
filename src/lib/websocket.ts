import { WsMessageType } from "@/types"
import type { SingleMsgPayload, GroupSendPayload } from "@/types"

type MessageHandler = (message: unknown) => void

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
        console.log("[WS] Connecting to:", this.url)
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log("[WS] Connected successfully")
          this.isManualClose = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            console.log("[WS] Raw message received:", JSON.stringify(message))
            // 收到任何消息都说明连接正常，重置心跳计数
            this.handlers.forEach((handler) => handler(message))
          } catch (error) {
            console.error("[WS] Failed to parse message:", error)
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
        console.error("[WS] Connection error:", error)
        reject(error)
      }
    })
  }

  // 发送消息 - 直接格式，不嵌套 payload
  send(message: { type: number; target_id?: number; content: string; media?: number; timestamp?: number }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("[WS] Sending message:", JSON.stringify(message))
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("[WS] WebSocket is not connected, cannot send message")
    }
  }

  // 发送心跳
  sendHeartbeat(): void {
    console.log("[WS] Sending heartbeat")
    this.send({
      type: WsMessageType.TypeHeartbeat,
      timestamp: Date.now(),
      content: "",
    })
  }

  // 发送单聊消息
  sendSingleMsg(payload: SingleMsgPayload): void {
    console.log("[WS] Sending single message to:", payload.target_id)
    this.send({
      type: WsMessageType.TypeSingleMsg,
      target_id: payload.target_id,
      content: payload.content,
      media: 1, // 文本消息
    })
  }

  // 发送群聊消息
  sendGroupMsg(payload: GroupSendPayload): void {
    console.log("[WS] Sending group message to:", payload.target_id)
    this.send({
      type: WsMessageType.TypeGroupMsg,
      target_id: payload.target_id,
      content: payload.content,
      media: 1, // 文本消息
    })
  }

  // 订阅消息
  subscribe(handler: MessageHandler): () => void {
    console.log("[WS] New handler subscribed, total:", this.handlers.size + 1)
    this.handlers.add(handler)
    return () => {
      console.log("[WS] Handler unsubscribed")
      this.handlers.delete(handler)
    }
  }

  // 启动心跳机制
  private startHeartbeat(): void {
    this.stopHeartbeat()
    console.log("[WS] Starting heartbeat")
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
    console.log("[WS] Manual close")
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
