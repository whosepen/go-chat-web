import { useState, useEffect } from "react"
import { Search, Users, X, Check, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { searchGroupByCode, sendGroupRequest } from "@/lib/api"
import type { GroupInfo } from "@/types"

interface JoinGroupDialogProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  onJoinSuccess: () => void
}

export function JoinGroupDialog({ isOpen, onClose, isDark, onJoinSuccess }: JoinGroupDialogProps) {
  const [searchCode, setSearchCode] = useState("")
  const [searchResult, setSearchResult] = useState<GroupInfo | null>(null)
  const [searching, setSearching] = useState(false)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // 清空状态
  const clearState = () => {
    setSearchCode("")
    setSearchResult(null)
    setSearching(false)
    setSendingRequest(false)
    setError("")
    setSuccess("")
  }

  // 关闭时清空状态
  useEffect(() => {
    if (!isOpen) {
      clearState()
    }
  }, [isOpen])

  // 搜索群组
  const handleSearch = async () => {
    if (!searchCode.trim()) {
      setError("请输入群号")
      return
    }

    setError("")
    setSuccess("")
    setSearching(true)

    try {
      const result = await searchGroupByCode(searchCode.trim())
      if (result.code === 0 && result.data) {
        setSearchResult(result.data)
      } else {
        setSearchResult(null)
        setError("未找到该群组")
      }
    } catch {
      setError("网络错误，请重试")
    } finally {
      setSearching(false)
    }
  }

  // 发送入群申请
  const handleSendRequest = async () => {
    if (!searchResult) return

    setError("")
    setSendingRequest(true)

    try {
      const result = await sendGroupRequest({ group_id: searchResult.id })
      if (result.code === 0) {
        setSuccess("入群申请已发送")
        setSearchResult(null)
        setSearchCode("")
        // 延迟关闭并通知刷新
        setTimeout(() => {
          onJoinSuccess()
          onClose()
        }, 1500)
      } else {
        setError(result.msg || "发送失败")
      }
    } catch {
      setError("网络错误，请重试")
    } finally {
      setSendingRequest(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 对话框 */}
      <div
        className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl ${
          isDark ? "bg-neutral-900" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
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
              加入群组
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
        <div className="p-6 space-y-4">
          {/* 搜索框 */}
          <div className="space-y-2">
            <label
              className={`text-sm font-medium ${
                isDark ? "text-neutral-200" : "text-neutral-700"
              }`}
            >
              输入群号
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="请输入6位群号"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                maxLength={20}
                className={`flex-1 ${
                  isDark
                    ? "bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                    : "bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400"
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch()
                  }
                }}
              />
              <Button
                onClick={handleSearch}
                disabled={searching || !searchCode.trim()}
                className={
                  isDark
                    ? "bg-neutral-800 hover:bg-neutral-700 text-white"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-900"
                }
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 错误/成功提示 */}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && (
            <p className="text-sm text-green-500 flex items-center gap-2">
              <Check className="h-4 w-4" />
              {success}
            </p>
          )}

          {/* 搜索结果 */}
          {searchResult && (
            <div
              className={`p-4 rounded-lg border ${
                isDark
                  ? "bg-neutral-800 border-neutral-700"
                  : "bg-neutral-50 border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={searchResult.icon} />
                  <AvatarFallback
                    className={
                      isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"
                    }
                  >
                    {searchResult.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium truncate ${
                      isDark ? "text-white" : "text-neutral-900"
                    }`}
                  >
                    {searchResult.name}
                    <span className="ml-2 text-xs text-blue-500">
                      [{searchResult.code}]
                    </span>
                  </p>
                  <p
                    className={`text-sm truncate ${
                      isDark ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    {searchResult.desc || "暂无介绍"}
                  </p>
                  <p
                    className={`text-xs ${
                      isDark ? "text-neutral-500" : "text-neutral-400"
                    }`}
                  >
                    {searchResult.member_count} 位成员
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSendRequest}
                disabled={sendingRequest}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {sendingRequest ? (
                  "发送申请中..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    申请加入
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 提示信息 */}
          {!searchResult && !error && (
            <p
              className={`text-sm text-center ${
                isDark ? "text-neutral-500" : "text-neutral-400"
              }`}
            >
              输入群号搜索群组，申请后等待群主或管理员通过
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
