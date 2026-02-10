import { useState } from "react"
import { Search, Circle, UserPlus, Bell, ArrowUpDown, SortAsc, Users, Plus, ChevronDown, Moon, Sun, LogOut, User } from "lucide-react"
import type { Contact } from "@/types"
import { ChatType } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type SortBy = "recent" | "alpha"

interface ContactListProps {
  contacts: Contact[]
  selectedId: number | null
  onSelect: (contact: Contact) => void
  onOpenAddFriend: () => void
  onOpenSettings: () => void
  onOpenFriendRequests: () => void
  onOpenCreateGroup: () => void
  onOpenJoinGroup: () => void
  currentUsername: string
  currentEmail?: string
  currentAvatar?: string
  isDark: boolean
  pendingRequestsCount?: number
  sortBy: SortBy
  onToggleSort: () => void
  onToggleTheme: () => void
  onLogout: () => void
}

interface ContactListComponent extends React.FC<ContactListProps> {
  Skeleton: React.FC
}

export const ContactList: ContactListComponent = ({
  contacts,
  selectedId,
  onSelect,
  onOpenAddFriend,
  onOpenSettings,
  onOpenFriendRequests,
  onOpenCreateGroup,
  onOpenJoinGroup,
  currentUsername,
  currentEmail,
  currentAvatar,
  isDark,
  pendingRequestsCount = 0,
  sortBy,
  onToggleSort,
  onToggleTheme,
  onLogout,
}: ContactListProps) => {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const [searchTerm, setSearchTerm] = useState("")
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const sortedContacts = [...contacts].sort((a, b) => {
    if (sortBy === "alpha") {
      const nameA = (a.nickname || a.username).toLowerCase()
      const nameB = (b.nickname || b.username).toLowerCase()
      return nameA.localeCompare(nameB)
    } else {
      const timeA = a.last_message_timestamp || a.last_message_time ? new Date(a.last_message_time || a.last_message_timestamp || 0).getTime() : 0
      const timeB = b.last_message_timestamp || b.last_message_time ? new Date(b.last_message_time || b.last_message_timestamp || 0).getTime() : 0
      return timeB - timeA
    }
  })

  const filteredContacts = sortedContacts.filter((contact) =>
    (contact.nickname || contact.username).toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const menuItems = [
    { icon: Users, label: "创建群聊", onClick: onOpenCreateGroup },
    { icon: Plus, label: "加入群聊", onClick: onOpenJoinGroup },
    { icon: UserPlus, label: "添加好友", onClick: onOpenAddFriend },
    { icon: Bell, label: "申请提醒", onClick: onOpenFriendRequests, badge: pendingRequestsCount },
  ]

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    } else if (days === 1) {
      return "昨天"
    } else if (days < 7) {
      const weeks = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
      return weeks[date.getDay()]
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`
    }
  }

  const truncateMessage = (message: string | null | undefined, maxLength: number) => {
    if (!message) return null
    if (message.length <= maxLength) return message
    return message.slice(0, maxLength) + "..."
  }

  const formatGroupLastMessage = (message: string | null | undefined) => {
    if (!message) return "暂无消息"
    const parts = message.split(":")
    if (parts.length >= 2 && parts[0].length <= 6) {
      return parts.slice(1).join(":").slice(0, 10) || "暂无消息"
    }
    return truncateMessage(message, 12) || "暂无消息"
  }

  return (
    <>
      <Sidebar collapsible="icon" isDark={isDark} className={`border-r ${isDark ? "border-[hsl(0,0%,20%)]" : "border-[#e5e5e5]"}`}>
        <SidebarHeader className={`p-2 border-b ${isDark ? "border-[hsl(0,0%,20%)]" : "border-[#e5e5e5]"} ${isCollapsed ? "flex justify-center" : ""}`}>
          <div className={`flex items-center gap-1.5 ${isCollapsed ? "flex-col" : ""}`}>
            <SidebarTrigger className={`h-7 w-7 ${isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}`} />
            {!isCollapsed && (
              <>
                <div className="relative flex-1">
                  <Search className={`absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${isDark ? "text-neutral-500" : "text-neutral-400"}`} />
                  <Input
                    placeholder="搜索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                     className={`h-7 pl-8 text-xs ${
                       isDark
                         ? "bg-[hsl(0,0%,14.9%)] border-[hsl(0,0%,20%)] text-neutral-200 placeholder:text-neutral-500"
                         : "bg-white border-[#e5e5e5] text-neutral-900 placeholder:text-neutral-400"
                     }`}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleSort}
                  className={`h-7 w-7 shrink-0 ${isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}`}
                  title={sortBy === "recent" ? "首字母排序" : "最近排序"}
                >
                  {sortBy === "recent" ? (
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  ) : (
                    <SortAsc className="h-3.5 w-3.5" />
                  )}
                </Button>
              </>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="p-1.5">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      onClick={item.onClick}
                      tooltip={isCollapsed ? item.label : undefined}
                      className={`w-full px-2 py-1.5 ${
                        isDark
                          ? "hover:bg-neutral-800 text-neutral-300"
                          : "hover:bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="text-xs">{item.label}</span>}
                      {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className={`ml-auto h-4 min-w-4 px-1 rounded-full text-[10px] flex items-center justify-center ${
                          isDark ? "bg-white text-black" : "bg-neutral-900 text-white"
                        }`}>
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-1">
            {!isCollapsed && (
              <SidebarGroupLabel className="px-2 text-xs font-medium">
                联系人与群组
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredContacts.length === 0 ? (
                  !isCollapsed && (
                    <div className={`text-center py-4 text-xs ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                      {searchTerm ? "未找到匹配" : "暂无联系人和群组"}
                    </div>
                  )
                ) : (
                  filteredContacts.map((contact) => (
                    <SidebarMenuItem key={`${contact.chat_type}_${contact.id}`}>
                      <SidebarMenuButton
                        isActive={selectedId === contact.id}
                        onClick={() => onSelect(contact)}
                        tooltip={isCollapsed ? (contact.nickname || contact.username) : undefined}
                        className={`w-full ${isCollapsed ? "flex justify-center p-1.5" : "p-1.5"} ${
                          selectedId === contact.id
                            ? isDark ? "bg-neutral-800" : "bg-neutral-100"
                            : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <div className={`relative shrink-0 ${isCollapsed ? "" : ""}`}>
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={contact.avatar} />
                            <AvatarFallback className={isDark ? "bg-neutral-700 text-white text-xs" : "bg-neutral-200 text-neutral-900 text-xs"}>
                              {(contact.nickname || contact.username).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {contact.chat_type === ChatType.Single && (
                            <Circle
                              className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 ${
                                contact.online
                                  ? "fill-green-500 text-green-500"
                                  : "fill-neutral-400 text-neutral-400"
                              }`}
                            />
                          )}
                          {contact.chat_type === ChatType.Group && (
                            <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full flex items-center justify-center ${
                              isDark ? "bg-[hsl(0,0%,8%)]" : "bg-white"
                            }`}>
                              <Users className="h-2 w-2 text-blue-500" />
                            </div>
                          )}
                        </div>
                        {!isCollapsed && (
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-xs font-medium truncate ${isDark ? "text-white" : "text-neutral-900"}`}>
                                {contact.nickname || contact.username}
                              </p>
                              {contact.last_message_time && (
                                <span className={`text-[10px] shrink-0 ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                                  {formatTime(contact.last_message_time)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <p className={`text-[10px] truncate ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                                {contact.chat_type === ChatType.Group
                                  ? formatGroupLastMessage(contact.last_message)
                                  : (truncateMessage(contact.last_message, 12) || "暂无消息")}
                              </p>
                              {contact.unread_count > 0 && (
                                <span className={`h-3.5 min-w-3.5 px-1 rounded-full text-[10px] flex items-center justify-center shrink-0 ${
                                  isDark ? "bg-white text-black" : "bg-neutral-900 text-white"
                                }`}>
                                  {contact.unread_count > 99 ? "99+" : contact.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className={`p-1.5 border-t ${isDark ? "border-[hsl(0,0%,20%)]" : "border-[#e5e5e5]"} ${isCollapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={() => setShowProfileDialog(true)}
            className={`flex items-center gap-2 w-full p-1.5 rounded-md transition-colors ${
              isDark ? "hover:bg-neutral-800" : "hover:bg-neutral-100"
            } ${isCollapsed ? "justify-center" : ""}`}
          >
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={currentAvatar} />
              <AvatarFallback className={isDark ? "bg-neutral-700 text-white text-xs" : "bg-neutral-200 text-neutral-900 text-xs"}>
                {currentUsername.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-xs font-medium truncate ${isDark ? "text-white" : "text-neutral-900"}`}>
                    {currentUsername}
                  </p>
                  <p className={`text-[10px] truncate ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                    {currentEmail || "未设置邮箱"}
                  </p>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 ${isDark ? "text-neutral-400" : "text-neutral-500"}`} />
              </>
            )}
          </button>
        </SidebarFooter>
      </Sidebar>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent
          className={`sm:max-w-sm ${isDark ? "bg-[hsl(0,0%,8%)] border-[hsl(0,0%,20%)]" : "bg-white border-neutral-200"}`}
          side="right"
        >
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : "text-neutral-900"}>
              个人中心
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentAvatar} />
                <AvatarFallback className={isDark ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-900"}>
                  {currentUsername.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-neutral-900"}`}>
                  {currentUsername}
                </p>
                <p className={`text-xs truncate ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                  {currentEmail || "未设置邮箱"}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowProfileDialog(false)
                onOpenSettings()
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-neutral-800 text-neutral-200" : "hover:bg-neutral-100 text-neutral-700"
              }`}
            >
              <User className="h-4 w-4" />
              <span className="text-sm flex-1 text-left">修改个人信息</span>
            </button>

            <button
              onClick={onToggleTheme}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-neutral-800 text-neutral-200" : "hover:bg-neutral-100 text-neutral-700"
              }`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="text-sm flex-1 text-left">{isDark ? "浅色模式" : "深色模式"}</span>
            </button>

            <button
              onClick={() => {
                setShowProfileDialog(false)
                setShowLogoutDialog(true)
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-neutral-800 text-red-400" : "hover:bg-neutral-100 text-red-600"
              }`}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm flex-1 text-left">退出登录</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className={isDark ? "bg-[hsl(0,0%,8%)] border-[hsl(0,0%,20%)]" : "bg-white border-neutral-200"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDark ? "text-white" : "text-neutral-900"}>
              确认退出
            </AlertDialogTitle>
            <AlertDialogDescription className={isDark ? "text-neutral-400" : "text-neutral-500"}>
              确定要退出登录吗？退出后您将需要重新登录才能使用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDark ? "bg-neutral-800 text-white hover:bg-neutral-700" : "bg-neutral-100 text-neutral-900 hover:bg-neutral-200"}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLogoutDialog(false)
                onLogout()
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

ContactList.Skeleton = function Skeleton() {
  return (
    <div className="flex items-center gap-2 p-2">
      <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      <div className="flex-1 space-y-1">
        <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="h-2 w-32 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      </div>
    </div>
  )
}
