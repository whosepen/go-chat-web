import { useState } from "react"
import { Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createGroup } from "@/lib/api"

interface CreateGroupDialogProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  onSuccess: (groupId: number) => void
}

export function CreateGroupDialog({ isOpen, onClose, isDark, onSuccess }: CreateGroupDialogProps) {
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("请输入群名称")
      return
    }

    if (name.length < 1 || name.length > 50) {
      setError("群名称长度为1-50字符")
      return
    }

    setLoading(true)
    try {
      const result = await createGroup({ name: name.trim(), desc: desc.trim() })
      if (result.code === 0 && result.data) {
        onSuccess(result.data.id)
        onClose()
        setName("")
        setDesc("")
      } else {
        setError(result.msg || "创建失败")
      }
    } catch {
      setError("网络错误，请重试")
    } finally {
      setLoading(false)
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

      {/* 对话框 */}
      <div
        className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl ${
          isDark ? "bg-neutral-900" : "bg-white"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? "border-neutral-800" : "border-neutral-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isDark ? "bg-neutral-800" : "bg-neutral-100"
            }`}>
              <Users className={`h-5 w-5 ${isDark ? "text-white" : "text-neutral-900"}`} />
            </div>
            <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>
              创建群组
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 群图标 */}
          <div className="flex justify-center mb-4">
            <div className={`relative`}>
              <Avatar className="h-20 w-20">
                <AvatarFallback className={`${isDark ? "bg-neutral-800" : "bg-neutral-200"} text-2xl`}>
                  <Users className={`h-10 w-10 ${isDark ? "text-neutral-400" : "text-neutral-500"}`} />
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* 群名称 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
              群名称 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="请输入群名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className={`${
                isDark
                  ? "bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                  : "bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400"
              }`}
            />
            <p className={`text-xs text-right ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
              {name.length}/50
            </p>
          </div>

          {/* 群介绍 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
              群介绍
            </label>
            <Textarea
              placeholder="请输入群介绍（可选）"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={200}
              rows={3}
              className={`resize-none ${
                isDark
                  ? "bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                  : "bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400"
              }`}
            />
            <p className={`text-xs text-right ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
              {desc.length}/200
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={`flex-1 ${
                isDark
                  ? "border-neutral-700 hover:bg-neutral-800 text-neutral-200"
                  : "border-neutral-300 hover:bg-neutral-100 text-neutral-700"
              }`}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "创建中..." : "创建群组"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
