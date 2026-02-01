// 消息类型定义
export interface Message {
  id: string
  sender_id: number
  receiver_id: number
  content: string
  timestamp: string
  status: "sending" | "sent" | "delivered" | "read" | "failed"
}

// 联系人类型定义
export interface Contact {
  id: number
  username: string
  nickname: string
  avatar?: string
  online: boolean
  last_message?: string
  last_message_time?: string
  unread_count: number
  last_message_timestamp?: number // 后端返回的毫秒时间戳
}

// WebSocket 消息类型
export const WsMessageType = {
  TypeHeartbeat: 0,
  TypeLogin: 1,
  TypeSingleMsg: 2,
} as const;

export type WsMessageType = typeof WsMessageType[keyof typeof WsMessageType];

// WebSocket 消息结构
export interface WsMessage {
  type: WsMessageType
  payload: unknown
}

// 单聊消息负载 (后端协议)
export interface SingleMsgPayload {
  target_id: number
  content: string
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

// 好友列表响应
export interface FriendListResponse {
  friends: Contact[]
}

// 聊天历史响应
export interface ChatHistoryResponse {
  messages: Message[]
}

// 当前用户信息
export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string
}
