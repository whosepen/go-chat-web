import type { Message } from "@/types"

interface MessageBubbleProps {
  message: Message
  prevMessage?: Message
  isOwn: boolean
  isDark: boolean
}

// 判断两条消息是否"连续"（5分钟内）
function isConsecutive(prevMsg: Message, currMsg: Message): boolean {
  if (!prevMsg || !currMsg) return false
  const prevTime = new Date(prevMsg.timestamp).getTime()
  const currTime = new Date(currMsg.timestamp).getTime()
  return currTime - prevTime < 5 * 60 * 1000
}

export function MessageBubble({
  message,
  isOwn,
  isDark,
}: MessageBubbleProps) {
  return (
    <div className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}>
      {/* 左侧消息 */}
      {!isOwn && (
        <div className="flex flex-row items-end w-full">
          <div
            className={`px-4 py-2 rounded-2xl text-left ${
              isDark
                ? "bg-neutral-800 text-white rounded-tl-md"
                : "bg-neutral-100 text-neutral-900 rounded-tl-md"
            }`}
            style={{ overflowWrap: "break-word", wordBreak: "break-all" }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          {/* 时间在气泡右下角外面 */}
          <span className={`text-xs ml-2 self-end shrink-0 ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
            {formatMessageTime(message.timestamp)}
          </span>
        </div>
      )}

      {/* 右侧消息 */}
      {isOwn && (
        <div className="flex flex-row items-end w-full justify-end">
          {/* 时间在气泡左下角外面 */}
          <span className={`text-xs mr-2 self-end shrink-0 ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
            {formatMessageTime(message.timestamp)} {getStatusIcon(message.status)}
          </span>
          <div
            className={`px-4 py-2 rounded-2xl text-left ${
              isDark
                ? "bg-white text-black rounded-tr-md"
                : "bg-neutral-900 text-white rounded-tr-md"
            }`}
            style={{ overflowWrap: "break-word", wordBreak: "break-all" }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}</p>
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
