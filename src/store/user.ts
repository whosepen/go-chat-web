import { defineStore } from 'pinia'
import request from '@/utils/request'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: null as any
  }),
  actions: {
    setToken(token: string) {
      this.token = token
    },
    setUserInfo(info: any) {
      this.userInfo = info
    },
    async login(form: any, config?: any) {
      const res: any = await request.post('/user/login', form, config)
      if (res.token) {
        this.token = res.token
        await this.fetchUserInfo()
      } else {
        throw new Error('Login failed: Token missing in response')
      }
    },
    async register(form: any, config?: any) {
      await request.post('/user/register', form, config)
    },
    async fetchUserInfo() {
      // Use profile endpoint to get full info including avatar
      const res: any = await request.get('/user/profile')
      this.userInfo = res
    },
    logout() {
      this.token = ''
      this.userInfo = null
    }
  },
  persist: {
    paths: ['token', 'userInfo']
  } as any
})
