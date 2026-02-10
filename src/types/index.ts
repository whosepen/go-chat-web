// 消息类型定义
export interface Message {
  id: string
  sender_id: number
  receiver_id: number
  content: string
  timestamp: string
  status: "sending" | "sent" | "delivered" | "read" | "failed"
  chat_type?: ChatType // 消息类型: 2=单聊, 3=群聊
  sender_name?: string // 群聊时显示的发送者名称
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
  chat_type?: ChatType // 2=单聊, 3=群聊
  group_info?: GroupInfo // 群聊时显示群信息
}

// ============================================
// ChatType 常量
// ============================================
export const ChatType = {
  Single: 2,
  Group: 3,
} as const;

export type ChatType = typeof ChatType[keyof typeof ChatType];

// ============================================
// WebSocket 消息类型
// ============================================
export const WsMessageType = {
  TypeHeartbeat: 0,
  TypeLogin: 1,
  TypeSingleMsg: 2,
  TypeGroupMsg: 3, // 群聊消息
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

// ============================================
// 群组相关类型
// ============================================
export interface GroupInfo {
  id: number
  code: string
  name: string
  desc?: string
  icon?: string
  owner_id: number
  member_count: number
}

export interface GroupMember {
  user_id: number
  nickname: string
  avatar?: string
  role: 1 | 2 | 3 // 1=群主, 2=管理员, 3=普通成员
  mute: 0 | 1
  join_time: string
}

export interface MyGroupItem {
  id: number
  code: string
  name: string
  icon?: string
  unread_count: number
  last_message_time?: number
}

export interface GroupRequest {
  id: number
  group_id: number
  group_name: string
  sender_id: number
  sender_name: string
  avatar?: string
  remark?: string
  status: number
  created_at: string
}

// ============================================
// 群聊消息负载 (后端推送)
// ============================================
export interface GroupMsgPayload {
  from_id: number
  from_name: string // 群聊特有
  type: 3
  content: string
  send_time: number
}

// 发送群聊消息
export interface GroupSendPayload {
  target_id: number // 群ID
  content: string
}
