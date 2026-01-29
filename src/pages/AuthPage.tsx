import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, MessageCircle, Sun, Moon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// API 基础地址
const API_BASE_URL = "http://localhost:8080/api"

// 响应类型定义
interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

interface LoginResponse {
  token: string
  username: string
  nickname: string
}

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // 表单状态
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
  })

  const navigate = useNavigate()

  // 主题切换
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError("")
  }

  // 验证表单
  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setError("请输入用户名")
      return false
    }
    if (formData.username.length < 4 || formData.username.length > 32) {
      setError("用户名长度必须在4-32个字符之间")
      return false
    }
    if (!formData.password.trim()) {
      setError("请输入密码")
      return false
    }
    if (formData.password.length < 6) {
      setError("密码长度不能少于6个字符")
      return false
    }
    if (!isLogin && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setError("请输入有效的邮箱地址")
        return false
      }
    }
    return true
  }

  // 登录
  const handleLogin = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/user/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      })

      const result: ApiResponse<LoginResponse> = await response.json()

      if (result.code === 0) {
        // 保存 token
        localStorage.setItem("token", result.data.token)
        localStorage.setItem("username", result.data.username)
        navigate("/chat")
      } else {
        setError(result.msg)
      }
    } catch {
      setError("网络错误，请检查服务器是否启动")
    } finally {
      setLoading(false)
    }
  }

  // 注册
  const handleRegister = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/user/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
        }),
      })

      const result: ApiResponse = await response.json()

      if (result.code === 0) {
        // 注册成功，切换到登录页面
        setIsLogin(true)
        setError("")
        alert("注册成功，请登录")
      } else {
        setError(result.msg)
      }
    } catch {
      setError("网络错误，请检查服务器是否启动")
    } finally {
      setLoading(false)
    }
  }

  // 提交处理
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isLogin) {
      handleLogin()
    } else {
      handleRegister()
    }
  }

  // 切换登录/注册
  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError("")
  }

  // 切换主题
  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 ${isDark ? "bg-black" : "bg-neutral-100"}`}
      style={{
        backgroundImage: isDark
          ? 'repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)'
          : 'repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(0,0,0,0.03) 20px, rgba(0,0,0,0.03) 40px)',
        animation: 'stripe-flow 20s linear infinite'
      }}
    >
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleMode}
          style={{ backgroundColor: isDark ? '#000' : '#fff' }}
          className={`${isDark ? "border border-neutral-700 text-neutral-400 hover:bg-neutral-800" : "border border-neutral-200 text-black shadow-sm hover:bg-neutral-100"}`}
        >
          {isLogin ? "注册" : "登录"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          style={{ backgroundColor: isDark ? '#000' : '#fff' }}
          className={isDark ? "border border-neutral-700 text-neutral-400 hover:bg-neutral-800" : "border border-neutral-200 text-black shadow-sm hover:bg-neutral-100"}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
      <Card className={`w-full max-w-md border ${isDark ? "border-neutral-800 bg-[hsl(0,0%,8%)]" : "border-neutral-200 bg-white"}`}>
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className={`h-8 w-8 ${isDark ? "text-neutral-400" : "text-neutral-600"}`} />
              <span className={`text-2xl font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>GoChat</span>
            </div>
          </div>
          <CardTitle className={`text-2xl font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>
            {isLogin ? "欢迎回来" : "创建账号"}
          </CardTitle>
          <CardDescription className={isDark ? "text-neutral-400" : "text-neutral-600"}>
            {isLogin
              ? "输入您的凭据以登录账户"
              : "注册新账户以开始使用"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className={`p-3 text-sm rounded-md ${isDark ? "text-red-400 bg-red-900/20 border-red-900" : "text-red-600 bg-red-50 border-red-200"}`}>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className={isDark ? "text-neutral-300" : "text-neutral-700"}>用户名</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={handleInputChange}
                disabled={loading}
                autoComplete="username"
                className={isDark
                  ? "text-neutral-200 bg-[hsl(0,0%,14.9%)] border-[hsl(0,0%,20%)] placeholder:text-neutral-500"
                  : "text-neutral-900 bg-white border-neutral-300 placeholder:text-neutral-400"
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={isDark ? "text-neutral-300" : "text-neutral-700"}>密码</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className={isDark
                    ? "flex-1 text-neutral-200 bg-[hsl(0,0%,14.9%)] border-[hsl(0,0%,20%)] placeholder:text-neutral-500"
                    : "flex-1 text-neutral-900 bg-white border-neutral-300 placeholder:text-neutral-400"
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={isDark
                    ? "bg-[hsl(0,0%,14.9%)] border-[hsl(0,0%,20%)] text-neutral-200 hover:bg-[hsl(0,0%,20%)]"
                    : "bg-black border-neutral-300 text-white hover:bg-neutral-800 [&>svg]:text-white"
                  }
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="email" className={isDark ? "text-neutral-300" : "text-neutral-700"}>邮箱 (可选)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="请输入邮箱地址"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={loading}
                  autoComplete="email"
                  className={isDark
                    ? "text-neutral-200 bg-[hsl(0,0%,14.9%)] border-[hsl(0,0%,20%)] placeholder:text-neutral-500"
                    : "text-neutral-900 bg-white border-neutral-300 placeholder:text-neutral-400"
                  }
                />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className={`w-full ${isDark ? "bg-white text-white hover:bg-gray-200 border-0" : "bg-neutral-900 text-white hover:bg-neutral-800 border-0"}`} disabled={loading}>
              {loading ? "处理中..." : isLogin ? "登录" : "注册"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
