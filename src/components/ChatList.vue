<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useChatStore } from '@/store/chat'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-vue-next'
import ContactModal from '@/components/ContactModal.vue'
import { useRouter } from 'vue-router'

const chatStore = useChatStore()
const router = useRouter()
const search = ref('')

onMounted(async () => {
  await chatStore.fetchConversations()
})

const handleChatClick = (id: number | string) => {
  chatStore.setActiveChat(id)
  router.push('/')
}
</script>

<template>
  <div class="w-80 border-r flex flex-col bg-muted/20 h-full">
    <div class="p-4 border-b flex items-center justify-between">
      <h2 class="font-semibold text-lg">Messages</h2>
      <ContactModal>
        <Button variant="ghost" size="icon">
          <Plus class="h-5 w-5" />
        </Button>
      </ContactModal>
    </div>
    
    <div class="p-4 pb-0">
      <div class="relative">
        <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input v-model="search" placeholder="Search..." class="pl-9" />
      </div>
    </div>
    
    <ScrollArea class="flex-1 mt-4">
      <div class="flex flex-col gap-1 px-2">
        <div 
          v-for="chat in chatStore.conversations.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))" 
          :key="chat.id"
          class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
          :class="chatStore.activeChatId === chat.id ? 'bg-secondary' : 'hover:bg-muted/50'"
          @click="handleChatClick(chat.id)"
        >
          <div class="relative">
            <Avatar>
              <AvatarImage :src="chat.avatar" />
              <AvatarFallback>{{ chat.name ? chat.name.slice(0, 2).toUpperCase() : '??' }}</AvatarFallback>
            </Avatar>
            <span v-if="chat.unread > 0" class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {{ chat.unread > 99 ? '99+' : chat.unread }}
            </span>
          </div>
          <div class="flex-1 overflow-hidden">
            <div class="flex justify-between items-center">
              <span class="font-medium truncate">{{ chat.name }}</span>
              <span v-if="chat.lastTime" class="text-xs text-muted-foreground">{{ chat.lastTime }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-muted-foreground truncate max-w-[180px]">{{ chat.lastMsg }}</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
