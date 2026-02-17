import { defineStore } from 'pinia'
import { wsService, MsgType } from '@/services/ws'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [] as any[],
    activeChatId: null as string | number | null,
    activeChatType: null as 'private' | 'group' | null,
    messages: {} as Record<string, any[]>,
    unreadCounts: {} as Record<string, number>,
    isCallIncoming: false,
    incomingCallData: null as any,
    friendRequestCount: 0,
    groupRequestCount: 0
  }),
  getters: {
    totalUnread: (state) => {
      return state.conversations.reduce((acc, chat) => acc + (chat.unread || 0), 0)
    },
    totalRequests: (state) => state.friendRequestCount + state.groupRequestCount
  },
  actions: {
    async fetchRequestCounts() {
      try {
        const [fRes, gRes] = await Promise.all([
          request.get('/friend/requests'),
          request.get('/group/requests')
        ])
        this.friendRequestCount = ((fRes as any) || []).filter((r: any) => r.status === 0).length
        this.groupRequestCount = ((gRes as any) || []).filter((r: any) => r.status === 0).length
      } catch (e) {
        console.error(e)
      }
    },
    async fetchConversations() {
      const [friendsRes, groupsRes] = await Promise.all([
        request.get('/friend/list'),
        request.get('/group/my-groups')
      ])
      
      // Transform friends to conversation format
      const friends = ((friendsRes as any) || []).map((f: any) => ({
        id: f.id,
        name: f.nickname || f.username,
        avatar: f.avatar,
        type: 'private',
        unread: f.unread_count || 0,
        lastMsg: f.content || '',
        lastTime: f.last_message_time ? new Date(f.last_message_time).toLocaleString() : ''
      }))

      // Transform groups
      const groups = ((groupsRes as any) || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        avatar: g.icon,
        type: 'group',
        unread: g.unread_count || 0,
        lastMsg: g.content || '',
        lastTime: g.last_message_time ? new Date(g.last_message_time).toLocaleString() : ''
      }))

      this.conversations = [...friends, ...groups]
    },
    setActiveChat(id: string | number) {
      this.activeChatId = id
      const chat = this.conversations.find(c => c.id === id)
      if (chat) {
        this.activeChatType = chat.type
        this.fetchHistory(id, chat.type === 'private' ? 2 : 3)
      }
      
      // Clear unread count for this chat in the store
      if (this.unreadCounts[id]) {
        this.unreadCounts[id] = 0
      }
      
      // Update the specific conversation's unread count
      const idx = this.conversations.findIndex(c => c.id === id)
      if (idx !== -1) {
        this.conversations[idx].unread = 0
      }
    },
    async fetchHistory(targetId: string | number, type: number) {
        if (this.messages[targetId] && this.messages[targetId].length > 0) return
        try {
            const userStore = useUserStore()
            const res: any = await request.get('/chat/history', { 
                params: { 
                    target_id: targetId, 
                    chat_type: type 
                } 
            })
            // The backend returns messages in chronological order (oldest first) or reverse?
            // Usually chat history is newest first or oldest first. 
            // Let's assume the API returns a list of messages.
            // We need to map them to our format if necessary.
            // Based on backend code: service.GetHistoryMsg returns []MessageDTO
            
            const msgs = (res || []).map((m: any) => {
                const isMe = String(m.from_user_id) === String(userStore.userInfo?.id)
                return {
                    id: m.id,
                    content: m.content,
                    from_id: m.from_user_id,
                    target_id: m.to_user_id,
                    type: m.type,
                    media: m.media,
                    send_time: m.created_at,
                    // Add sender info if possible, or just rely on IDs
                    nickname: isMe ? (userStore.userInfo?.nickname || userStore.userInfo?.username) : (m.sender_name || m.nickname),
                    avatar: isMe ? userStore.userInfo?.avatar : (m.sender_avatar || m.avatar),
                }
            })
            
            this.messages[targetId] = msgs
        } catch (e) {
            console.error('Failed to fetch history', e)
        }
    },
    receiveMessage(msg: any) {
      const userStore = useUserStore()
      let chatId
      if (msg.type === MsgType.GroupMsg) {
        chatId = msg.target_id
      } else {
        chatId = String(msg.from_id) === String(userStore.userInfo?.id) ? msg.target_id : msg.from_id
      }
      
      // Ensure sender info is present for self messages (e.g. synced from other devices)
      if (String(msg.from_id) === String(userStore.userInfo?.id)) {
        if (!msg.nickname) msg.nickname = userStore.userInfo?.nickname || userStore.userInfo?.username
        if (!msg.avatar) msg.avatar = userStore.userInfo?.avatar
      }
      
      if (!this.messages[chatId]) {
        this.messages[chatId] = []
      }
      this.messages[chatId]!.push(msg)

      if (this.activeChatId !== chatId) {
        this.unreadCounts[chatId] = (this.unreadCounts[chatId] || 0) + 1
        const idx = this.conversations.findIndex(c => c.id === chatId)
        if (idx !== -1) {
          this.conversations[idx].unread = (this.conversations[idx].unread || 0) + 1
          this.conversations[idx].lastMsg = msg.content
          this.conversations[idx].lastTime = new Date().toLocaleString()
          const chat = this.conversations.splice(idx, 1)[0]
          this.conversations.unshift(chat)
        }
      } else {
        const idx = this.conversations.findIndex(c => c.id === chatId)
        if (idx !== -1) {
          this.conversations[idx].lastMsg = msg.content
          this.conversations[idx].lastTime = new Date().toLocaleString()
        }
      }
    },
    async sendMessage(content: string, type: number, targetId: string | number) {
      const msg = {
        type,
        target_id: targetId,
        content,
        media: 1
      }
      this.pushTempMessage(msg, targetId)
      wsService.send(msg)
    },
    async sendMediaMessage(content: string, type: number, targetId: string | number, mediaType: number) {
      const msg = {
        type,
        target_id: targetId,
        content,
        media: mediaType
      }
      this.pushTempMessage(msg, targetId)
      wsService.send(msg)
    },
    pushTempMessage(msg: any, targetId: string | number) {
      const userStore = useUserStore()
      const tempMsg = {
        ...msg,
        from_id: userStore.userInfo?.id || 'me',
        nickname: userStore.userInfo?.nickname || userStore.userInfo?.username,
        avatar: userStore.userInfo?.avatar,
        send_time: Date.now() / 1000, // Keep seconds for consistency with potential other usage or change to ms?
        // Wait, if MessageBubble expects ms (from backend created_at), then local temp msg should also be ms if unified.
        // But previously MessageBubble multiplied by 1000.
        // If I change MessageBubble to NOT multiply, then backend created_at (ms) works.
        // But local temp msg (seconds) will be treated as ms -> very small timestamp (1970).
        // So local temp msg MUST be ms.
        send_time: Date.now(),
        status: 'sending'
      }
      
      if (!this.messages[targetId]) {
        this.messages[targetId] = []
      }
      this.messages[targetId]!.push(tempMsg)
    },
    handleWebRTC(data: any) {
        this.isCallIncoming = true
        this.incomingCallData = data
    }
  }
})
