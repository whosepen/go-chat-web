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
import { getPendingRequestCount } from "@/lib/api"

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
    fetchContacts(token)

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
        fetchContacts(localStorage.getItem("token") || "")
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
      const token = localStorage.getItem("token")
      if (token) {
        fetchContacts(token).then((newContacts) => {
          // 同步更新 selectedContact 的在线状态
          if (selectedContactRef.current) {
            const updatedContact = newContacts?.find((c: Contact) => c.id === selectedContactRef.current?.id)
            if (updatedContact) {
              setSelectedContact(updatedContact)
            }
          }
        })
      }
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
  const fetchContacts = async (token: string): Promise<Contact[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/friend/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const result = await response.json()
      if (result.code === 0) {
        const newContacts = result.data || []
        // 合并本地的 last_message 和 last_message_time，避免刷新后丢失
        setContacts((prevContacts) => {
          return newContacts.map((newContact: Contact) => {
            const existingContact = prevContacts.find((c) => c.id === newContact.id)
            return {
              ...newContact,
              last_message: newContact.last_message || existingContact?.last_message,
              last_message_time: newContact.last_message_time || existingContact?.last_message_time,
              unread_count: existingContact?.unread_count || 0,
            }
          })
        })
        return newContacts
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

      // 订阅消息
      client.subscribe((message: WsMessage) => {
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
  const handleNewMessage = useCallback((msg: { from_id: number; type: number; content: string; send_time: number }) => {
    const timestamp = new Date(msg.send_time * 1000).toISOString()
    const senderId = msg.from_id
    const receiverId = currentUserRef.current?.id || 0
    const selectedContact = selectedContactRef.current

    // 如果是自己发的消息（不应该发生，但做兼容），不处理
    if (senderId === receiverId) {
      return
    }

    const newMessage: Message = {
      id: `${timestamp}-${senderId}`,
      sender_id: senderId,
      receiver_id: receiverId,
      content: msg.content,
      timestamp,
      status: "delivered",
    }

    // 如果是当前对话的消息
    if (selectedContact && senderId === selectedContact.id) {
      setMessages((prev) => [...prev, newMessage])
      // 同步更新 selectedContact 的在线状态
      setSelectedContact((prev) => prev ? { ...prev, online: true } : null)
    }

    // 更新联系人列表：最后消息 + 设置发送者为在线状态
    setContacts((prev) =>
      prev.map((contact) => {
        if (contact.id === senderId) {
          return {
            ...contact,
            online: true, // 收到消息说明对方在线
            last_message: msg.content,
            last_message_time: timestamp,
            unread_count: contact.id === selectedContact?.id ? 0 : contact.unread_count + 1,
          }
        }
        return contact
      })
    )
  }, [messages.length]) // 只依赖消息数量

  // 处理 WebSocket 消息
  const handleWsMessage = useCallback((message: WsMessage) => {
    switch (message.type) {
      case WsMessageType.TypeSingleMsg:
        // 后端发送的是 Reply 结构: { from_id, type, content, send_time }
        handleNewMessage(message as { from_id: number; type: number; content: string; send_time: number })
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

        const historyMessages: Message[] = (result.data || []).map((msg: { id: number; from_user_id: number; to_user_id: number; content: string; created_at: number }) => ({
          id: String(msg.id),
          sender_id: msg.from_user_id,
          receiver_id: msg.to_user_id,
          content: msg.content,
          timestamp: new Date(msg.created_at * 1000).toISOString(),
          status: "read" as const,
        }))

        // 用历史消息更新本地消息列表，保留临时消息并匹配更新
        setMessages((prevMessages) => {
          const msgMap = new Map<string, Message>()
          // 先添加历史消息
          for (const msg of historyMessages) {
            msgMap.set(msg.id, msg)
          }
          // 再检查是否有临时消息可以匹配并更新
          for (const prevMsg of prevMessages) {
            if (prevMsg.id.startsWith("temp-")) {
              // 查找是否有匹配的历史消息（相同时间戳、发送者、接收者、内容）
              const match = historyMessages.find(
                (hm) =>
                  Math.abs(new Date(hm.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) < 1000 &&
                  hm.sender_id === prevMsg.sender_id &&
                  hm.receiver_id === prevMsg.receiver_id &&
                  hm.content === prevMsg.content
              )
              if (match) {
                // 用真实消息替换临时消息
                msgMap.set(match.id, match)
              } else {
                // 没有匹配到，保留临时消息
                msgMap.set(prevMsg.id, prevMsg)
              }
            }
          }
          return Array.from(msgMap.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        })
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  // 选择联系人
  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact)
    fetchChatHistory(contact.id)

    // 清除未读
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unread_count: 0 } : c))
    )
  }

  // 发送消息
  const handleSendMessage = (content: string) => {
    if (!selectedContact || !wsClient || !currentUser) return

    const now = Date.now()
    const timestamp = new Date(now).toISOString()

    // 乐观更新 - 使用时间戳作为临时 ID 的基础
    const tempMessage: Message = {
      id: `temp-${now}`,
      sender_id: currentUser.id,
      receiver_id: selectedContact.id,
      content,
      timestamp,
      status: "sending",
    }
    setMessages((prev) => [...prev, tempMessage])

    // 发送 WebSocket 消息
    wsClient.sendSingleMsg({
      target_id: selectedContact.id,
      content,
    })

    // 更新本地消息状态为已发送
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === tempMessage.id ? { ...msg, status: "sent" } : msg
      )
    )

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
