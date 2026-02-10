import { useEffect, useState } from "react"
import { X, Check, Loader2, Bell, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getFriendRequests, handleFriendRequest, getGroupRequests, handleGroupRequest, type FriendRequest } from "@/lib/api"
import type { GroupRequest } from "@/types"

interface CombinedRequestsDialogProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  onRequestCountChange?: (count: number) => void
}

export function CombinedRequestsDialog({
  isOpen,
  onClose,
  isDark,
  onRequestCountChange,
}: CombinedRequestsDialogProps) {
  const [activeTab, setActiveTab] = useState<"friend" | "group">("friend")
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [groupRequests, setGroupRequests] = useState<GroupRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  // 加载所有申请
  const loadRequests = async () => {
    setLoading(true)
    try {
      // 并行加载好友和群组申请
      const [friendResult, groupResult] = await Promise.all([
        getFriendRequests("pending"),
        getGroupRequests(),
      ])

      // 处理好友申请
      if (friendResult.code === 0) {
        setFriendRequests(friendResult.data || [])
      }

      // 处理群组申请 (status=0 为待处理)
      if (groupResult.code === 0) {
        const pendingGroupRequests = (groupResult.data || []).filter(
          (req: GroupRequest) => req.status === 0
        )
        setGroupRequests(pendingGroupRequests)
      }

      // 计算总未读数
      const totalCount = (friendResult.data?.length || 0) +
                        ((groupResult.data || []).filter((req: GroupRequest) => req.status === 0).length || 0)
      onRequestCountChange?.(totalCount)
    } catch (error) {
      console.error("Failed to load requests:", error)
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
  const handleFriendReq = async (requestId: number, action: "accept" | "reject") => {
    setProcessingId(requestId)
    try {
      const result = await handleFriendRequest(requestId, action)
      if (result.code === 0) {
        setFriendRequests((prev) => prev.filter((r) => r.id !== requestId))
        // 重新计算总数
        const newTotal = (friendRequests.length - 1) + groupRequests.length
        onRequestCountChange?.(newTotal)
      }
    } catch (error) {
      console.error("Failed to handle friend request:", error)
    } finally {
      setProcessingId(null)
    }
  }

  // 处理群组申请
  const handleGroupReq = async (requestId: number, action: "accept" | "reject") => {
    setProcessingId(requestId)
    try {
      const result = await handleGroupRequest(requestId, action)
      if (result.code === 0) {
        setGroupRequests((prev) => prev.filter((r) => r.id !== requestId))
        // 重新计算总数
        const newTotal = friendRequests.length + (groupRequests.length - 1)
        onRequestCountChange?.(newTotal)
      }
    } catch (error) {
      console.error("Failed to handle group request:", error)
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

  const currentRequests = activeTab === "friend" ? friendRequests : groupRequests
  const emptyMessage = activeTab === "friend" ? "暂无待处理的好友申请" : "暂无待处理的入群申请"

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
        <div className={`flex items-center px-4 py-3 border-b ${
          isDark ? "border-neutral-800" : "border-neutral-200"
        }`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex justify-center">
            <div className={`flex items-center gap-1 p-1 rounded-lg ${
              isDark ? "bg-[hsl(0,0%,16%)]" : "bg-neutral-100"
            }`}>
              <button
                onClick={() => setActiveTab("friend")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "friend"
                    ? isDark ? "bg-[hsl(0,0%,20%)] text-white" : "bg-white text-neutral-900 shadow"
                    : isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <span className="flex items-center gap-1">
                  <Bell className="h-3.5 w-3.5" />
                  好友
                  {friendRequests.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {friendRequests.length}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("group")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "group"
                    ? isDark ? "bg-[hsl(0,0%,20%)] text-white" : "bg-white text-neutral-900 shadow"
                    : isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  群聊
                  {groupRequests.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {groupRequests.length}
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className={`h-8 w-8 animate-spin ${isDark ? "text-neutral-500" : "text-neutral-400"}`} />
            </div>
          ) : currentRequests.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTab === "friend" && friendRequests.map((request) => (
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
                      onClick={() => handleFriendReq(request.id, "reject")}
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
                      onClick={() => handleFriendReq(request.id, "accept")}
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

              {activeTab === "group" && groupRequests.map((request) => (
                <div
                  key={request.id}
                  className={`flex items-center gap-3 p-4 rounded-xl ${
                    isDark ? "bg-[hsl(0,0%,12%)]" : "bg-neutral-50"
                  }`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className={isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"}>
                      <Users className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isDark ? "text-white" : "text-neutral-900"}`}>
                      {request.group_name}
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                      申请人: {request.sender_name}
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
                      onClick={() => handleGroupReq(request.id, "reject")}
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
                      onClick={() => handleGroupReq(request.id, "accept")}
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
