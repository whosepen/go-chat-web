import { useEffect, useState, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ContactList } from "@/components/chat/ContactList"
import { ChatWindow } from "@/components/chat/ChatWindow"
import { ChatInput } from "@/components/chat/ChatInput"
import { AddFriendDialog } from "@/components/chat/AddFriendDialog"
import { CombinedRequestsDialog } from "@/components/chat/CombinedRequestsDialog"
import { SettingsDialog } from "@/components/chat/SettingsDialog"
import { CreateGroupDialog } from "@/components/chat/CreateGroupDialog"
import { JoinGroupDialog } from "@/components/chat/JoinGroupDialog"
import { FriendInfoDialog } from "@/components/chat/FriendInfoDialog"
import { GroupInfoDialog } from "@/components/chat/GroupInfoDialog"
import { GroupMembersDialog } from "@/components/chat/GroupMembersDialog"
import { WsMessageType, ChatType } from "@/types"
import type { Contact, Message, GroupMember } from "@/types"
import { WebSocketClient, getWebSocketUrl } from "@/lib/websocket"
import {
  getPendingRequestCount,
  markMessagesRead,
  markGroupMessagesRead,
  getFriendList,
  getMyGroups,
  getGroupInfo,
  getGroupMembers,
  getGroupRequests,
  type FriendListItem,
} from "@/lib/api"
import type { MyGroupItem } from "@/types"
import * as chatCache from "@/lib/chatCache"
import { SidebarProvider } from "@/components/ui/sidebar"

// API 基础地址
const API_BASE_URL = import.meta.env.VITE_API_HOST
  ? `http://${import.meta.env.VITE_API_HOST}/api`
  : "/api"

export function ChatPage() {
  const navigate = useNavigate()

  // 状态
  const [isDark, setIsDark] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null)
  const [connected, setConnected] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; nickname: string; avatar?: string } | null>(null)
  const [showAddFriendDialog, setShowAddFriendDialog] = useState(false)
  const [showFriendRequestsDialog, setShowFriendRequestsDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false)
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [sortBy, setSortBy] = useState<"recent" | "alpha">("recent")
  const [groupMembers, setGroupMembers] = useState<Map<number, GroupMember[]>>(new Map())

  // 信息卡片相关状态
  const [showFriendInfoDialog, setShowFriendInfoDialog] = useState(false)
  const [friendInfoUserId, setFriendInfoUserId] = useState<number>(0)
  const [showGroupInfoDialog, setShowGroupInfoDialog] = useState(false)
  const [showGroupMembersDialog, setShowGroupMembersDialog] = useState(false)

  // 使用 ref 存储 currentUser，避免 useCallback 闭包问题
  const currentUserRef = useRef(currentUser)
  currentUserRef.current = currentUser

  // 使用 ref 存储 selectedContact，避免 useCallback 闭包问题
  const selectedContactRef = useRef(selectedContact)
  selectedContactRef.current = selectedContact

  // 初始化
  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem("token")
    const username = localStorage.getItem("username")
    if (!token || !username) {
      navigate("/auth")
      return
    }

    // 恢复主题
    const savedTheme = localStorage.getItem("theme")
    const isDarkMode = savedTheme === "dark"
    setIsDark(isDarkMode)
    document.documentElement.classList.toggle("dark", isDarkMode)

    // 获取用户信息
    fetchUserInfo(token)

    // 获取好友列表和群组列表
    fetchContacts()

    // 获取待处理申请数量
    fetchPendingCounts()

    // 连接 WebSocket
    connectWebSocket(token)

    return () => {
      wsClient?.close()
    }
  }, [navigate])

// 页面可见性变化时刷新数据
  useEffect(() => {
    let mounted = true
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null
    let contactsTimeout: ReturnType<typeof setTimeout> | null = null

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 延迟 100ms 触发，等待页面完全可见
        pendingTimeout = setTimeout(async () => {
          if (mounted) {
            try {
              await fetchPendingCounts()
            } catch (error) {
              console.error("Failed to fetch pending counts:", error)
            }
          }
        }, 100)

        contactsTimeout = setTimeout(async () => {
          if (mounted) {
            try {
              await fetchContacts()
            } catch (error) {
              console.error("Failed to fetch contacts:", error)
            }
          }
        }, 200)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      mounted = false
      if (pendingTimeout) clearTimeout(pendingTimeout)
      if (contactsTimeout) clearTimeout(contactsTimeout)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  // 定期刷新联系人列表（更新在线状态），每30秒刷新一次
  useEffect(() => {
    const interval = setInterval(() => {
      fetchContacts().then((newContacts) => {
        // 同步更新 selectedContact 的在线状态
        if (selectedContactRef.current && selectedContactRef.current.chat_type === ChatType.Single) {
          const updatedContact = newContacts?.find((c: Contact) => c.id === selectedContactRef.current?.id)
          if (updatedContact) {
            setSelectedContact(updatedContact)
          }
        }
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // 获取用户信息
  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/info`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const result = await response.json()
      if (result.code === 0) {
        setCurrentUser(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error)
    }
  }

  // 获取待处理申请数量 (好友 + 群组)
  const fetchPendingCounts = async () => {
    try {
      // 并行获取好友和群组申请
      const [friendResult, groupResult] = await Promise.all([
        getPendingRequestCount(),
        getGroupRequests(),
      ])

      // 好友申请
      const friendCount = friendResult.data?.count || 0

      // 群组申请
      const groupCount = Array.isArray(groupResult.data)
        ? groupResult.data.filter((req: { status: number }) => req.status === 0).length
        : 0

      // 合并计数
      setPendingRequestsCount(friendCount + groupCount)
    } catch (error) {
      console.error("Failed to fetch pending counts:", error)
    }
  }

  // 获取联系人列表（好友+群组）
  const fetchContacts = async (): Promise<Contact[]> => {
    try {
      // 并行获取好友和群组
      const [friendRes, groupsRes] = await Promise.all([getFriendList(), getMyGroups()])

      // 处理好友列表
      const friends: Contact[] = friendRes.code === 0 && friendRes.data
        ? (friendRes.data as FriendListItem[]).map((item) => ({
            id: item.id,
            username: item.username,
            nickname: item.nickname,
            avatar: item.avatar,
            online: item.online,
            unread_count: item.unread_count,
            last_message_timestamp: item.last_message_time || 0,
            last_message_time: item.last_message_time
              ? new Date(item.last_message_time).toISOString()
              : undefined,
            chat_type: ChatType.Single,
          }))
        : []

      // 处理群组列表
      const groupContacts: Contact[] = groupsRes.code === 0 && groupsRes.data
        ? await Promise.all(
            (groupsRes.data as MyGroupItem[]).map(async (group) => {
              // 获取群组详细信息
              const infoRes = await getGroupInfo(group.id)
              const groupInfo = infoRes.data

              // 获取最后一条消息
              const lastMsg = await chatCache.getLastGroupMessage(group.id)

              // 获取群成员
              await fetchGroupMembers(group.id)

              return {
                id: group.id,
                username: group.name,
                nickname: group.name,
                avatar: group.icon,
                online: false,
                unread_count: group.unread_count,
                last_message_timestamp: group.last_message_time || 0,
                last_message_time: group.last_message_time
                  ? new Date(group.last_message_time).toISOString()
                  : undefined,
                last_message: lastMsg?.content || "",
                chat_type: ChatType.Group,
                group_info: groupInfo
                  ? {
                      id: groupInfo.id,
                      code: groupInfo.code,
                      name: groupInfo.name,
                      desc: groupInfo.desc,
                      icon: groupInfo.icon,
                      owner_id: groupInfo.owner_id,
                      member_count: groupInfo.member_count,
                    }
                  : undefined,
              } as Contact
            })
          )
        : []

      // 获取每个联系人的最后消息内容
      const fetchPromises = [...friends, ...groupContacts].map(async (contact) => {
        const lastMsg = await chatCache.getLastMessage(contact.id, contact.chat_type)
        return {
          id: contact.id,
          chat_type: contact.chat_type,
          last_message: lastMsg?.content || contact.last_message || "",
        }
      })

      const lastMessageUpdates = await Promise.all(fetchPromises)

      // 合并最后消息内容
      const enrichedContacts = [...friends, ...groupContacts].map((contact) => {
        const update = lastMessageUpdates.find((u) => u.id === contact.id && u.chat_type === contact.chat_type)
        return {
          ...contact,
          last_message: update?.last_message || contact.last_message,
        }
      })

      // 按最后消息时间排序
      enrichedContacts.sort((a, b) => {
        const timeA = a.last_message_timestamp || 0
        const timeB = b.last_message_timestamp || 0
        return timeB - timeA
      })

      setContacts(enrichedContacts)
      return enrichedContacts
    } catch (error) {
      console.error("Failed to fetch contacts:", error)
      return []
    }
  }

  // 获取群成员
  const fetchGroupMembers = async (groupId: number) => {
    try {
      const result = await getGroupMembers(groupId)
      if (result.code === 0 && result.data) {
        setGroupMembers((prev) => {
          const newMap = new Map(prev)
          newMap.set(groupId, result.data as GroupMember[])
          return newMap
        })
      }
    } catch (error) {
      console.error("Failed to fetch group members:", error)
    }
  }

  // 连接 WebSocket
  const connectWebSocket = async (token: string) => {
    try {
      const wsUrl = getWebSocketUrl(token)
      const client = new WebSocketClient(wsUrl)

      // 订阅消息
      client.subscribe((message) => {
        handleWsMessage(message as { from_id: number; type: number; content: string; send_time: number; from_name?: string; target_id?: number })
      })

      await client.connect()
      setWsClient(client)
      setConnected(true)
    } catch (error) {
      console.error("Failed to connect WebSocket:", error)
      setConnected(false)
    }
  }

  // 处理新消息（通用）
  const handleNewMessage = useCallback(
    async (msg: { from_id: number; type: number; content: string; send_time: number; from_name?: string; target_id?: number }) => {
      const isGroupMsg = msg.type === 3
      const chatType = isGroupMsg ? ChatType.Group : ChatType.Single
      const senderId = msg.from_id
      const receiverId = currentUserRef.current?.id || 0
      const selectedContact = selectedContactRef.current

      // 如果是自己发的消息，跳过
      if (senderId === receiverId) return

      const timestamp = new Date(msg.send_time * 1000).toISOString()
      const ts = msg.send_time * 1000

      // 群聊消息：后端返回的格式没有 target_id，需要通过 sender_id 找到对应的群
      // 但我们可以通过当前选中的联系人群聊来判断
      // 群聊消息的 targetId 应该是消息要发送到的群ID，但后端没有返回
      // 这里我们使用一个策略：群聊消息只更新联系人列表，消息列表会在进入聊天时加载
      const targetId = msg.target_id || senderId // fallback，但群聊时这个值不准确

      // 判断是否是当前查看的聊天
      // 群聊时，由于后端没返回 target_id，我们通过消息类型来判断
      const isCurrentChat =
        selectedContact &&
        ((isGroupMsg && selectedContact.chat_type === ChatType.Group) ||
          (!isGroupMsg && selectedContact.id === senderId))

      // 创建消息对象
      const newMessage: Message = {
        id: `temp-${ts}`,
        sender_id: senderId,
        receiver_id: isGroupMsg ? selectedContact?.id || targetId : targetId,
        content: msg.content,
        timestamp,
        status: isCurrentChat ? "read" : "delivered",
        chat_type: chatType,
        sender_name: isGroupMsg ? msg.from_name : undefined,
      }

      // 如果是当前对话的消息，直接添加到列表
      if (isCurrentChat) {
        setMessages((prev) => [...prev, newMessage])
      }

      // 保存消息到 IndexedDB
      await chatCache.saveMessage(newMessage)

      // 更新联系人列表 - 群聊需要找到对应的群
      setContacts((prev) => {
        // 群聊时，需要遍历找到对应的群（通过 senderId 是群成员来判断）
        if (isGroupMsg) {
          // 对于群聊消息，我们更新所有匹配的群
          // 这里简化处理：群聊消息的目标ID不确定，联系人列表更新可能不准确
          // 但消息已经保存到 IndexedDB，进入聊天时会加载
          return prev.map((contact) => {
            // 简单匹配：当前选中的群聊
            if (selectedContact?.chat_type === ChatType.Group && contact.id === selectedContact.id) {
              return {
                ...contact,
                last_message: `${msg.from_name || `用户${senderId}`}: ${msg.content}`,
                last_message_time: timestamp,
                last_message_timestamp: msg.send_time * 1000,
                unread_count: isCurrentChat ? 0 : contact.unread_count + 1,
              }
            }
            return contact
          })
        }

        // 私聊
        return prev.map((contact) => {
          if (contact.id === senderId && contact.chat_type === ChatType.Single) {
            return {
              ...contact,
              last_message: msg.content,
              last_message_time: timestamp,
              last_message_timestamp: msg.send_time * 1000,
              unread_count: isCurrentChat ? 0 : contact.unread_count + 1,
            }
          }
          return contact
        })
      })
    },
    []
  )

  // 处理 WebSocket 消息
  const handleWsMessage = useCallback(
    async (message: { from_id: number; type: number; content: string; send_time: number; from_name?: string; target_id?: number }) => {
      console.log("[WS] Received message:", JSON.stringify(message))

      // 处理嵌套格式: {"type": 2, "payload": {...}}
      if (message.type === undefined && "payload" in message) {
        const payloadMessage = (message as { payload: { from_id: number; type: number; content: string; send_time: number; from_name?: string; target_id?: number } }).payload
        if (payloadMessage) {
          console.log("[WS] Extracted from payload:", JSON.stringify(payloadMessage))
          await handleWsMessage(payloadMessage)
          return
        }
      }

      switch (message.type) {
        case WsMessageType.TypeSingleMsg:
          await handleNewMessage(message)
          break
        case WsMessageType.TypeGroupMsg:
          await handleNewMessage(message)
          break
        case WsMessageType.TypeHeartbeat:
          // 心跳响应
          console.log("[WS] Heartbeat received")
          break
        case WsMessageType.TypeLogin:
          // 用户上线通知
          console.log("[WS] Login notification received")
          break
        default:
          console.warn("[WS] Unknown message type:", message.type, message)
      }
    },
    [handleNewMessage]
  )

  // 获取聊天历史
  const fetchChatHistory = async (targetId: number, chatType: ChatType) => {
    if (!currentUser) return

    console.log("[Chat] fetchChatHistory called for targetId:", targetId, "chatType:", chatType)
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/chat/history?target_id=${targetId}&chat_type=${chatType}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const result = await response.json()
      if (result.code === 0) {
        console.log("[Chat] fetchChatHistory result count:", result.data?.length || 0)

        // 从 IndexedDB 读取已存在的消息
        const cachedMessages = await chatCache.getCachedMessages(targetId, chatType)

        // 处理历史消息
        const historyMessages: Message[] = (result.data || []).map(
          (msg: { id: number; from_user_id: number; to_user_id: number; content: string; created_at: number }) => ({
            id: String(msg.id),
            sender_id: msg.from_user_id,
            receiver_id: msg.to_user_id,
            content: msg.content,
            timestamp: new Date(msg.created_at).toISOString(),
            status: "delivered" as const,
            chat_type: chatType,
          })
        )

        // 如果是群聊，获取发送者名称
        if (chatType === ChatType.Group) {
          // 先获取群成员信息
          await fetchGroupMembers(targetId)
          const members = groupMembers.get(targetId) || []
          const memberMap = new Map(members.map((m) => [m.user_id, m.nickname]))

          // 补充发送者名称
          historyMessages.forEach((msg) => {
            msg.sender_name = memberMap.get(msg.sender_id) || `用户${msg.sender_id}`
          })
        }

        // 用于记录哪些缓存消息已被历史消息替换
        const matchedCacheIds = new Set<string>()

        // 合并历史消息和缓存消息
        const allMessages: Message[] = []
        for (const histMsg of historyMessages) {
          // 检查是否有匹配的缓存消息
          const matchIndex = cachedMessages.findIndex(
            (cached) =>
              cached.id.startsWith("temp-") &&
              cached.content === histMsg.content &&
              Math.abs(new Date(cached.timestamp).getTime() - new Date(histMsg.timestamp).getTime()) < 2000
          )

          if (matchIndex !== -1) {
            matchedCacheIds.add(cachedMessages[matchIndex].id)
            histMsg.status = "read"
            allMessages.push(histMsg)
          } else {
            if (!cachedMessages.some((c) => c.id === histMsg.id)) {
              allMessages.push(histMsg)
            }
          }
        }

        // 添加没有匹配的缓存消息
        for (const cached of cachedMessages) {
          if (!matchedCacheIds.has(cached.id)) {
            allMessages.push(cached)
          }
        }

        // 按时间排序
        allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        // 使用 Set 去重，确保消息唯一性
        const uniqueMessages = Array.from(
          new Map(allMessages.map((m) => [`${m.id}_${m.timestamp}`, m])).values()
        )

        // 批量保存到 IndexedDB
        await chatCache.saveMessages(uniqueMessages)

        // 更新消息列表
        setMessages(uniqueMessages)

        // 计算未读消息数量
        const unreadCount = uniqueMessages.filter((m) => m.status === "delivered").length

        // 更新该联系人的未读计数
        setContacts((prev) =>
          prev.map((c) =>
            c.id === targetId && c.chat_type === chatType
              ? {
                  ...c,
                  unread_count: unreadCount,
                  last_message_time: uniqueMessages[uniqueMessages.length - 1]?.timestamp || c.last_message_time,
                }
              : c
          )
        )
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error)
      // 从 IndexedDB 读取缓存的消息作为后备
      try {
        const cachedMessages = await chatCache.getCachedMessages(targetId, chatType)
        setMessages(cachedMessages)
      } catch {
        setMessages([])
      }
    } finally {
      setLoading(false)
    }
  }

  // 选择联系人/群组
  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact)

    // 如果是群聊，获取成员信息
    if (contact.chat_type === ChatType.Group) {
      await fetchGroupMembers(contact.id)
    }

    await fetchChatHistory(contact.id, contact.chat_type || ChatType.Single)

    // 标记已读
    if (contact.chat_type === ChatType.Single) {
      try {
        await markMessagesRead(contact.id)
      } catch (error) {
        console.error("Failed to mark single chat messages as read:", error)
      }
    } else if (contact.chat_type === ChatType.Group) {
      try {
        await markGroupMessagesRead(contact.id)
      } catch (error) {
        console.error("Failed to mark group chat messages as read:", error)
      }
    }

    // 清除本地未读计数
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contact.id && c.chat_type === (contact.chat_type || c.chat_type)
          ? { ...c, unread_count: 0 }
          : c
      )
    )
  }

  // 发送消息
  const handleSendMessage = async (content: string) => {
    if (!selectedContact || !wsClient || !currentUser) return

    const isGroupChat = selectedContact.chat_type === ChatType.Group
    const now = Date.now()
    const timestamp = new Date(now).toISOString()
    const tempId = `temp-${now}`

    // 创建临时消息
    const tempMessage: Message = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: selectedContact.id,
      content,
      timestamp,
      status: "sending",
      chat_type: isGroupChat ? ChatType.Group : ChatType.Single,
      sender_name: isGroupChat ? currentUser.nickname || currentUser.username : undefined,
    }

    // 更新消息列表
    setMessages((prev) => [...prev, tempMessage])

    // 保存到 IndexedDB
    await chatCache.saveMessage(tempMessage)

    // 发送 WebSocket 消息
    if (isGroupChat) {
      wsClient.sendGroupMsg({
        target_id: selectedContact.id,
        content,
      })
    } else {
      wsClient.sendSingleMsg({
        target_id: selectedContact.id,
        content,
      })
    }

    // 更新本地消息状态为已发送
    setMessages((prev) =>
      prev.map((msg) => (msg.id === tempId ? { ...msg, status: "sent" } : msg))
    )

    // 更新 IndexedDB 中的消息状态
    await chatCache.updateMessageStatus(selectedContact.id, tempId, "sent", selectedContact.chat_type)

    // 更新联系人列表
    const lastMsgContent = isGroupChat
      ? `${currentUser.nickname || currentUser.username}: ${content}`
      : content

    setContacts((prev) =>
      prev.map((c) =>
        c.id === selectedContact.id && c.chat_type === selectedContact.chat_type
          ? { ...c, last_message: lastMsgContent, last_message_time: timestamp, last_message_timestamp: now }
          : c
      )
    )
  }

  // 创建群组成功后的回调
  const handleGroupCreated = async (groupId: number) => {
    await fetchContacts()
    // 自动进入新创建的群组
    const newGroup = contacts.find((c) => c.id === groupId && c.chat_type === ChatType.Group)
    if (newGroup) {
      await handleSelectContact(newGroup)
    }
  }

  // 退出登录
  const handleLogout = () => {
    wsClient?.close()
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    navigate("/auth")
  }

  // 切换主题
  const handleToggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    localStorage.setItem("theme", newIsDark ? "dark" : "light")
    document.documentElement.classList.toggle("dark", newIsDark)
  }

  // 显示好友信息卡片
  const handleShowFriendInfo = () => {
    if (selectedContact && selectedContact.chat_type === ChatType.Single) {
      setFriendInfoUserId(selectedContact.id)
      setShowFriendInfoDialog(true)
    }
  }

  // 显示群聊信息卡片
  const handleShowGroupInfo = () => {
    if (selectedContact && selectedContact.chat_type === ChatType.Group) {
      setShowGroupInfoDialog(true)
    }
  }

  // 显示群成员列表
  const handleShowGroupMembers = () => {
    setShowGroupInfoDialog(false)
    setShowGroupMembersDialog(true)
  }

  // 打开信息卡片（根据聊天类型）
  const handleOpenInfo = () => {
    if (selectedContact?.chat_type === ChatType.Single) {
      handleShowFriendInfo()
    } else if (selectedContact?.chat_type === ChatType.Group) {
      handleShowGroupInfo()
    }
  }

  // 拉黑或删除好友后刷新联系人列表
  const handleUserBlockedOrFriendDeleted = () => {
    fetchContacts()
  }

  if (!currentUser) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDark ? "bg-[hsl(0,0%,8%)]" : "bg-neutral-100"}`}>
        <div className={`text-sm ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundImage: isDark
          ? 'repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)'
          : 'repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(0,0,0,0.03) 20px, rgba(0,0,0,0.03) 40px)',
      }}
    >
      {/* Connection Status */}
      {!connected && (
        <div
          className={`px-4 py-2 text-center text-sm ${
            isDark ? "bg-yellow-900/30 text-yellow-500" : "bg-yellow-100 text-yellow-700"
          }`}
        >
          正在连接服务器...
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contact List Sidebar */}
        <SidebarProvider defaultOpen={true}>
          <ContactList
            contacts={contacts}
            selectedId={selectedContact?.id ?? null}
            onSelect={handleSelectContact}
            onOpenAddFriend={() => setShowAddFriendDialog(true)}
            onOpenSettings={() => setShowSettingsDialog(true)}
            onOpenFriendRequests={() => setShowFriendRequestsDialog(true)}
            onOpenCreateGroup={() => setShowCreateGroupDialog(true)}
            onOpenJoinGroup={() => setShowJoinGroupDialog(true)}
            currentUsername={currentUser.nickname || currentUser.username}
            currentEmail={currentUser.username}
            currentAvatar={currentUser.avatar}
            isDark={isDark}
            pendingRequestsCount={pendingRequestsCount}
            sortBy={sortBy}
            onToggleSort={() => setSortBy((prev) => (prev === "recent" ? "alpha" : "recent"))}
            onToggleTheme={handleToggleTheme}
            onLogout={handleLogout}
          />
        </SidebarProvider>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ChatWindow
            contact={selectedContact}
            messages={messages}
            currentUserId={currentUser.id}
            isDark={isDark}
            loading={loading}
            groupMembers={selectedContact?.chat_type === ChatType.Group ? new Map(groupMembers.get(selectedContact.id)?.map(m => [m.user_id, m]) || []) : undefined}
            onShowInfo={handleOpenInfo}
          />

          {selectedContact && (
            <ChatInput
              onSend={handleSendMessage}
              isDark={isDark}
              disabled={!connected}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddFriendDialog isOpen={showAddFriendDialog} onClose={() => setShowAddFriendDialog(false)} isDark={isDark} />

      <CombinedRequestsDialog
        isOpen={showFriendRequestsDialog}
        onClose={() => setShowFriendRequestsDialog(false)}
        isDark={isDark}
        onRequestCountChange={setPendingRequestsCount}
      />

      <SettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        isDark={isDark}
        onToggleTheme={() => {
          const newIsDark = !isDark
          setIsDark(newIsDark)
          localStorage.setItem("theme", newIsDark ? "dark" : "light")
          document.documentElement.classList.toggle("dark", newIsDark)
        }}
        onLogout={handleLogout}
        onUserInfoChange={(user) => {
          if (currentUser) {
            setCurrentUser({ ...currentUser, ...user })
          }
        }}
      />

      <CreateGroupDialog
        isOpen={showCreateGroupDialog}
        onClose={() => setShowCreateGroupDialog(false)}
        isDark={isDark}
        onSuccess={handleGroupCreated}
      />

      <JoinGroupDialog
        isOpen={showJoinGroupDialog}
        onClose={() => setShowJoinGroupDialog(false)}
        isDark={isDark}
        onJoinSuccess={fetchContacts}
      />

      {/* 好友信息卡片 */}
      <FriendInfoDialog
        isOpen={showFriendInfoDialog}
        onClose={() => setShowFriendInfoDialog(false)}
        userId={friendInfoUserId}
        isDark={isDark}
        onUserBlocked={handleUserBlockedOrFriendDeleted}
        onFriendDeleted={handleUserBlockedOrFriendDeleted}
      />

      {/* 群聊信息卡片 */}
      <GroupInfoDialog
        isOpen={showGroupInfoDialog}
        onClose={() => setShowGroupInfoDialog(false)}
        contact={selectedContact}
        groupMembers={selectedContact?.chat_type === ChatType.Group ? groupMembers.get(selectedContact.id) : undefined}
        isDark={isDark}
        onViewMembers={handleShowGroupMembers}
      />

      {/* 群成员列表 */}
      <GroupMembersDialog
        isOpen={showGroupMembersDialog}
        onClose={() => setShowGroupMembersDialog(false)}
        groupName={selectedContact?.nickname || selectedContact?.username || "群聊"}
        members={selectedContact?.chat_type === ChatType.Group ? groupMembers.get(selectedContact?.id) : undefined}
        isDark={isDark}
      />
    </div>
  )
}
