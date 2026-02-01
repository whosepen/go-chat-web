import type { ApiResponse } from "@/types"

const API_BASE_URL = import.meta.env.VITE_API_HOST
  ? `http://${import.meta.env.VITE_API_HOST}/api`
  : "http://localhost:8080/api"

function getToken(): string {
  return localStorage.getItem("token") || ""
}

// 用户信息接口
export interface UserProfile {
  id: number
  username: string
  nickname: string
  avatar: string
  email: string
}

// 获取用户完整信息
export async function getUserProfile(): Promise<ApiResponse<UserProfile>> {
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

// 更新用户信息
export async function updateUserProfile(data: {
  nickname?: string
  avatar?: string
  email?: string
}): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  })
  return response.json()
}

// 上传头像
export async function uploadAvatar(file: File): Promise<ApiResponse<{ avatar: string }>> {
  const formData = new FormData()
  formData.append("avatar", file)

  const response = await fetch(`${API_BASE_URL}/user/avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  })
  return response.json()
}

// 搜索用户
export async function searchUser(username: string): Promise<ApiResponse<SearchedUser | null>> {
  const response = await fetch(`${API_BASE_URL}/user/search?username=${encodeURIComponent(username)}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

export interface SearchedUser {
  id: number
  username: string
  nickname: string
  avatar?: string
}

// 发送好友申请
export async function sendFriendRequest(targetId: number, remark?: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/friend/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ target_id: targetId, remark }),
  })
  return response.json()
}

// 获取好友申请列表
export async function getFriendRequests(status?: "pending" | "accepted" | "rejected"): Promise<ApiResponse<FriendRequest[]>> {
  const params = status ? `?status=${status}` : ""
  const response = await fetch(`${API_BASE_URL}/friend/requests${params}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

export interface FriendRequest {
  id: number
  sender_id: number
  sender_name: string
  avatar?: string
  remark?: string
  status: number  // 0=pending, 1=accepted, 2=rejected
  created_at: string
}

// 处理好友申请
export async function handleFriendRequest(requestId: number, action: "accept" | "reject"): Promise<ApiResponse> {
  const actionNum = action === "accept" ? 1 : 2
  const response = await fetch(`${API_BASE_URL}/friend/handle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ request_id: requestId, action: actionNum }),
  })
  return response.json()
}

// 获取待处理的好友申请数量
export async function getPendingRequestCount(): Promise<ApiResponse<{ count: number }>> {
  // API 文档中没有 /friend/requests/count 接口，改用 /friend/requests 获取后过滤
  const response = await fetch(`${API_BASE_URL}/friend/requests`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  const result = await response.json()
  if (result.code === 0) {
    // 过滤出待处理(status=0)的申请
    const pendingCount = Array.isArray(result.data)
      ? result.data.filter((req: { status: number }) => req.status === 0).length
      : 0
    return { code: 0, msg: "success", data: { count: pendingCount } }
  }
  return result
}

// 标记消息已读
export async function markMessagesRead(targetId: number): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/friend/mark-read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ target_id: targetId }),
  })
  return response.json()
}

// 好友列表项（带未读计数）
export interface FriendListItem {
  id: number
  username: string
  nickname: string
  avatar?: string
  online: boolean
  unread_count: number
  last_message_time?: number
}

// 获取好友列表
export async function getFriendList(): Promise<ApiResponse<FriendListItem[]>> {
  const response = await fetch(`${API_BASE_URL}/friend/list`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}
