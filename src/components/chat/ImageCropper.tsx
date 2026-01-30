import { useState, useRef, useEffect } from "react"
import { Upload, Crop as CropIcon, RotateCcw, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageCropperProps {
  isOpen: boolean
  onClose: () => void
  onCropComplete: (file: File) => void
  isDark: boolean
}

export function ImageCropper({ isOpen, onClose, onCropComplete, isDark }: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      resetState()
    }
  }, [isOpen])

  const resetState = () => {
    setImageSrc(null)
    setCroppedBlob(null)
    setCroppedPreview(null)
    setScale(1)
    setRotation(0)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件")
      return
    }

    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("图片大小不能超过10MB")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // 检查图片尺寸
        if (img.width < 100 || img.height < 100) {
          alert("图片尺寸不能小于100x100像素")
          return
        }
        setImageSrc(event.target?.result as string)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleCrop = async () => {
    if (!imageSrc) return

    setIsProcessing(true)

    const img = new Image()
    img.onload = async () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // 正方形裁剪尺寸
      const cropSize = 1080
      canvas.width = cropSize
      canvas.height = cropSize

      // 计算裁剪区域（取中心）
      const minSize = Math.min(img.width, img.height)
      let sx = (img.width - minSize) / 2
      let sy = (img.height - minSize) / 2

      // 应用缩放
      const scaledSize = minSize / scale
      sx += (minSize - scaledSize) / 2
      sy += (minSize - scaledSize) / 2

      // 应用旋转
      ctx.save()
      ctx.translate(cropSize / 2, cropSize / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-cropSize / 2, -cropSize / 2)

      // 绘制裁剪后的图片
      ctx.drawImage(
        img,
        sx, sy, scaledSize, scaledSize, // 源区域
        0, 0, cropSize, cropSize // 目标区域
      )
      ctx.restore()

      // 导出为Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCroppedBlob(blob)
            setCroppedPreview(URL.createObjectURL(blob))
          }
          setIsProcessing(false)
        },
        "image/jpeg",
        0.9
      )
    }
    img.src = imageSrc
  }

  const handleConfirm = () => {
    if (croppedBlob) {
      const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })
      onCropComplete(file)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* 对话框 */}
      <div
        className={`relative w-full max-w-md rounded-xl shadow-xl overflow-hidden ${
          isDark ? "bg-[hsl(0,0%,8%)]" : "bg-white"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? "border-neutral-800" : "border-neutral-200"
        }`}>
          <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>
            裁剪头像
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}
          >
            ×
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {!imageSrc ? (
            /* 上传区域 */
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDark
                  ? "border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800"
                  : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
              }`}
            >
              <Upload className={`h-12 w-12 mx-auto mb-3 ${isDark ? "text-neutral-500" : "text-neutral-400"}`} />
              <p className={`text-sm ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                点击选择图片
              </p>
              <p className={`text-xs mt-1 ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                支持 JPG/PNG，最大10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : !croppedPreview ? (
            /* 裁剪区域 */
            <>
              {/* 预览区域 */}
              <div className={`relative bg-black rounded-lg overflow-hidden ${
                isDark ? "bg-neutral-900" : "bg-neutral-100"
              }`} style={{ aspectRatio: "1", maxHeight: "300px" }}>
                <img
                  src={imageSrc}
                  alt="待裁剪"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s"
                  }}
                />
                {/* 裁剪框指示器 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[200px] h-[200px] border-2 border-white/50 rounded-lg" />
                </div>
              </div>

              {/* 缩放控制 */}
              <div className={`flex items-center gap-3 px-2 ${
                isDark ? "text-neutral-300" : "text-neutral-700"
              }`}>
                <span className="text-sm">缩放</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: isDark ? "#404040" : "#e5e5e5",
                  }}
                />
              </div>

              {/* 旋转控制 */}
              <div className={`flex items-center gap-3 px-2 ${
                isDark ? "text-neutral-300" : "text-neutral-700"
              }`}>
                <span className="text-sm">旋转</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRotation((r) => (r - 90) % 360)}
                  className={isDark ? "bg-neutral-800 border-neutral-700" : ""}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className={isDark ? "bg-neutral-800 border-neutral-700" : ""}
                >
                  <RotateCcw className="h-4 w-4 rotate-180" />
                </Button>
              </div>

              {/* 按钮 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setImageSrc(null)}
                  className={`flex-1 ${isDark ? "bg-neutral-800 border-neutral-700" : ""}`}
                >
                  重新选择
                </Button>
                <Button
                  onClick={handleCrop}
                  disabled={isProcessing}
                  className={`flex-1 ${isDark ? "bg-white text-black hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}
                >
                  <CropIcon className="h-4 w-4 mr-2" />
                  {isProcessing ? "处理中..." : "确认裁剪"}
                </Button>
              </div>
            </>
          ) : (
            /* 预览区域 */
            <>
              <div className={`rounded-lg overflow-hidden ${
                isDark ? "bg-neutral-900" : "bg-neutral-100"
              }`} style={{ aspectRatio: "1", maxHeight: "300px" }}>
                <img
                  src={croppedPreview}
                  alt="裁剪预览"
                  className="w-full h-full object-cover"
                />
              </div>

              <p className={`text-center text-sm ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                头像将裁剪为 1080x1080 正方形
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCroppedPreview(null)
                    setCroppedBlob(null)
                  }}
                  className={`flex-1 ${isDark ? "bg-neutral-800 border-neutral-700" : ""}`}
                >
                  重新裁剪
                </Button>
                <Button
                  onClick={handleConfirm}
                  className={`flex-1 ${isDark ? "bg-white text-black hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}
                >
                  <Check className="h-4 w-4 mr-2" />
                  使用此头像
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
