import { useState } from "react"
import { Search, UserPlus, X, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { searchUser, sendFriendRequest, type SearchedUser } from "@/lib/api"

interface AddFriendDialogProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
}

export function AddFriendDialog({ isOpen, onClose, isDark }: AddFriendDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null)
  const [remark, setRemark] = useState("")
  const [searching, setSearching] = useState(false)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [sentIds, setSentIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState("")

  if (!isOpen) return null

  // 搜索用户
  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setSearching(true)
    setError("")
    setSearchedUser(null)
    setRemark("")

    try {
      const result = await searchUser(searchTerm.trim())
      if (result.code === 0 && result.data) {
        setSearchedUser(result.data)
      } else {
        setError(result.msg || "未找到用户")
      }
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setSearching(false)
    }
  }

  // 发送好友申请
  const handleSendRequest = async (user: SearchedUser) => {
    if (user.is_friend || sentIds.has(user.id)) return

    setSendingId(user.id)
    try {
      const result = await sendFriendRequest(user.id, remark || undefined)
      if (result.code === 0) {
        setSentIds((prev) => new Set(prev).add(user.id))
      } else {
        setError(result.msg || "发送失败")
      }
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setSendingId(null)
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div
        className={`relative w-full max-w-md rounded-xl shadow-xl ${
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
            添加好友
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
        <div className="p-4">
          {/* 搜索框 */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
                isDark ? "text-neutral-500" : "text-neutral-400"
              }`} />
              <Input
                placeholder="输入用户名搜索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`pl-9 ${
                  isDark
                    ? "bg-[hsl(0,0%,14.9%)] border-[hsl(0,0%,20%)] text-neutral-200 placeholder:text-neutral-500"
                    : "bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400"
                }`}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searching || !searchTerm.trim()}
              className={isDark
                ? "bg-white text-black hover:bg-neutral-200"
                : "bg-neutral-900 text-white hover:bg-neutral-800"
              }
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "搜索"}
            </Button>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className={`p-3 mb-4 rounded-lg text-sm ${
              isDark
                ? "bg-red-900/20 text-red-400"
                : "bg-red-50 text-red-600"
            }`}>
              {error}
            </div>
          )}

          {/* 搜索结果 */}
          {searchedUser && (
            <div className="space-y-2">
              <div
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  isDark ? "hover:bg-neutral-800" : "hover:bg-neutral-50"
                }`}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={searchedUser.avatar} />
                  <AvatarFallback className={isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"}>
                    {(searchedUser.nickname || searchedUser.username).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isDark ? "text-white" : "text-neutral-900"}`}>
                    {searchedUser.nickname || searchedUser.username}
                  </p>
                  <p className={`text-sm truncate ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                    @{searchedUser.username}
                  </p>
                  {searchedUser.bio && (
                    <p className={`text-xs truncate mt-1 ${isDark ? "text-neutral-400" : "text-neutral-400"}`}>
                      {searchedUser.bio}
                    </p>
                  )}
                  {/* 备注输入框 */}
                  {!searchedUser.is_friend && !sentIds.has(searchedUser.id) && (
                    <input
                      type="text"
                      placeholder="添加备注（可选）"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className={`mt-2 w-full px-3 py-1.5 text-sm rounded border outline-none ${
                        isDark
                          ? "bg-[hsl(0,0%,14.9%)] border-[hsl(0,0%,20%)] text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-500"
                          : "bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500"
                      }`}
                    />
                  )}
                </div>
                {searchedUser.is_friend ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className={isDark
                      ? "border-neutral-700 text-neutral-500"
                      : "border-neutral-300 text-neutral-500"
                    }
                  >
                    <Check className="h-4 w-4 mr-1" />
                    已是好友
                  </Button>
                ) : sentIds.has(searchedUser.id) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className={isDark
                      ? "border-green-700 text-green-400"
                      : "border-green-300 text-green-600"
                    }
                  >
                    <Check className="h-4 w-4 mr-1" />
                    已发送
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleSendRequest(searchedUser)}
                    disabled={sendingId === searchedUser.id}
                    className={isDark
                      ? "bg-white text-black hover:bg-neutral-200"
                      : "bg-neutral-900 text-white hover:bg-neutral-800"
                    }
                  >
                    {sendingId === searchedUser.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {searchTerm && !searchedUser && !searching && !error && (
            <div className={`text-center py-8 ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              <p>未找到用户</p>
            </div>
          )}

          {/* 初始状态 */}
          {!searchTerm && (
            <div className={`text-center py-8 ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>输入用户名搜索好友</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
