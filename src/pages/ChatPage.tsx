import { useEffect, useState, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ContactList } from "@/components/chat/ContactList"
import { ChatWindow } from "@/components/chat/ChatWindow"
import { ChatInput } from "@/components/chat/ChatInput"
import { AddFriendDialog } from "@/components/chat/AddFriendDialog"
import { FriendRequestsDialog } from "@/components/chat/FriendRequestsDialog"
import { SettingsDialog } from "@/components/chat/SettingsDialog"
import { WsMessageType } from "@/types"
import type { Contact, Message, WsMessage } from "@/types"
import { WebSocketClient, getWebSocketUrl } from "@/lib/websocket"
import { getPendingRequestCount, markMessagesRead, getFriendList, type FriendListItem } from "@/lib/api"
import * as chatCache from "@/lib/chatCache"

// API 基础地址
const API_BASE_URL = import.meta.env.VITE_API_HOST
  ? `http://${import.meta.env.VITE_API_HOST}/api`
  : "http://localhost:8080/api"

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
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; nickname: string } | null>(null)
  const [showAddFriendDialog, setShowAddFriendDialog] = useState(false)
  const [showFriendRequestsDialog, setShowFriendRequestsDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [sortBy, setSortBy] = useState<"recent" | "alpha">("recent")

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

    // 获取好友列表
    fetchContacts()

    // 获取待处理好友申请数量
    fetchPendingRequestsCount()

    // 连接 WebSocket
    connectWebSocket(token)

    return () => {
      wsClient?.close()
    }
  }, [navigate])

  // 页面可见性变化时刷新待处理申请数量
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPendingRequestsCount()
        fetchContacts()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  // 定期刷新好友列表（更新在线状态），每30秒刷新一次
  useEffect(() => {
    const interval = setInterval(() => {
      fetchContacts().then((newContacts) => {
        // 同步更新 selectedContact 的在线状态
        if (selectedContactRef.current) {
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

  // 获取联系人列表
  const fetchContacts = async (): Promise<Contact[]> => {
    try {
      const result = await getFriendList()
      if (result.code === 0 && result.data) {
        const friendList = result.data as FriendListItem[]

        // 转换后端数据为 Contact 格式
        const contactsData: Contact[] = friendList.map((item) => ({
          id: item.id,
          username: item.username,
          nickname: item.nickname,
          avatar: item.avatar,
          online: item.online,
          unread_count: item.unread_count,
          last_message_timestamp: item.last_message_time,
          last_message_time: item.last_message_time
            ? new Date(item.last_message_time).toISOString()
            : undefined,
        }))

        // 并行拉取每个联系人的最近历史消息（用于显示最后消息内容）
        const fetchPromises = contactsData.map(async (contact) => {
          await fetchChatHistory(contact.id)
          // 从缓存获取最后消息内容
          const lastMsg = await chatCache.getLastMessage(contact.id)
          return {
            id: contact.id,
            last_message: lastMsg?.content || "",
          }
        })

        const lastMessageUpdates = await Promise.all(fetchPromises)

        // 合并最后消息内容
        const enrichedContacts = contactsData.map((contact) => {
          const update = lastMessageUpdates.find((u) => u.id === contact.id)
          return {
            ...contact,
            last_message: update?.last_message || contact.last_message,
          }
        })

        setContacts(enrichedContacts)
        return enrichedContacts
      }
      return []
    } catch (error) {
      console.error("Failed to fetch contacts:", error)
      return []
    }
  }

  // 获取待处理好友申请数量
  const fetchPendingRequestsCount = async () => {
    try {
      const result = await getPendingRequestCount()
      if (result.code === 0) {
        setPendingRequestsCount(result.data.count || 0)
      }
    } catch (error) {
      console.error("Failed to fetch pending requests count:", error)
    }
  }

  // 连接 WebSocket
  const connectWebSocket = async (token: string) => {
    try {
      const wsUrl = getWebSocketUrl(token)
      const client = new WebSocketClient(wsUrl)

      // 订阅消息 - 后端发送的是 Reply 结构: { from_id, type, content, send_time }
      client.subscribe((message: { from_id: number; type: number; content: string; send_time: number }) => {
        handleWsMessage(message)
      })

      await client.connect()
      setWsClient(client)
      setConnected(true)
    } catch (error) {
      console.error("Failed to connect WebSocket:", error)
      setConnected(false)
    }
  }

  // 处理新消息 (后端 Reply 结构: { from_id, type, content, send_time })
  const handleNewMessage = useCallback(async (msg: { from_id: number; type: number; content: string; send_time: number }) => {
    const senderId = msg.from_id
    const receiverId = currentUserRef.current?.id || 0
    const selectedContact = selectedContactRef.current

    // 如果是自己发的消息（不应该发生，但做兼容），不处理
    if (senderId === receiverId) {
      return
    }

    const timestamp = new Date(msg.send_time * 1000).toISOString()
    const ts = msg.send_time * 1000 // 毫秒时间戳
    const isCurrentChat = selectedContact && senderId === selectedContact.id

    // 创建消息对象
    const newMessage: Message = {
      id: `temp-${ts}`,
      sender_id: senderId,
      receiver_id: receiverId,
      content: msg.content,
      timestamp,
      status: isCurrentChat ? "read" : "delivered", // 如果正在查看，直接标记为已读
    }

    // 如果是当前对话的消息，直接添加到列表
    if (isCurrentChat) {
      setMessages((prev) => [...prev, newMessage])
      setSelectedContact((prev) => prev ? { ...prev, online: true } : null)
    }

    // 保存消息到 IndexedDB
    await chatCache.saveMessage(newMessage)

    // 更新联系人列表：最后消息 + 设置发送者为在线状态
    setContacts((prev) =>
      prev.map((contact) => {
        if (contact.id === senderId) {
          return {
            ...contact,
            online: true,
            last_message: msg.content,
            last_message_time: timestamp,
            // 如果当前正在和该联系人聊天，未读计数设为0；否则增加未读
            unread_count: isCurrentChat ? 0 : contact.unread_count + 1,
          }
        }
        return contact
      })
    )
  }, [])

  // 处理 WebSocket 消息 - 后端发送的是 Reply 结构: { from_id, type, content, send_time }
  const handleWsMessage = useCallback(async (message: { from_id: number; type: number; content: string; send_time: number }) => {
    switch (message.type) {
      case WsMessageType.TypeSingleMsg:
        await handleNewMessage(message)
        break
      case WsMessageType.TypeHeartbeat:
        // 心跳响应
        break
    }
  }, [handleNewMessage])

  // 获取聊天历史
  const fetchChatHistory = async (targetId: number) => {
    if (!currentUser) return

    console.log("[Chat] fetchChatHistory called for targetId:", targetId)
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/chat/history?target_id=${targetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const result = await response.json()
      if (result.code === 0) {
        console.log("[Chat] fetchChatHistory result count:", result.data?.length || 0)

        // 从 IndexedDB 读取已存在的消息
        const cachedMessages = await chatCache.getCachedMessages(targetId)

        // 处理历史消息，匹配本地缓存
        const historyMessages: Message[] = (result.data || []).map((msg: { id: number; from_user_id: number; to_user_id: number; content: string; created_at: number }) => ({
          id: String(msg.id),
          sender_id: msg.from_user_id,
          receiver_id: msg.to_user_id,
          content: msg.content,
          timestamp: new Date(msg.created_at).toISOString(),
          status: "delivered" as const, // 默认未读状态
        }))

        // 用于记录哪些缓存消息已被历史消息替换
        const matchedCacheIds = new Set<string>()

        // 合并历史消息和缓存消息
        const allMessages: Message[] = []
        for (const histMsg of historyMessages) {
          // 检查是否有匹配的缓存消息（通过内容和时间戳匹配）
          const matchIndex = cachedMessages.findIndex(
            (cached) =>
              cached.id.startsWith("temp-") &&
              cached.content === histMsg.content &&
              Math.abs(new Date(cached.timestamp).getTime() - new Date(histMsg.timestamp).getTime()) < 2000
          )

          if (matchIndex !== -1) {
            // 找到匹配，用真实消息替换
            matchedCacheIds.add(cachedMessages[matchIndex].id)
            histMsg.status = "read"
            allMessages.push(histMsg)
          } else {
            // 没有匹配，检查是否是全新的消息
            if (!cachedMessages.some((c) => c.id === histMsg.id)) {
              allMessages.push(histMsg)
            }
          }
        }

        // 添加没有匹配的缓存消息（可能是当前对话中收到的消息）
        for (const cached of cachedMessages) {
          if (!matchedCacheIds.has(cached.id)) {
            allMessages.push(cached)
          }
        }

        // 按时间排序
        allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        // 批量保存到 IndexedDB
        await chatCache.saveMessages(allMessages)

        // 更新消息列表
        setMessages(allMessages)

        // 计算未读消息数量
        const unreadCount = allMessages.filter((m) => m.status === "delivered").length

        // 更新该联系人的未读计数
        setContacts((prev) =>
          prev.map((c) =>
            c.id === targetId
              ? { ...c, unread_count: unreadCount, last_message_time: allMessages[allMessages.length - 1]?.timestamp || c.last_message_time }
              : c
          )
        )
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error)
      // 从 IndexedDB 读取缓存的消息作为后备
      try {
        const cachedMessages = await chatCache.getCachedMessages(targetId)
        setMessages(cachedMessages)
      } catch {
        setMessages([])
      }
    } finally {
      setLoading(false)
    }
  }

  // 选择联系人 - 调用后端标记已读接口并清除未读计数
  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact)
    await fetchChatHistory(contact.id)

    // 调用后端标记已读接口
    try {
      await markMessagesRead(contact.id)
    } catch (error) {
      console.error("Failed to mark messages as read:", error)
    }

    // 清除本地未读计数
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unread_count: 0 } : c))
    )
  }

  // 发送消息
  const handleSendMessage = async (content: string) => {
    if (!selectedContact || !wsClient || !currentUser) return

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
    }

    // 更新消息列表
    setMessages((prev) => [...prev, tempMessage])

    // 保存到 IndexedDB
    await chatCache.saveMessage(tempMessage)

    // 发送 WebSocket 消息
    wsClient.sendSingleMsg({
      target_id: selectedContact.id,
      content,
    })

    // 更新本地消息状态为已发送
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === tempId ? { ...msg, status: "sent" } : msg
      )
    )

    // 更新 IndexedDB 中的消息状态
    await chatCache.updateMessageStatus(selectedContact.id, tempId, "sent")

    // 更新联系人列表
    setContacts((prev) =>
      prev.map((c) =>
        c.id === selectedContact.id
          ? { ...c, last_message: content, last_message_time: timestamp }
          : c
      )
    )
  }

  // 退出登录
  const handleLogout = () => {
    wsClient?.close()
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    navigate("/auth")
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
    <div className="h-screen flex flex-col overflow-hidden" style={{
      backgroundImage: isDark
        ? 'repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)'
        : 'repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(0,0,0,0.03) 20px, rgba(0,0,0,0.03) 40px)',
    }}>
      {/* Connection Status */}
      {!connected && (
        <div className={`px-4 py-2 text-center text-sm ${
          isDark ? "bg-yellow-900/30 text-yellow-500" : "bg-yellow-100 text-yellow-700"
        }`}>
          正在连接服务器...
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contact List Sidebar */}
        <div className="w-80 flex-shrink-0">
          <ContactList
            contacts={contacts}
            selectedId={selectedContact?.id ?? null}
            onSelect={handleSelectContact}
            onOpenAddFriend={() => setShowAddFriendDialog(true)}
            onOpenSettings={() => setShowSettingsDialog(true)}
            onOpenFriendRequests={() => setShowFriendRequestsDialog(true)}
            currentUsername={currentUser.nickname || currentUser.username}
            isDark={isDark}
            pendingRequestsCount={pendingRequestsCount}
            sortBy={sortBy}
            onToggleSort={() => setSortBy((prev) => (prev === "recent" ? "alpha" : "recent"))}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatWindow
            contact={selectedContact}
            messages={messages}
            currentUserId={currentUser.id}
            isDark={isDark}
            loading={loading}
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

      {/* 添加好友对话框 */}
      <AddFriendDialog
        isOpen={showAddFriendDialog}
        onClose={() => setShowAddFriendDialog(false)}
        isDark={isDark}
      />

      {/* 好友申请对话框 */}
      <FriendRequestsDialog
        isOpen={showFriendRequestsDialog}
        onClose={() => setShowFriendRequestsDialog(false)}
        isDark={isDark}
        onRequestCountChange={setPendingRequestsCount}
      />

      {/* 设置对话框 */}
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
    </div>
  )
}
