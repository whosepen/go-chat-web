import { useUserStore } from '@/store/user'
import { useChatStore } from '@/store/chat'

export const MsgType = {
  Heartbeat: 0,
  Login: 1,
  SingleMsg: 2,
  GroupMsg: 3,
  WebRTC: 4
} as const

class WebSocketService {
  private ws: WebSocket | null = null
  private heartbeatTimer: any = null
  private reconnectTimer: any = null
  private reconnectAttempts = 0
  private maxReconnectDelay = 30000

  connect() {
    const userStore = useUserStore()
    if (!userStore.token) return

    if (this.ws) {
      this.ws.close()
    }

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const host = location.host
    const url = `${protocol}://${host}/api/ws?token=${userStore.token}`

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('WS Connected')
      this.reconnectAttempts = 0
      this.startHeartbeat()
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      } catch (e) {
        console.error('WS Parse Error', e)
      }
    }

    this.ws.onclose = () => {
      console.log('WS Closed')
      this.stopHeartbeat()
      this.reconnect()
    }

    this.ws.onerror = (e) => {
      console.error('WS Error', e)
    }
  }

  private handleMessage(data: any) {
    const chatStore = useChatStore()
    
    switch (data.type) {
      case MsgType.Heartbeat:
        break
      case MsgType.SingleMsg:
      case MsgType.GroupMsg:
        chatStore.receiveMessage(data)
        break
      case MsgType.WebRTC:
        chatStore.handleWebRTC(data)
        break
      default:
        console.log('Unknown msg type', data)
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WS not connected, cannot send', data)
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: MsgType.Heartbeat, content: "ping" })
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private reconnect() {
    if (this.reconnectTimer) return

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay)
    this.reconnectAttempts++
    
    // console.log(`Reconnecting in ${delay}ms...`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  disconnect() {
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export const wsService = new WebSocketService()
