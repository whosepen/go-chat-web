import type { ApiResponse, MyGroupItem, GroupInfo, GroupMember, GroupRequest } from "@/types"

const API_BASE_URL = import.meta.env.VITE_API_HOST
  ? `http://${import.meta.env.VITE_API_HOST}/api`
  : "/api"

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
  bio?: string
  is_friend?: boolean
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

// ============================================
// 群组相关 API
// ============================================

export interface CreateGroupParams {
  name: string
  desc?: string
  icon?: string
}

export interface JoinGroupParams {
  group_id: number
  remark?: string
}

/**
 * 获取我的群组列表
 * GET /api/group/my-groups
 */
export async function getMyGroups(): Promise<ApiResponse<MyGroupItem[]>> {
  const response = await fetch(`${API_BASE_URL}/group/my-groups`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

/**
 * 创建群组
 * POST /api/group/create
 */
export async function createGroup(params: CreateGroupParams): Promise<ApiResponse<GroupInfo>> {
  const response = await fetch(`${API_BASE_URL}/group/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(params),
  })
  return response.json()
}

/**
 * 获取群组信息
 * GET /api/group/info?group_id={id}
 */
export async function getGroupInfo(groupId: number): Promise<ApiResponse<GroupInfo>> {
  const response = await fetch(`${API_BASE_URL}/group/info?group_id=${groupId}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

/**
 * 获取群成员列表
 * GET /api/group/members?group_id={id}
 */
export async function getGroupMembers(groupId: number): Promise<ApiResponse<GroupMember[]>> {
  const response = await fetch(`${API_BASE_URL}/group/members?group_id=${groupId}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

/**
 * 通过群号搜索群组
 * GET /api/group/search?group_code={code}
 */
export async function searchGroupByCode(groupCode: string): Promise<ApiResponse<GroupInfo | null>> {
  const response = await fetch(`${API_BASE_URL}/group/search?group_code=${encodeURIComponent(groupCode)}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

/**
 * 发送入群申请
 * POST /api/group/join
 */
export async function sendGroupRequest(params: JoinGroupParams): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/group/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(params),
  })
  return response.json()
}

/**
 * 处理入群申请
 * POST /api/group/handle-join
 */
export async function handleGroupRequest(requestId: number, action: "accept" | "reject"): Promise<ApiResponse> {
  const actionNum = action === "accept" ? 1 : 2
  const response = await fetch(`${API_BASE_URL}/group/handle-join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ request_id: requestId, action: actionNum }),
  })
  return response.json()
}

/**
 * 获取入群申请列表
 * GET /api/group/requests
 */
export async function getGroupRequests(): Promise<ApiResponse<GroupRequest[]>> {
  const response = await fetch(`${API_BASE_URL}/group/requests`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

/**
 * 退出群组
 * POST /api/group/quit
 */
export async function quitGroup(groupId: number): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/group/quit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ group_id: groupId }),
  })
  return response.json()
}

/**
 * 标记群聊消息已读
 * POST /api/group/mark-read
 */
export async function markGroupMessagesRead(targetId: number): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/group/mark-read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ target_id: targetId }),
  })
  return response.json()
}

// ============================================
// 拉黑相关 API
// ============================================

/**
 * 获取拉黑列表
 * GET /api/blacklist/list
 */
export async function getBlockedList(): Promise<ApiResponse<BlockUser[]>> {
  const response = await fetch(`${API_BASE_URL}/blacklist/list`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

export interface BlockUser {
  id: number
  user_id: number
  blocked_user_id: number
  blocked_user: {
    id: number
    username: string
    nickname: string
    avatar?: string
  }
  created_at: string
}

/**
 * 拉黑用户
 * POST /api/blacklist/add
 */
export async function blockUser(userId: number): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/blacklist/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ user_id: userId }),
  })
  return response.json()
}

/**
 * 取消拉黑
 * POST /api/blacklist/remove
 */
export async function unblockUser(userId: number): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/blacklist/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ user_id: userId }),
  })
  return response.json()
}

/**
 * 删除好友
 * POST /api/friend/delete
 */
export async function deleteFriend(userId: number): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/friend/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ user_id: userId }),
  })
  return response.json()
}

/**
 * 获取用户详细信息
 * GET /api/user/detail?user_id={id}
 */
export async function getUserDetail(userId: number): Promise<ApiResponse<UserDetail>> {
  const response = await fetch(`${API_BASE_URL}/user/detail?user_id=${userId}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

export interface UserDetail {
  id: number
  username: string
  nickname: string
  avatar?: string
  email?: string
  phone?: string
  bio?: string
  online: boolean
  is_friend?: boolean
}
