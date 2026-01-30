import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ChatInputProps {
  onSend: (content: string) => void
  isDark: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, isDark, disabled }: ChatInputProps) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动聚焦
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [disabled])

  // 处理发送
  const handleSend = () => {
    const trimmed = input.trim()
    if (trimmed && !disabled) {
      onSend(trimmed)
      setInput("")
      // 重置高度
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 自动调整高度
  const handleResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }

  return (
    <div className={`p-4 border-t border-[hsl(0,0%,20%)] ${isDark ? "bg-[hsl(0,0%,8%)]" : "bg-white"}`}>
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            handleResize()
          }}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          disabled={disabled}
          className={`min-h-[44px] max-h-[150px] resize-none rounded-xl ${
            isDark
              ? "bg-[hsl(0,0%,14.9%)] border-[hsl(0,0%,20%)] text-neutral-200 placeholder:text-neutral-500 focus-visible:ring-neutral-600"
              : "bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-400"
          }`}
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          size="icon"
          className={`h-11 w-11 rounded-xl flex-shrink-0 ${
            input.trim() && !disabled
              ? isDark
                ? "bg-white text-black hover:bg-neutral-200"
                : "bg-neutral-900 text-white hover:bg-neutral-800"
              : isDark
                ? "bg-neutral-800 text-neutral-500"
                : "bg-neutral-200 text-neutral-400"
          }`}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
      {!disabled && (
        <p className={`text-xs mt-2 text-center ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
          按 Enter 发送，Shift + Enter 换行
        </p>
      )}
    </div>
  )
}
