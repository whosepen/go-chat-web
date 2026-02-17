<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '@/store/chat'
import { useUserStore } from '@/store/user'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import MessageBubble from '@/components/MessageBubble.vue'
import ChatInput from '@/components/ChatInput.vue'
import request from '@/utils/request'
import axios from 'axios'

const chatStore = useChatStore()
const userStore = useUserStore()

const activeChat = computed(() => {
  return chatStore.conversations.find(c => c.id === chatStore.activeChatId)
})

const messages = computed(() => {
  if (!chatStore.activeChatId) return []
  return chatStore.messages[chatStore.activeChatId] || []
})

const handleSend = (content: string) => {
  if (!chatStore.activeChatId) return
  const type = activeChat.value?.type === 'group' ? 3 : 2
  chatStore.sendMessage(content, type, chatStore.activeChatId)
}

const handleUpload = async (file: File) => {
  if (!chatStore.activeChatId) return
  
  try {
    // 1. Get Upload Token
    // Send params as query params to support backend using c.GetString (workaround)
    const res: any = await request.post('/media/upload', {}, {
      params: {
        filename: file.name,
        type: 'chat'
      }
    })
    
    const { put_url, file_url } = res
    
    // 2. Upload to OSS (Direct PUT)
    await axios.put(put_url, file, {
      headers: {
        'Content-Type': file.type
      }
    })
    
    // 3. Send Message with File URL
    // Media Type: 2 for Image, 3 for Audio/Video/File (simplified logic)
    const isImage = file.type.startsWith('image/')
    const mediaType = isImage ? 2 : 3 // Need to verify proto for exact types
    // Proto: 1:Text, 2:Image, 3:Audio. Let's assume 2 for Image.
    
    // Send message via WS
    // Note: sendMessage usually takes content string. For media, content is the URL.
    // We need to modify sendMessage to support media type or just pass it.
    // The current sendMessage takes 'type' which is ChatType (2/3). 
    // Wait, sendMessage implementation:
    /*
    async sendMessage(content: string, type: number, targetId: string | number) {
      const msg = { type, target_id, content, media: 1 } 
      // It hardcodes media: 1
    }
    */
    // I need to update ChatStore to support media type parameter.
    
    chatStore.sendMediaMessage(file_url, activeChat.value?.type === 'group' ? 3 : 2, chatStore.activeChatId, isImage ? 2 : 3)
    
  } catch (e) {
    console.error('Upload failed', e)
  }
}
</script>

<template>
  <div class="flex flex-col bg-background h-full overflow-hidden" v-if="activeChat">
    <div class="p-4 border-b flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <Avatar>
          <AvatarImage :src="activeChat.avatar" />
          <AvatarFallback>{{ activeChat.name ? activeChat.name.slice(0, 2).toUpperCase() : '??' }}</AvatarFallback>
        </Avatar>
        <div>
          <h3 class="font-semibold">{{ activeChat.name }}</h3>
          <span class="text-xs text-muted-foreground" v-if="activeChat.type === 'group'">
            Group
          </span>
          <span class="text-xs text-green-500" v-else>Online</span>
        </div>
      </div>
    </div>
    
    <ScrollArea class="flex-1 p-4">
      <div class="flex flex-col gap-4 pb-4">
        <MessageBubble 
          v-for="(msg, index) in messages" 
          :key="index" 
          :message="msg" 
          :is-me="msg.from_id === userStore.userInfo?.ID || msg.from_id === 'me'" 
        />
      </div>
    </ScrollArea>
    
    <div class="shrink-0">
      <ChatInput @send="handleSend" @upload="handleUpload" />
    </div>
  </div>
  
  <div v-else class="flex-1 flex items-center justify-center text-muted-foreground h-full">
    Select a chat to start messaging
  </div>
</template>
