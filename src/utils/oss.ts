import request from '@/utils/request'

/**
 * 从 OSS URL 中解析 Key 和 Type
 * 假设 URL 格式包含 bucket name，例如: .../user-avatars/key... 或 .../chat-files/key...
 */
export const parseOssUrl = (url: string): { key: string, type: string } | null => {
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname
    
    // 移除开头的斜杠
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    
    // 检查 bucket
    if (cleanPath.startsWith('user-avatars/')) {
      return {
        key: cleanPath.replace('user-avatars/', ''),
        type: 'avatar'
      }
    } else if (cleanPath.startsWith('chat-files/')) {
      return {
        key: cleanPath.replace('chat-files/', ''),
        type: 'chat'
      }
    }
    
    return null
  } catch (e) {
    console.error('Invalid URL:', url)
    return null
  }
}

/**
 * 刷新下载凭证
 */
export const refreshDownloadUrl = async (originalUrl: string): Promise<string | null> => {
  const parsed = parseOssUrl(originalUrl)
  if (!parsed) return null
  
  try {
    const res: any = await request.post('/media/download', {
      key: parsed.key,
      type: parsed.type
    }, { silent: true } as any)
    
    return res.download_url
  } catch (e) {
    console.error('Failed to refresh download url:', e)
    return null
  }
}
