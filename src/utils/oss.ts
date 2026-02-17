import request from '@/utils/request'

/**
 * 从 OSS URL 中解析 Key 和 Type
 * 假设 URL 格式包含 bucket name，例如: .../user-avatars/key... 或 .../chat-files/key...
 */
export const parseOssUrl = (url: string): { key: string, type: string } | null => {
  try {
    // Handle relative URLs by adding a dummy base
    const urlObj = new URL(url, 'http://dummy.com')
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
    } else if (cleanPath.startsWith('temp-files/')) {
        return {
            key: cleanPath.replace('temp-files/', ''),
            type: 'temp'
        }
    }
    
    return null
  } catch (e) {
    console.error('Invalid URL:', url)
    return null
  }
}

/**
 * 将后端返回的绝对 URL 转换为前端可用的相对 URL (走代理)
 */
export const transformUrl = (url: string | undefined | null): string => {
  if (!url) return ''
  try {
    const urlObj = new URL(url)
    // 如果是 MinIO 的地址，转为相对路径
    if (urlObj.origin.includes('localhost:9000') || urlObj.pathname.startsWith('/user-avatars/') || urlObj.pathname.startsWith('/chat-files/') || urlObj.pathname.startsWith('/temp-files/')) {
        return urlObj.pathname + urlObj.search
    }
    return url
  } catch (e) {
    // 如果不是绝对 URL，直接返回
    return url
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
    
    return transformUrl(res.download_url)
  } catch (e) {
    console.error('Failed to refresh download url:', e)
    return null
  }
}
