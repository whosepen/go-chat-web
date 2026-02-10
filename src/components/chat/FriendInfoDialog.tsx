import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { blockUser, unblockUser, deleteFriend, getUserDetail, type UserDetail } from "@/lib/api"

interface FriendInfoDialogProps {
  isOpen: boolean
  onClose: () => void
  userId: number
  isDark: boolean
  onUserBlocked?: () => void
  onFriendDeleted?: () => void
}

export function FriendInfoDialog({
  isOpen,
  onClose,
  userId,
  isDark,
  onUserBlocked,
  onFriendDeleted,
}: FriendInfoDialogProps) {
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)

  // 打开时获取数据
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetail()
    }
  }, [isOpen, userId])

  // 获取用户详情
  const fetchUserDetail = async () => {
    setLoading(true)
    setUser(null)
    try {
      console.log("[FriendInfo] Fetching user detail for userId:", userId)
      const res = await getUserDetail(userId)
      console.log("[FriendInfo] User detail response:", res)
      if (res.code === 0 && res.data) {
        setUser(res.data)
      }
    } catch (error) {
      console.error("Failed to fetch user detail:", error)
    } finally {
      setLoading(false)
    }
  }

  // 拉黑/取消拉黑
  const handleBlock = async () => {
    try {
      if (isBlocked) {
        const res = await unblockUser(userId)
        if (res.code === 0) {
          setIsBlocked(false)
          onUserBlocked?.()
        }
      } else {
        const res = await blockUser(userId)
        if (res.code === 0) {
          setIsBlocked(true)
          onUserBlocked?.()
        }
      }
    } catch (error) {
      console.error("Failed to block/unblock user:", error)
    }
  }

  // 删除好友
  const handleDeleteFriend = async () => {
    if (!confirm("确定要删除该好友吗？")) return

    try {
      const res = await deleteFriend(userId)
      if (res.code === 0) {
        onFriendDeleted?.()
        onClose()
      }
    } catch (error) {
      console.error("Failed to delete friend:", error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div
        className={`relative w-full max-w-sm rounded-xl shadow-xl ${
          isDark ? "bg-[hsl(0,0%,12%)] border border-[hsl(0,0%,20%)]" : "bg-white border border-neutral-200"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className={`flex items-center justify-center px-4 py-3 border-b ${
          isDark ? "border-[hsl(0,0%,20%)]" : "border-neutral-100"
        }`}>
          <span className={`font-medium ${isDark ? "text-white" : "text-neutral-900"}`}>
            联系人信息
          </span>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {loading ? (
            <div className={`text-center py-8 ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              加载中...
            </div>
          ) : user ? (
            <>
              {/* 头像 */}
              <div className="flex flex-col items-center mb-6">
                <Avatar className="h-20 w-20 mb-3">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className={isDark ? "bg-neutral-700 text-white text-2xl" : "bg-neutral-200 text-neutral-900 text-2xl"}>
                    {(user.nickname || user.username).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className={`font-medium text-lg ${isDark ? "text-white" : "text-neutral-900"}`}>
                  {user.nickname || user.username}
                </h3>
                {user.nickname && (
                  <p className={`text-sm ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                    @{user.username}
                  </p>
                )}
              </div>

              {/* 用户信息 */}
              <div className={`space-y-3 mb-6 ${
                isDark ? "text-neutral-300" : "text-neutral-700"
              }`}>
                {user.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">邮箱:</span>
                    <span className="text-sm">{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">手机:</span>
                    <span className="text-sm">{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm">状态:</span>
                  <span className={`text-sm ${user.online ? "text-green-500" : (isDark ? "text-neutral-500" : "text-neutral-400")}`}>
                    {user.online ? "在线" : "离线"}
                  </span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="space-y-2">
                <button
                  onClick={handleDeleteFriend}
                  className="w-full py-2.5 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors font-medium text-sm"
                >
                  删除好友
                </button>
                <button
                  onClick={handleBlock}
                  className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    isBlocked
                      ? "border border-neutral-400 text-neutral-400 hover:bg-neutral-800"
                      : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400"
                  }`}
                >
                  {isBlocked ? "取消拉黑" : "加入黑名单"}
                </button>
              </div>
            </>
          ) : (
            <div className={`text-center py-8 ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              获取用户信息失败
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
