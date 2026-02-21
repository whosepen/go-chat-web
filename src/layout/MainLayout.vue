<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { wsService } from '@/services/ws'
import { useUserStore } from '@/store/user'
import { useChatStore } from '@/store/chat'
import { Toaster } from '@/components/ui/sonner'
import { MessageSquare, Users, Settings, LogOut } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
      <Popover>
        <PopoverTrigger as-child>
          <Avatar class="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage :src="userStore.userInfo?.avatar" />
            <AvatarFallback class="bg-primary text-primary-foreground font-bold">
              {{ (userStore.userInfo?.nickname || userStore.userInfo?.username || 'GC').slice(0, 2).toUpperCase() }}
            </AvatarFallback>
          </Avatar>
        </PopoverTrigger>
        <PopoverContent class="w-80 ml-2" side="right" align="start">
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-4">
              <Avatar class="h-16 w-16">
                <AvatarImage :src="userStore.userInfo?.avatar" />
                <AvatarFallback class="text-lg bg-primary text-primary-foreground">
                  {{ (userStore.userInfo?.nickname || userStore.userInfo?.username || 'GC').slice(0, 2).toUpperCase() }}
                </AvatarFallback>
              </Avatar>
              <div class="flex flex-col overflow-hidden">
                <h3 class="font-bold text-lg truncate">{{ userStore.userInfo?.nickname || userStore.userInfo?.username }}</h3>
                <span class="text-xs text-muted-foreground truncate">@{{ userStore.userInfo?.username }}</span>
              </div>
            </div>
            
            <div class="grid gap-2 text-sm">
              <div class="flex items-center gap-2" v-if="userStore.userInfo?.phone">
                <span class="text-muted-foreground w-16 shrink-0">Phone:</span>
                <span class="truncate">{{ userStore.userInfo.phone }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground w-16 shrink-0">Email:</span>
                <span class="truncate">{{ userStore.userInfo?.email }}</span>
              </div>
            </div>
            
            <Button variant="outline" class="w-full mt-2" @click="navigateTo('settings')">
              Edit Profile
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      
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
    
    <Toaster position="top-center" />
  </div>
</template>
