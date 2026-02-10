import { useEffect, useRef, useMemo } from "react"
import type { Message, Contact, GroupMember } from "@/types"
import { ChatType } from "@/types"
import { MessageBubble } from "./MessageBubble"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Circle, Users, MoreHorizontal } from "lucide-react"

interface ChatWindowProps {
  contact: Contact | null
  messages: Message[]
  currentUserId: number
  isDark: boolean
  loading: boolean
  // 新增: 群聊成员信息
  groupMembers?: Map<number, GroupMember>
  // 新增: 显示信息卡片的回调
  onShowInfo?: () => void
}

export function ChatWindow({
  contact,
  messages,
  currentUserId,
  isDark,
  loading,
  groupMembers,
  onShowInfo,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 判断是否为群聊
  const isGroupChat = contact?.chat_type === ChatType.Group

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

  // 获取发送者信息的 Map
  const senderInfoMap = useMemo(() => {
    const map = new Map<number, { nickname: string; avatar?: string }>()
    if (groupMembers) {
      groupMembers.forEach((member) => {
        map.set(member.user_id, {
          nickname: member.nickname,
          avatar: member.avatar,
        })
      })
    }
    return map
  }, [groupMembers])

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
          {/* 私聊显示在线状态 */}
          {!isGroupChat && (
            <Circle
              className={`absolute bottom-0 right-0 h-3 w-3 ${
                contact.online
                  ? "fill-green-500 text-green-500"
                  : "fill-neutral-400 text-neutral-400"
              }`}
            />
          )}
        </div>
        <div className="flex-1">
          <h3 className={`font-medium ${isDark ? "text-white" : "text-neutral-900"}`}>
            {contact.nickname || contact.username}
            {/* 群聊标识 */}
            {isGroupChat && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <Users className="w-3 h-3 mr-1" />
                群聊
              </span>
            )}
          </h3>
          <p className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
            {isGroupChat
              ? `${contact.group_info?.member_count || 0} 位成员`
              : (contact.online ? "在线" : "离线")}
          </p>
        </div>
        {/* 信息按钮 */}
        {onShowInfo && (
          <button
            onClick={onShowInfo}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? "hover:bg-neutral-800 text-neutral-400" : "hover:bg-neutral-100 text-neutral-500"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        )}
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
                {isGroupChat ? "暂无群消息" : "暂无消息，开始聊天吧"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full max-w-full space-y-2">
            {messages.map((message, index) => {
              // 获取发送者信息（群聊需要）
              const senderInfo = senderInfoMap.get(message.sender_id)
              const isOwn = message.sender_id === currentUserId

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  prevMessage={index > 0 ? messages[index - 1] : undefined}
                  isOwn={isOwn}
                  isDark={isDark}
                  isGroupChat={isGroupChat}
                  senderName={
                    isOwn
                      ? undefined // 自己发的消息不需要显示名字
                      : message.sender_name || senderInfo?.nickname || `用户${message.sender_id}`
                  }
                  senderAvatar={senderInfo?.avatar}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
