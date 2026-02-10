import { useMemo } from "react"
import type { Message } from "@/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface MessageBubbleProps {
  message: Message
  prevMessage?: Message
  isOwn: boolean
  isDark: boolean
  // 新增: 群聊上下文
  isGroupChat?: boolean
  senderName?: string // 群聊时显示的发送者名称
  senderAvatar?: string // 群聊时显示的发送者头像
}

// 判断两条消息是否"连续"（5分钟内）
function isConsecutive(prevMsg: Message | undefined, currMsg: Message, isGroup: boolean): boolean {
  if (!prevMsg || !currMsg) return false

  // 群聊需要检查发送者是否相同
  if (isGroup && prevMsg.sender_id !== currMsg.sender_id) {
    return false
  }

  const prevTime = new Date(prevMsg.timestamp).getTime()
  const currTime = new Date(currMsg.timestamp).getTime()
  return currTime - prevTime < 5 * 60 * 1000
}

// 获取头像背景色
function getAvatarColor(isDark: boolean): string {
  return isDark ? "bg-neutral-700" : "bg-neutral-200"
}

export function MessageBubble({
  message,
  prevMessage,
  isOwn,
  isDark,
  isGroupChat = false,
  senderName,
  senderAvatar,
}: MessageBubbleProps) {
  const isContinuous = useMemo(
    () => isConsecutive(prevMessage, message, isGroupChat),
    [prevMessage, message, isGroupChat]
  )

  // 格式化发送者名称
  const displaySenderName = senderName || `用户${message.sender_id}`

  return (
    <div className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}>
      {/* 左侧消息 - 他人发送 */}
      {!isOwn && (
        <div className="flex items-start w-full justify-start max-w-[70%]">
          {/* 群聊: 头像 */}
          {isGroupChat && (
            <div className="flex-shrink-0 mr-2">
              <Avatar className="h-8 w-8">
                {senderAvatar ? (
                  <img src={senderAvatar} alt={displaySenderName} className="h-8 w-8 object-cover" />
                ) : (
                  <AvatarFallback className={`${getAvatarColor(isDark)} text-neutral-900 text-xs`}>
                    {displaySenderName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
          )}

          {/* 消息内容区域 */}
          <div className="flex flex-col items-start flex-1">
            {/* 群聊: 显示发送者昵称 */}
            {isGroupChat && !isContinuous && (
              <span
                className={`text-xs mb-1 ${isDark ? "text-neutral-400" : "text-neutral-500"}`}
                style={{ marginLeft: 0 }}
              >
                {displaySenderName}
              </span>
            )}

            {/* 气泡 + 时间在同一行 */}
            <div className="flex items-end gap-2">
              {/* 气泡 */}
              <div
                className={`px-4 py-2 rounded-2xl max-w-[240px] ${
                  isDark
                    ? "bg-neutral-800 text-white"
                    : "bg-neutral-100 text-neutral-900"
                } ${
                  !isContinuous
                    ? "rounded-tl-md"
                    : ""
                }`}
                style={{ overflowWrap: "break-word", wordBreak: "break-all" }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>

              {/* 时间 */}
              <span
                className={`text-xs pb-0.5 shrink-0 ${
                  isDark ? "text-neutral-500" : "text-neutral-400"
                }`}
              >
                {formatMessageTime(message.timestamp)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 右侧消息 - 自己发送 */}
      {isOwn && (
        <div className="flex flex-row items-end w-full justify-end max-w-[70%]">
          {/* 时间 + 状态图标 */}
          <span
            className={`text-xs mr-2 self-end shrink-0 ${
              isDark ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            {formatMessageTime(message.timestamp)} {getStatusIcon(message.status)}
          </span>

          {/* 气泡 */}
          <div
            className={`px-4 py-2 rounded-2xl ${
              isDark
                ? "bg-white text-black"
                : "bg-neutral-900 text-white"
            } ${!isContinuous ? "rounded-tr-md" : ""}`}
            style={{ overflowWrap: "break-word", wordBreak: "break-all" }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// 格式化消息时间
function formatMessageTime(timestamp: string): string {
  // 处理空值或无效值
  if (!timestamp || timestamp === "0" || timestamp === "NaN") {
    return ""
  }

  // timestamp 可能是 ISO 字符串或毫秒级时间戳
  const date = new Date(timestamp)
  const now = new Date()

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return ""
  }

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  const isThisYear = date.getFullYear() === now.getFullYear()

  const timeStr = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  if (isToday) {
    return timeStr
  }

  if (isThisYear) {
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${month}/${day} ${timeStr}`
  }

  const year = String(date.getFullYear()).slice(2)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}/${month}/${day} ${timeStr}`
}

// 获取状态图标
function getStatusIcon(status: Message["status"]): string {
  switch (status) {
    case "sending":
      return "○"
    case "sent":
      return "●"
    case "delivered":
      return "●●"
    case "read":
      return "✓✓"
    case "failed":
      return "⚠"
    default:
      return ""
  }
}
