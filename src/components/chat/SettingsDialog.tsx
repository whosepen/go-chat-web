import { useState, useEffect } from "react"
import { X, Sun, Moon, LogOut, User, Save, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getUserProfile, updateUserProfile, uploadAvatar, type UserProfile } from "@/lib/api"
import { ImageCropper } from "./ImageCropper"

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  onToggleTheme: () => void
  onLogout: () => void
  onUserInfoChange?: (user: Partial<UserProfile>) => void
}

export function SettingsDialog({
  isOpen,
  onClose,
  isDark,
  onToggleTheme,
  onLogout,
  onUserInfoChange,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "settings">("settings")
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // 表单状态
  const [nickname, setNickname] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")

  // 裁剪器状态
  const [showCropper, setShowCropper] = useState(false)

  // 加载用户信息
  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [isOpen])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const result = await getUserProfile()
      if (result.code === 0 && result.data) {
        setProfile(result.data)
        setNickname(result.data.nickname || "")
        setAvatarUrl(result.data.avatar || "")
        setEmail(result.data.email || "")
      }
    } catch (error) {
      console.error("Failed to load profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarCropComplete = async (file: File) => {
    try {
      setUploadingAvatar(true)
      const result = await uploadAvatar(file)
      if (result.code === 0 && result.data) {
        setAvatarUrl(result.data.avatar)
        onUserInfoChange?.({ avatar: result.data.avatar })
        loadProfile()
      } else {
        alert(result.msg || "上传失败")
      }
    } catch (error) {
      console.error("Failed to upload avatar:", error)
      alert("上传失败")
    } finally {
      setUploadingAvatar(false)
      setShowCropper(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      const result = await updateUserProfile({
        nickname: nickname || undefined,
        email: email || undefined,
      })
      if (result.code === 0) {
        // 更新父组件状态
        onUserInfoChange?.({ nickname, email })
        alert("保存成功")
      } else {
        alert(result.msg || "保存失败")
      }
    } catch (error) {
      console.error("Failed to save profile:", error)
      alert("保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* 遮罩层 */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* 对话框 */}
        <div
          className={`relative w-full max-w-md rounded-xl shadow-xl overflow-hidden ${
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
            <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>
              设置
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={`ml-auto ${isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}`}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Tabs */}
          <div className={`flex border-b ${isDark ? "border-neutral-800" : "border-neutral-200"}`}>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "settings"
                  ? isDark ? "text-white border-b-2 border-white" : "text-neutral-900 border-b-2 border-neutral-900"
                  : isDark ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              通用
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "profile"
                  ? isDark ? "text-white border-b-2 border-white" : "text-neutral-900 border-b-2 border-neutral-900"
                  : isDark ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <User className="h-4 w-4" />
              个人信息
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {activeTab === "settings" && (
              <div className="space-y-2">
                {/* 主题切换 */}
                <button
                  onClick={onToggleTheme}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isDark
                      ? "hover:bg-neutral-800 text-neutral-200"
                      : "hover:bg-neutral-100 text-neutral-900"
                  }`}
                >
                  {isDark ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                  <span className="flex-1 text-left">{isDark ? "浅色模式" : "深色模式"}</span>
                </button>

                {/* 退出登录 */}
                <button
                  onClick={onLogout}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isDark
                      ? "hover:bg-neutral-800 text-red-400"
                      : "hover:bg-neutral-100 text-red-600"
                  }`}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="flex-1 text-left">退出登录</span>
                </button>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-neutral-500">加载中...</div>
                ) : (
                  <>
                    {/* 头像 */}
                    <div className="flex flex-col items-center">
                      <div className="relative group">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="头像"
                            className="w-24 h-24 rounded-full object-cover border-4 border-neutral-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none"
                            }}
                          />
                        ) : (
                          <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 border-neutral-700 ${
                            isDark ? "bg-neutral-800" : "bg-neutral-200"
                          }`}>
                            <User className={`h-12 w-12 ${isDark ? "text-neutral-500" : "text-neutral-400"}`} />
                          </div>
                        )}
                        {/* 遮罩层 */}
                        <div
                          onClick={() => setShowCropper(true)}
                          className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Camera className="h-8 w-8 text-white" />
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCropper(true)}
                        className={`mt-2 text-sm ${isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-700"}`}
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? "上传中..." : "更换头像"}
                      </button>
                    </div>

                    {/* 用户名（只读） */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                        用户名
                      </label>
                      <Input
                        value={profile?.username || ""}
                        disabled
                        className={isDark ? "bg-neutral-800 border-neutral-700 text-neutral-400" : "bg-neutral-100 border-neutral-200"}
                      />
                      <p className={`text-xs mt-1 ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                        用户名不可修改
                      </p>
                    </div>

                    {/* 昵称 */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                        昵称
                      </label>
                      <Input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="请输入昵称"
                        className={isDark ? "bg-neutral-800 border-neutral-700 text-white" : "bg-white border-neutral-300"}
                      />
                    </div>

                    {/* 邮箱 */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                        邮箱
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="请输入邮箱"
                        className={isDark ? "bg-neutral-800 border-neutral-700 text-white" : "bg-white border-neutral-300"}
                      />
                    </div>

                    {/* 保存按钮 */}
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className={`w-full mt-4 ${isDark ? "bg-white text-black hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "保存中..." : "保存修改"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 图片裁剪器 */}
      <ImageCropper
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        onCropComplete={handleAvatarCropComplete}
        isDark={isDark}
      />
    </>
  )
}
