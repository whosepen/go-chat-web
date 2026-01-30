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
  prevMessage,
  isOwn,
  isDark,
}: MessageBubbleProps) {
  const showTime = !prevMessage || !isConsecutive(prevMessage, message)
  const isFirstOfGroup = !prevMessage || !isConsecutive(prevMessage, message)

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
            } ${!isFirstOfGroup ? "mt-1" : ""}`}
            style={{ overflowWrap: "break-word", wordBreak: "break-all" }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          {/* 时间在气泡右下角外面 */}
          {showTime && (
            <span className={`text-xs ml-2 self-end shrink-0 ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
              {formatMessageTime(message.timestamp)}
            </span>
          )}
        </div>
      )}

      {/* 右侧消息 */}
      {isOwn && (
        <div className="flex flex-row items-end w-full justify-end">
          {/* 时间在气泡左下角外面 */}
          {showTime && (
            <span className={`text-xs mr-2 self-end shrink-0 ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
              {formatMessageTime(message.timestamp)} {getStatusIcon(message.status)}
            </span>
          )}
          <div
            className={`px-4 py-2 rounded-2xl text-left ${
              isDark
                ? "bg-white text-black rounded-tr-md"
                : "bg-neutral-900 text-white rounded-tr-md"
            } ${!isFirstOfGroup ? "mt-1" : ""}`}
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
  const date = new Date(timestamp)
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
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
