import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Contact, GroupMember } from "@/types"

interface GroupInfoDialogProps {
  isOpen: boolean
  onClose: () => void
  contact: Contact | null
  groupMembers: GroupMember[] | undefined
  isDark: boolean
  onViewMembers?: () => void
}

export function GroupInfoDialog({
  isOpen,
  onClose,
  contact,
  groupMembers,
  isDark,
  onViewMembers,
}: GroupInfoDialogProps) {
  if (!isOpen || !contact) return null

  const members = groupMembers || []
  const memberCount = contact.group_info?.member_count || 0

  // 获取群主（role=1）
  const owner = members.find((m) => m.role === 1)
  // 按昵称排序获取前2名非群主成员
  const otherMembers = members
    .filter((m) => m.role !== 1)
    .sort((a, b) => a.nickname.localeCompare(b.nickname))
    .slice(0, 2)

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(0,0%,20%)]">
          <span className={`font-medium ${isDark ? "text-white" : "text-neutral-900"}`}>
            群聊信息
          </span>
          <button
            onClick={onClose}
            className={`text-sm ${isDark ? "text-neutral-500 hover:text-white" : "text-neutral-500 hover:text-neutral-700"}`}
          >
            关闭
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {/* 群头像和名称 */}
          <div className="flex flex-col items-center mb-6">
            <Avatar className="h-20 w-20 mb-3">
              <AvatarImage src={contact.avatar} />
              <AvatarFallback className={isDark ? "bg-neutral-700 text-white text-2xl" : "bg-neutral-200 text-neutral-900 text-2xl"}>
                {(contact.nickname || contact.username).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 className={`font-medium text-lg text-center ${isDark ? "text-white" : "text-neutral-900"}`}>
              {contact.nickname || contact.username}
            </h3>
            {contact.group_info?.code && (
              <p className={`text-sm ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                群号: {contact.group_info.code}
              </p>
            )}
          </div>

          {/* 成员缩略图 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                成员 ({memberCount})
              </span>
              {onViewMembers && (
                <button
                  onClick={onViewMembers}
                  className={`text-sm ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"}`}
                >
                  查看全部
                </button>
              )}
            </div>

            {/* 成员头像组: 群主 + 前2名 */}
            <div className="flex items-center gap-2 justify-center">
              {/* 群主 */}
              {owner && (
                <div className="flex flex-col items-center">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={owner.avatar} />
                    <AvatarFallback className={isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"}>
                      {(owner.nickname || "群").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              {/* 其他成员 */}
              {otherMembers.map((member) => (
                <div key={member.user_id} className="flex flex-col items-center">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className={isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"}>
                      {(member.nickname || "成员").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ))}
              {/* 如果成员太少，用占位符 */}
              {members.length <= 1 && (
                <>
                  <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      isDark ? "bg-neutral-800 text-neutral-600" : "bg-neutral-100 text-neutral-300"
                    }`}>
                      ?
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      isDark ? "bg-neutral-800 text-neutral-600" : "bg-neutral-100 text-neutral-300"
                    }`}>
                      ?
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 群信息 */}
          {contact.group_info?.desc && (
            <div className={`mb-4 p-3 rounded-lg ${
              isDark ? "bg-[hsl(0,0%,16%)]" : "bg-neutral-50"
            }`}>
              <p className={`text-sm ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                {contact.group_info.desc}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
