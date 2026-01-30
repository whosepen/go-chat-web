import { useEffect, useRef } from "react"
import type { Message, Contact } from "@/types"
import { MessageBubble } from "./MessageBubble"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Circle } from "lucide-react"

interface ChatWindowProps {
  contact: Contact | null
  messages: Message[]
  currentUserId: number
  isDark: boolean
  loading: boolean
}

export function ChatWindow({
  contact,
  messages,
  currentUserId,
  isDark,
  loading,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          })
        }
      })
    }
  }, [messages])

  // 空状态
  if (!contact) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isDark ? "bg-[hsl(0,0%,8%)]" : "bg-neutral-50"}`}>
        <div className="text-center">
          <h3 className={`text-lg font-medium mb-1 ${isDark ? "text-white" : "text-neutral-900"}`}>
            选择一个联系人
          </h3>
          <p className={`text-sm ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
            从左侧列表选择一个联系人开始聊天
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Chat Header */}
      <div className={`flex items-center gap-3 px-6 py-3 border-b border-[hsl(0,0%,20%)] ${
        isDark ? "bg-[hsl(0,0%,8%)]" : "bg-white"
      }`}>
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contact.avatar} />
            <AvatarFallback className={isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"}>
              {(contact.nickname || contact.username).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Circle
            className={`absolute bottom-0 right-0 h-3 w-3 ${
              contact.online
                ? "fill-green-500 text-green-500"
                : "fill-neutral-400 text-neutral-400"
            }`}
          />
        </div>
        <div>
          <h3 className={`font-medium ${isDark ? "text-white" : "text-neutral-900"}`}>
            {contact.nickname || contact.username}
          </h3>
          <p className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
            {contact.online ? "在线" : "离线"}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto p-4 ${isDark ? "bg-[hsl(0,0%,8%)]" : "bg-neutral-50"}`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-sm ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              加载中...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className={`text-sm ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                暂无消息，开始聊天吧
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full max-w-full space-y-2">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                prevMessage={index > 0 ? messages[index - 1] : undefined}
                isOwn={message.sender_id === currentUserId}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
