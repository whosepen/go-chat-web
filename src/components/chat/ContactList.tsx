import { useState } from "react"
import { Search, Circle, UserPlus, Bell, Settings, ArrowUpDown, SortAsc } from "lucide-react"
import type { Contact } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

type SortBy = "recent" | "alpha"

interface ContactListProps {
  contacts: Contact[]
  selectedId: number | null
  onSelect: (contact: Contact) => void
  onOpenAddFriend: () => void
  onOpenSettings: () => void
  onOpenFriendRequests: () => void
  currentUsername: string
  isDark: boolean
  pendingRequestsCount?: number
  sortBy: SortBy
  onToggleSort: () => void
}

export function ContactList({
  contacts,
  selectedId,
  onSelect,
  onOpenAddFriend,
  onOpenSettings,
  onOpenFriendRequests,
  currentUsername,
  isDark,
  pendingRequestsCount = 0,
  sortBy,
  onToggleSort,
}: ContactListProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // 排序逻辑
  const sortedContacts = [...contacts].sort((a, b) => {
    if (sortBy === "alpha") {
      // 首字母排序
      const nameA = (a.nickname || a.username).toLowerCase()
      const nameB = (b.nickname || b.username).toLowerCase()
      return nameA.localeCompare(nameB)
    } else {
      // 最近更新排序（时间戳大的在前面）
      const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0
      const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0
      return timeB - timeA
    }
  })

  const filteredContacts = sortedContacts.filter((contact) =>
    contact.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full border-r border-[hsl(0,0%,20%)]" style={{ backgroundColor: isDark ? "hsl(0,0%,8%)" : "white" }}>
      {/* Header */}
      <div className="p-4 border-b border-[hsl(0,0%,20%)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={undefined} />
              <AvatarFallback className={isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"}>
                {currentUsername.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className={`font-medium text-sm ${isDark ? "text-white" : "text-neutral-900"}`}>
                {currentUsername}
              </p>
              <p className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                在线
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenAddFriend}
              className={isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}
              title="添加好友"
            >
              <UserPlus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenFriendRequests}
              className={isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}
              title="好友申请"
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                {pendingRequestsCount > 0 && (
                  <span className={`absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[10px] flex items-center justify-center ${
                    isDark ? "bg-white text-black" : "bg-neutral-900 text-white"
                  }`}>
                    {pendingRequestsCount > 99 ? "99+" : pendingRequestsCount}
                  </span>
                )}
              </div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              className={isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}
              title="设置"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-neutral-500" : "text-neutral-400"}`} />
            <Input
              placeholder="搜索联系人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-9 ${
                isDark
                  ? "bg-[hsl(0,0%,14.9%)] border-[hsl(0,0%,20%)] text-neutral-200 placeholder:text-neutral-500"
                  : "bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400"
              }`}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSort}
            className={`shrink-0 ${isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}`}
            title={sortBy === "recent" ? "切换到首字母排序" : "切换到最近排序"}
          >
            {sortBy === "recent" ? (
              <ArrowUpDown className="h-4 w-4" />
            ) : (
              <SortAsc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredContacts.length === 0 ? (
            <div className={`text-center py-8 text-sm ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              {searchTerm ? "未找到匹配的联系人" : "暂无联系人"}
            </div>
          ) : (
            filteredContacts.map((contact, index) => (
              <div key={contact.id}>
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedId === contact.id
                      ? isDark ? "bg-neutral-800" : "bg-neutral-100"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                  onClick={() => onSelect(contact)}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback className={isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"}>
                        {(contact.nickname || contact.username).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={`absolute bottom-0 right-0 h-3 w-3 ${
                        contact.online
                          ? "fill-green-500 text-green-500"
                          : "fill-neutral-400 text-neutral-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between min-w-0">
                      <p className={`font-medium truncate min-w-0 ${isDark ? "text-white" : "text-neutral-900"}`}>
                        {contact.nickname || contact.username}
                      </p>
                      {contact.last_message_time && (
                        <span className={`text-xs flex-shrink-0 ml-2 ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                          {formatTime(contact.last_message_time)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1 min-w-0">
                      <p className={`text-sm truncate min-w-0 ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                        {contact.last_message || "暂无消息"}
                      </p>
                      {contact.unread_count > 0 && (
                        <span className={`h-5 min-w-5 px-1.5 rounded-full text-xs flex items-center justify-center ${
                          isDark ? "bg-white text-black" : "bg-neutral-900 text-white"
                        }`}>
                          {contact.unread_count > 99 ? "99+" : contact.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {index < filteredContacts.length - 1 && (
                  <Separator className={isDark ? "bg-neutral-800" : "bg-neutral-100"} />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// 格式化时间
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 今天
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  }

  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return "昨天"
  }

  // 一周内
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    return weekDays[date.getDay()]
  }

  // 更早
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
}
