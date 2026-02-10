import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft } from "lucide-react"
import type { GroupMember } from "@/types"

interface GroupMembersDialogProps {
  isOpen: boolean
  onClose: () => void
  groupName: string
  members: GroupMember[] | undefined
  isDark: boolean
}

export function GroupMembersDialog({
  isOpen,
  onClose,
  groupName,
  members,
  isDark,
}: GroupMembersDialogProps) {
  if (!isOpen) return null

  const memberList = members || []

  // 按首字母排序
  const sortedMembers = [...memberList].sort((a, b) =>
    a.nickname.localeCompare(b.nickname)
  )

  // 每行4个成员
  const rows = []
  for (let i = 0; i < sortedMembers.length; i += 4) {
    rows.push(sortedMembers.slice(i, i + 4))
  }

  // 昵称截断
  const truncateNickname = (name: string, maxLength: number = 6) => {
    return name.length > maxLength ? name.slice(0, maxLength) + "..." : name
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div
        className={`relative w-full max-w-md h-[70vh] rounded-xl shadow-xl overflow-hidden ${
          isDark ? "bg-[hsl(0,0%,12%)] border border-[hsl(0,0%,20%)]" : "bg-white border border-neutral-200"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${
          isDark ? "border-[hsl(0,0%,20%)]" : "border-neutral-100"
        }`}>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? "hover:bg-neutral-800" : "hover:bg-neutral-100"
            }`}
          >
            <ArrowLeft className={`h-5 w-5 ${isDark ? "text-neutral-400" : "text-neutral-600"}`} />
          </button>
          <div className="flex-1">
            <h3 className={`font-medium ${isDark ? "text-white" : "text-neutral-900"}`}>
              {groupName}
            </h3>
            <p className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              {memberList.length} 位成员
            </p>
          </div>
        </div>

        {/* 成员列表 */}
        <div className={`flex-1 overflow-y-auto p-4 ${isDark ? "bg-[hsl(0,0%,8%)]" : "bg-neutral-50"}`}>
          {memberList.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              暂无成员
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-3">
                  {row.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex flex-col items-center"
                      style={{ width: "60px" }}
                    >
                      <Avatar className="h-12 w-12 mb-1">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className={isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"}>
                          {(member.nickname || "成员").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`text-xs text-center truncate w-full ${
                        isDark ? "text-neutral-400" : "text-neutral-600"
                      }`}>
                        {truncateNickname(member.nickname)}
                      </span>
                    </div>
                  ))}
                  {/* 填充空位 */}
                  {Array(4 - row.length)
                    .fill(0)
                    .map((_, i) => (
                      <div key={`empty-${i}`} className="flex flex-col items-center" style={{ width: "60px" }}>
                        <div className={`h-12 w-12 rounded-full ${
                          isDark ? "bg-neutral-800" : "bg-neutral-200"
                        }`} />
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
