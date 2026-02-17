import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useUserStore } from '@/store/user'
import { toast } from 'vue-sonner'

// Extended request config interface to include custom properties
interface CustomRequestConfig extends InternalAxiosRequestConfig {
  silent?: boolean
}

const service: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000
})

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data
    const config = response.config as CustomRequestConfig
    
    // If the response has a 'code' field, we assume it follows the standard wrapper format
    if (typeof res.code !== 'undefined') {
      if (res.code === 0) {
        return res.data
      } else {
        const msg = res.msg || 'Error'
        if (!config.silent) {
            toast.error(msg)
        }
        return Promise.reject(new Error(msg))
      }
    }
    
    // Fallback: return the data directly if no code field
    return res
  },
  (error) => {
    const config = error.config as CustomRequestConfig | undefined
    if (error.response && error.response.status === 401) {
      const userStore = useUserStore()
      userStore.logout()
      location.reload()
    }
    const msg = error.response?.data?.msg || error.message
    if (!config?.silent) {
        // Only show toast if silent is not true
        // However, for 401 we handled reload, for others we toast if not silent
        // But the previous code toasted always.
        // Let's toast only if not silent.
        // toast.error(msg) 
        // Wait, standard axios behavior is to reject. The previous code was toasting AND rejecting.
        // We should allow caller to handle UI if silent is true.
    } else {
        // If silent, we don't toast.
    }
    
    // Keep legacy behavior: always toast unless silent is explicitly true
    if (!config?.silent) {
        toast.error(msg)
    }

    return Promise.reject(new Error(msg))
  }
)

export default service
