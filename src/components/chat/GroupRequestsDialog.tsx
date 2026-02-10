import { useState, useEffect } from "react"
import { Users, X, Check, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getGroupRequests, handleGroupRequest } from "@/lib/api"
import type { GroupRequest } from "@/types"

interface GroupRequestsDialogProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  onRequestCountChange: (count: number) => void
}

export function GroupRequestsDialog({
  isOpen,
  onClose,
  isDark,
  onRequestCountChange,
}: GroupRequestsDialogProps) {
  const [requests, setRequests] = useState<GroupRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)

  // 获取申请列表
  const fetchRequests = async () => {
    setLoading(true)
    try {
      const result = await getGroupRequests()
      if (result.code === 0 && Array.isArray(result.data)) {
        const pending = result.data.filter((req) => req.status === 0)
        setRequests(pending)
        onRequestCountChange(pending.length)
      }
    } catch (error) {
      console.error("Failed to fetch group requests:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen])

  // 处理申请
  const handleAction = async (requestId: number, action: "accept" | "reject") => {
    setProcessingId(requestId)
    try {
      const result = await handleGroupRequest(requestId, action)
      if (result.code === 0) {
        // 从列表中移除
        setRequests((prev) => prev.filter((req) => req.id !== requestId))
        // 更新计数
        const newCount = requests.length - 1
        onRequestCountChange(newCount)
      }
    } catch (error) {
      console.error("Failed to handle request:", error)
    } finally {
      setProcessingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 对话框 */}
      <div
        className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl max-h-[80vh] flex flex-col ${
          isDark ? "bg-neutral-900" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${
            isDark ? "border-neutral-800" : "border-neutral-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                isDark ? "bg-neutral-800" : "bg-neutral-100"
              }`}
            >
              <Users className={`h-5 w-5 ${isDark ? "text-white" : "text-neutral-900"}`} />
            </div>
            <h2
              className={`text-lg font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}
            >
              入群申请
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={
              isDark
                ? "text-neutral-400 hover:text-white"
                : "text-neutral-500 hover:text-neutral-900"
            }
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-4 ${isDark ? "bg-neutral-900" : "bg-white"}`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className={`text-sm ${
                  isDark ? "text-neutral-500" : "text-neutral-400"
                }`}
              >
                加载中...
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users
                className={`h-12 w-12 mb-3 ${
                  isDark ? "text-neutral-700" : "text-neutral-300"
                }`}
              />
              <p
                className={`text-sm ${
                  isDark ? "text-neutral-500" : "text-neutral-400"
                }`}
              >
                暂无待处理的入群申请
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`p-4 rounded-lg border ${
                    isDark
                      ? "bg-neutral-800 border-neutral-700"
                      : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.avatar} />
                      <AvatarFallback
                        className={
                          isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"
                        }
                      >
                        {request.sender_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-medium ${
                            isDark ? "text-white" : "text-neutral-900"
                          }`}
                        >
                          {request.sender_name}
                        </p>
                      </div>
                      <p
                        className={`text-sm truncate ${
                          isDark ? "text-neutral-400" : "text-neutral-500"
                        }`}
                      >
                        申请加入群「{request.group_name}」
                      </p>
                      {request.remark && (
                        <p
                          className={`text-sm mt-1 ${
                            isDark ? "text-neutral-500" : "text-neutral-400"
                          }`}
                        >
                          附言: {request.remark}
                        </p>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          isDark ? "text-neutral-600" : "text-neutral-400"
                        }`}
                      >
                        {request.created_at}
                      </p>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(request.id, "reject")}
                      disabled={processingId === request.id}
                      className={`flex-1 ${
                        isDark
                          ? "border-neutral-700 hover:bg-neutral-700 text-neutral-200"
                          : "border-neutral-300 hover:bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      拒绝
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAction(request.id, "accept")}
                      disabled={processingId === request.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processingId === request.id ? (
                        "处理中..."
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          同意
                        </>
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
