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
    getChatKey(id: string | number, type: string | number) {
        const typeStr = (type === 'group' || type === 3) ? 'group' : 'private'
        return `${typeStr}-${id}`
    },
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
        username: f.username,
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
    async setActiveChat(id: string | number | null, type: 'private' | 'group' | null = null) {
      // If there was a previous chat, mark it as read before switching
      if (this.activeChatId && (this.activeChatId !== id || this.activeChatType !== type)) {
        const prevChat = this.conversations.find(c => c.id === this.activeChatId && c.type === this.activeChatType)
        if (prevChat) {
            try {
                const endpoint = prevChat.type === 'group' ? '/group/mark-read' : '/friend/mark-read'
                const payload = { target_id: Number(prevChat.id) }
                await request.post(endpoint, payload, { silent: true } as any)
            } catch (e) {
                console.error('Failed to mark as read (leave)', e)
            }
        }
      }

      this.activeChatId = id
      if (!id) {
          this.activeChatType = null
          return
      }

      // If type is provided, use it to find the chat. Otherwise, try to infer (backward compatibility, but safer to use type)
      // Since IDs can conflict, type is mandatory for correct resolution if not unique.
      // But let's support type if passed.
      
      let chat;
      if (type) {
        chat = this.conversations.find(c => c.id === id && c.type === type)
      } else {
        chat = this.conversations.find(c => c.id === id)
      }
      
      if (chat) {
        this.activeChatType = chat.type
        this.fetchHistory(id, chat.type === 'private' ? 2 : 3)
        
        // Mark as read immediately upon entering
        try {
            const endpoint = chat.type === 'group' ? '/group/mark-read' : '/friend/mark-read'
            const payload = { target_id: Number(chat.id) }
            await request.post(endpoint, payload, { silent: true } as any)
        } catch (e) {
            console.error('Failed to mark as read (enter)', e)
        }
      }
      
      const chatKey = this.getChatKey(id, this.activeChatType || 'private')
      // Clear unread count for this chat in the store
      if (this.unreadCounts[chatKey]) {
        this.unreadCounts[chatKey] = 0
      }
      
      // Update the specific conversation's unread count
      const idx = this.conversations.findIndex(c => c.id === id && c.type === this.activeChatType)
      if (idx !== -1) {
        this.conversations[idx].unread = 0
      }
    },
    async fetchHistory(targetId: string | number, type: number) {
        const chatKey = this.getChatKey(targetId, type)
        if (this.messages[chatKey] && this.messages[chatKey].length > 0) return
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
                // Find sender info
                let senderInfo = null
                if (isMe) {
                    senderInfo = userStore.userInfo
                } else if (type === 2) {
                    // For private chat, try to find in conversations
                    senderInfo = this.conversations.find(c => String(c.id) === String(m.from_user_id) && c.type === 'private')
                } else if (type === 3) {
                    // For group chat, we try to use the sender info if available in the message object
                    // Or fallback to ID if not present.
                    // The frontend might need to fetch group members to get full info if backend doesn't provide it in message list.
                    // But for now, we rely on what we have.
                }

                return {
                    id: m.id,
                    content: m.content,
                    from_id: m.from_user_id,
                    target_id: m.to_user_id,
                    type: m.type,
                    media: m.media,
                    send_time: m.created_at,
                    // Use found info or fallback. For group chat, m.sender_name/avatar should be populated by backend join query
                    nickname: isMe ? (userStore.userInfo?.nickname || userStore.userInfo?.username) : (senderInfo?.name || m.sender_name || m.nickname || m.username || m.from_user_id),
                    avatar: isMe ? userStore.userInfo?.avatar : (senderInfo?.avatar || m.sender_avatar || m.avatar),
                }
            })
            
            this.messages[chatKey] = msgs
        } catch (e) {
            console.error('Failed to fetch history', e)
        }
    },
    receiveMessage(msg: any) {
      const userStore = useUserStore()
      let chatId
      let chatType
      if (msg.type === MsgType.GroupMsg) {
        chatId = msg.target_id
        chatType = 'group'
      } else {
        chatId = String(msg.from_id) === String(userStore.userInfo?.id) ? msg.target_id : msg.from_id
        chatType = 'private'
      }
      
      const chatKey = this.getChatKey(chatId, chatType)

      // Ensure sender info is present for self messages (e.g. synced from other devices)
      if (String(msg.from_id) === String(userStore.userInfo?.id)) {
        if (!msg.nickname) msg.nickname = userStore.userInfo?.nickname || userStore.userInfo?.username
        if (!msg.avatar) msg.avatar = userStore.userInfo?.avatar
      }
      
      if (!this.messages[chatKey]) {
        this.messages[chatKey] = []
      }
      this.messages[chatKey]!.push(msg)

      // Check if this chat is active
      const isActive = this.activeChatId === chatId && this.activeChatType === chatType

      if (!isActive) {
        this.unreadCounts[chatKey] = (this.unreadCounts[chatKey] || 0) + 1
        const idx = this.conversations.findIndex(c => c.id === chatId && c.type === chatType)
        if (idx !== -1) {
          this.conversations[idx].unread = (this.conversations[idx].unread || 0) + 1
          this.conversations[idx].lastMsg = msg.content
          this.conversations[idx].lastTime = new Date().toLocaleString()
          const chat = this.conversations.splice(idx, 1)[0]
          this.conversations.unshift(chat)
        }
      } else {
        const idx = this.conversations.findIndex(c => c.id === chatId && c.type === chatType)
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
      this.pushTempMessage(msg, targetId, type)
      wsService.send(msg)
    },
    async sendMediaMessage(content: string, type: number, targetId: string | number, mediaType: number) {
      const msg = {
        type,
        target_id: targetId,
        content,
        media: mediaType
      }
      this.pushTempMessage(msg, targetId, type)
      wsService.send(msg)
    },
    pushTempMessage(msg: any, targetId: string | number, type: number) {
      const userStore = useUserStore()
      const tempMsg = {
        ...msg,
        from_id: userStore.userInfo?.id || 'me',
        nickname: userStore.userInfo?.nickname || userStore.userInfo?.username,
        avatar: userStore.userInfo?.avatar,
        // But local temp msg (seconds) will be treated as ms -> very small timestamp (1970).
        // So local temp msg MUST be ms.
        send_time: Date.now(),
        status: 'sending'
      }
      
      const chatKey = this.getChatKey(targetId, type)
      if (!this.messages[chatKey]) {
        this.messages[chatKey] = []
      }
      this.messages[chatKey]!.push(tempMsg)
    },
    handleWebRTC(data: any) {
        this.isCallIncoming = true
        this.incomingCallData = data
    }
  }
})
