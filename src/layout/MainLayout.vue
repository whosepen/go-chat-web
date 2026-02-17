<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { wsService } from '@/services/ws'
import { useUserStore } from '@/store/user'
import { useChatStore } from '@/store/chat'
import { Toaster } from '@/components/ui/sonner'
import { MessageSquare, Users, Settings, LogOut } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import ChatList from '@/components/ChatList.vue'

const userStore = useUserStore()
const chatStore = useChatStore()
const route = useRoute()
const router = useRouter()

const activeTab = computed(() => {
  if (route.path.includes('contacts')) return 'contacts'
  if (route.path.includes('settings')) return 'settings'
  return 'chats'
})

onMounted(() => {
  if (userStore.token) {
    wsService.connect()
    chatStore.fetchConversations()
    chatStore.fetchRequestCounts()
  }
})

onUnmounted(() => {
  wsService.disconnect()
})

const logout = () => {
  userStore.logout()
  wsService.disconnect()
  location.reload()
}

const navigateTo = (tab: string) => {
  if (tab === 'chats') {
    router.push('/')
  } else if (tab === 'contacts') {
    router.push('/contacts')
  } else if (tab === 'settings') {
    router.push('/settings')
  }
}
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden bg-background">
    <!-- Primary Sidebar -->
    <aside class="w-16 border-r flex flex-col items-center py-4 gap-4 bg-muted/40 z-50">
      <div class="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
        GC
      </div>
      
      <nav class="flex-1 flex flex-col gap-2 w-full px-2">
        <div class="relative">
          <Button 
            :variant="activeTab === 'chats' ? 'secondary' : 'ghost'" 
            size="icon" 
            class="w-full justify-center" 
            title="Chats"
            @click="navigateTo('chats')"
          >
            <MessageSquare class="h-5 w-5" />
          </Button>
          <span v-if="chatStore.totalUnread > 0" class="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">
            {{ chatStore.totalUnread > 9 ? '9+' : chatStore.totalUnread }}
          </span>
        </div>

        <div class="relative">
          <Button 
            :variant="activeTab === 'contacts' ? 'secondary' : 'ghost'" 
            size="icon" 
            class="w-full justify-center" 
            title="Contacts"
            @click="navigateTo('contacts')"
          >
            <Users class="h-5 w-5" />
          </Button>
          <span v-if="chatStore.totalRequests > 0" class="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">
            {{ chatStore.totalRequests > 9 ? '9+' : chatStore.totalRequests }}
          </span>
        </div>

        <Button 
          :variant="activeTab === 'settings' ? 'secondary' : 'ghost'" 
          size="icon" 
          class="w-full justify-center" 
          title="Settings"
          @click="navigateTo('settings')"
        >
          <Settings class="h-5 w-5" />
        </Button>
      </nav>

      <div class="mt-auto px-2 w-full">
        <Button variant="ghost" size="icon" class="w-full justify-center" title="Logout" @click="logout">
          <LogOut class="h-5 w-5" />
        </Button>
      </div>
    </aside>

    <!-- Secondary Sidebar (Chat List) - Always Visible -->
    <ChatList />

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden">
      <RouterView />
    </main>
    
    <Toaster />
  </div>
</template>
