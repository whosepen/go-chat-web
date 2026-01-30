import { useEffect, useState } from "react"
import { X, Check, Loader2, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getFriendRequests, handleFriendRequest, type FriendRequest } from "@/lib/api"

interface FriendRequestsDialogProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  onRequestCountChange?: (count: number) => void
}

export function FriendRequestsDialog({
  isOpen,
  onClose,
  isDark,
  onRequestCountChange,
}: FriendRequestsDialogProps) {
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  // 加载好友申请
  const loadRequests = async () => {
    setLoading(true)
    try {
      const result = await getFriendRequests("pending")
      if (result.code === 0) {
        const requests = result.data || []
        setPendingRequests(requests)
        onRequestCountChange?.(requests.length)
      }
    } catch (error) {
      console.error("Failed to load friend requests:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadRequests()
    }
  }, [isOpen])

  // 处理好友申请
  const handleRequest = async (requestId: number, action: "accept" | "reject") => {
    setProcessingId(requestId)
    try {
      const result = await handleFriendRequest(requestId, action)
      if (result.code === 0) {
        // 从列表中移除
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId))
        onRequestCountChange?.(pendingRequests.length - 1)
      }
    } catch (error) {
      console.error("Failed to handle friend request:", error)
    } finally {
      setProcessingId(null)
    }
  }

  // 格式化时间
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    } else if (days === 1) {
      return "昨天"
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* 对话框 */}
      <div
        className={`relative w-full max-w-md rounded-xl shadow-xl max-h-[80vh] flex flex-col ${
          isDark ? "bg-[hsl(0,0%,8%)]" : "bg-white"
        }`}
        style={{
          backgroundImage: isDark
            ? 'repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,0.02) 20px, rgba(255,255,255,0.02) 40px)'
            : 'repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(0,0,0,0.02) 20px, rgba(0,0,0,0.02) 40px)',
        }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? "border-neutral-800" : "border-neutral-200"
        }`}>
          <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>
            好友申请
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className={`h-8 w-8 animate-spin ${isDark ? "text-neutral-500" : "text-neutral-400"}`} />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无待处理的好友申请</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className={`flex items-center gap-3 p-4 rounded-xl ${
                    isDark ? "bg-[hsl(0,0%,12%)]" : "bg-neutral-50"
                  }`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.avatar} />
                    <AvatarFallback className={isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"}>
                      {request.sender_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isDark ? "text-white" : "text-neutral-900"}`}>
                      {request.sender_name}
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                      @{request.sender_name}
                    </p>
                    {request.remark && (
                      <p className={`text-sm mt-1 ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                        备注: {request.remark}
                      </p>
                    )}
                    <p className={`text-xs mt-1 ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                      {formatTime(request.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRequest(request.id, "reject")}
                      disabled={processingId === request.id}
                      className={isDark
                        ? "border-neutral-700 text-neutral-400 hover:text-red-400 hover:border-red-700"
                        : "border-neutral-300 text-neutral-500 hover:text-red-600 hover:border-red-300"
                      }
                    >
                      {processingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => handleRequest(request.id, "accept")}
                      disabled={processingId === request.id}
                      className={isDark
                        ? "bg-white text-black hover:bg-neutral-200"
                        : "bg-neutral-900 text-white hover:bg-neutral-800"
                      }
                    >
                      {processingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
