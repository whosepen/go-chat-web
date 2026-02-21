<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useChatStore } from '@/store/chat'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import request from '@/utils/request'
import { Check, X, Loader2 } from 'lucide-vue-next'

const activeTab = ref('friends')
const friends = ref<any[]>([])
const friendRequests = ref<any[]>([])
const groupRequests = ref<any[]>([])
const deleteDialogOpen = ref(false)
const friendToDelete = ref<any>(null)
const deleteLoading = ref(false)

const fetchFriends = async () => {
  try {
    const [friendsRes, blockedRes] = await Promise.all([
      request.get('/friend/list'),
      request.get('/friend/block/list')
    ])
    
    const friendList = (friendsRes as any) || []
    const blockedList = ((blockedRes as any) || []).map((u: any) => ({ ...u, status: 2 }))
    
    friends.value = [...friendList, ...blockedList]
  } catch (e) {
    console.error(e)
  }
}

const fetchFriendRequests = async () => {
  try {
    const res: any = await request.get('/friend/requests')
    friendRequests.value = res || []
  } catch (e) {
    console.error(e)
  }
}

const fetchGroupRequests = async () => {
  try {
    const res: any = await request.get('/group/requests')
    groupRequests.value = res || []
  } catch (e) {
    console.error(e)
  }
}

const handleFriendRequest = async (id: number, action: number) => {
  try {
    await request.post('/friend/handle', { request_id: id, action })
    toast.success(action === 1 ? 'Friend request accepted' : 'Friend request rejected')
    fetchFriendRequests()
    fetchFriends()
    // Refresh global counts
    useChatStore().fetchRequestCounts()
  } catch (e: any) {
    toast.error(e.message)
  }
}

const handleGroupRequest = async (id: number, action: number) => {
  try {
    await request.post('/group/handle-join', { request_id: id, action })
    toast.success(action === 1 ? 'Group request accepted' : 'Group request rejected')
    fetchGroupRequests()
    // Refresh global counts
    useChatStore().fetchRequestCounts()
  } catch (e: any) {
    toast.error(e.message)
  }
}

const confirmDelete = (friend: any) => {
  friendToDelete.value = friend
  deleteDialogOpen.value = true
}

const handleDeleteFriend = async () => {
  if (!friendToDelete.value) return
  deleteLoading.value = true
  try {
    await request.post('/friend/delete', { target_id: friendToDelete.value.id })
    toast.success('Friend deleted')
    deleteDialogOpen.value = false
    fetchFriends()
    // Also remove from chat list if present
    const chatStore = useChatStore()
    if (chatStore.activeChatId === friendToDelete.value.id && chatStore.activeChatType === 'private') {
        chatStore.activeChatId = null
    }
    chatStore.fetchConversations()
  } catch (e: any) {
    toast.error(e.message)
  } finally {
    deleteLoading.value = false
    friendToDelete.value = null
  }
}

const handleBlockFriend = async (friend: any) => {
  try {
    await request.post('/friend/block', { target_id: friend.id })
    toast.success('Friend blocked')
    fetchFriends()
    useChatStore().fetchConversations()
  } catch (e: any) {
    toast.error(e.message)
  }
}

const handleUnblockFriend = async (friend: any) => {
  try {
    await request.post('/friend/unblock', { target_id: friend.id })
    toast.success('Friend unblocked')
    fetchFriends()
    useChatStore().fetchConversations()
  } catch (e: any) {
    toast.error(e.message)
  }
}

const fetchFriendDetail = async (friend: any) => {
  if (friend.email) return // Already has detail info
  try {
    const res: any = await request.get('/friend/info', { params: { target_id: friend.id }, silent: true } as any)
    // Update friend object with new details
    Object.assign(friend, res)
  } catch (e) {
    console.error('Failed to fetch friend detail', e)
  }
}

onMounted(() => {
  fetchFriends()
  fetchFriendRequests()
  fetchGroupRequests()
})
</script>

<template>
  <div class="flex h-full w-full flex-col p-6">
    <h1 class="text-2xl font-bold mb-6">Contacts</h1>
    
    <Tabs v-model="activeTab" class="w-full flex-1 flex flex-col">
      <TabsList>
        <TabsTrigger value="friends">My Friends</TabsTrigger>
        <TabsTrigger value="friend-requests">
          Friend Requests
          <span v-if="friendRequests.length" class="ml-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{{ friendRequests.length }}</span>
        </TabsTrigger>
        <TabsTrigger value="group-requests">
          Group Requests
          <span v-if="groupRequests.length" class="ml-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{{ groupRequests.length }}</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="friends" class="flex-1 mt-4">
        <ScrollArea class="h-full">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Popover v-for="friend in friends" :key="friend.id">
              <PopoverTrigger as-child>
                <div 
                  class="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  @click="fetchFriendDetail(friend)"
                >
                  <Avatar>
                    <AvatarImage :src="friend.avatar" />
                    <AvatarFallback>{{ friend.nickname?.slice(0, 2) || friend.username.slice(0, 2) }}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div class="font-medium">{{ friend.nickname || friend.username }}</div>
                    <div v-if="friend.status === 2" class="text-sm font-bold text-red-500">BLOCKED</div>
                    <div v-else class="text-sm text-muted-foreground">{{ friend.online ? 'Online' : 'Offline' }}</div>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent class="w-80" align="start">
                <div class="flex flex-col gap-4">
                  <div class="flex items-center gap-4">
                    <Avatar class="h-16 w-16">
                      <AvatarImage :src="friend.avatar" />
                      <AvatarFallback class="text-lg">{{ friend.nickname?.slice(0, 2) || friend.username.slice(0, 2) }}</AvatarFallback>
                    </Avatar>
                    <div class="flex flex-col overflow-hidden">
                      <h3 class="font-bold text-lg truncate">{{ friend.nickname || friend.username }}</h3>
                      <span class="text-xs text-muted-foreground truncate">@{{ friend.username }}</span>
                    </div>
                  </div>
                  
                  <div class="grid gap-2 text-sm">
                    <div class="flex items-center gap-2" v-if="friend.email">
                      <span class="text-muted-foreground w-16">Email:</span>
                      <span>{{ friend.email }}</span>
                    </div>
                    <div class="flex items-center gap-2" v-if="friend.phone">
                      <span class="text-muted-foreground w-16 shrink-0">Phone:</span>
                      <span class="truncate">{{ friend.phone }}</span>
                    </div>
                  </div>
                  
                  <div class="flex gap-2 mt-2">
                    <Button 
                      variant="destructive" 
                      class="flex-1"
                      @click="confirmDelete(friend)"
                    >
                      Delete
                    </Button>
                    <Button 
                      v-if="friend.status !== 2"
                      class="flex-1 bg-black text-white hover:bg-black/90"
                      @click="handleBlockFriend(friend)"
                    >
                      Block
                    </Button>
                    <Button 
                      v-else
                      variant="outline"
                      class="flex-1 border-black text-black hover:bg-muted"
                      @click="handleUnblockFriend(friend)"
                    >
                      Unblock
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <div v-if="friends.length === 0" class="col-span-full text-center text-muted-foreground py-10">
              No friends yet
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
      
      <TabsContent value="friend-requests" class="flex-1 mt-4">
        <ScrollArea class="h-full">
          <div class="space-y-4">
            <div v-for="req in friendRequests" :key="req.id" class="flex items-center justify-between p-4 border rounded-lg">
              <div class="flex items-center gap-4">
                <Avatar>
                  <AvatarImage :src="req.sender_avatar || req.avatar" />
                  <AvatarFallback>{{ req.sender_name?.slice(0, 2) }}</AvatarFallback>
                </Avatar>
                <div>
                  <div class="font-medium">{{ req.sender_name }}</div>
                  <div class="text-sm text-muted-foreground">{{ req.remark || 'No remark' }}</div>
                  <div class="text-xs text-muted-foreground">{{ req.created_at }}</div>
                </div>
              </div>
              <div class="flex gap-2" v-if="req.status === 0">
                <Button size="sm" variant="outline" @click="handleFriendRequest(req.id, 2)">
                  <X class="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button size="sm" @click="handleFriendRequest(req.id, 1)">
                  <Check class="w-4 h-4 mr-1" /> Accept
                </Button>
              </div>
              <div v-else class="text-sm text-muted-foreground">
                {{ req.status === 1 ? 'Accepted' : 'Rejected' }}
              </div>
            </div>
             <div v-if="friendRequests.length === 0" class="text-center text-muted-foreground py-10">
              No pending friend requests
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
      
      <TabsContent value="group-requests" class="flex-1 mt-4">
        <ScrollArea class="h-full">
           <div class="space-y-4">
            <div v-for="req in groupRequests" :key="req.id" class="flex items-center justify-between p-4 border rounded-lg">
              <div class="flex items-center gap-4">
                <Avatar>
                  <AvatarImage :src="req.avatar" />
                  <AvatarFallback>{{ req.sender_name?.slice(0, 2) }}</AvatarFallback>
                </Avatar>
                <div>
                  <div class="font-medium">{{ req.sender_name }} wants to join {{ req.group_name }}</div>
                  <div class="text-sm text-muted-foreground">{{ req.remark || 'No remark' }}</div>
                  <div class="text-xs text-muted-foreground">{{ req.created_at }}</div>
                </div>
              </div>
              <div class="flex gap-2" v-if="req.status === 0">
                <Button size="sm" variant="outline" @click="handleGroupRequest(req.id, 2)">
                  <X class="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button size="sm" @click="handleGroupRequest(req.id, 1)">
                  <Check class="w-4 h-4 mr-1" /> Accept
                </Button>
              </div>
              <div v-else class="text-sm text-muted-foreground">
                {{ req.status === 1 ? 'Accepted' : 'Rejected' }}
              </div>
            </div>
             <div v-if="groupRequests.length === 0" class="text-center text-muted-foreground py-10">
              No pending group requests
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>

    <Dialog v-model:open="deleteDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Friend</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {{ friendToDelete?.nickname || friendToDelete?.username }}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="deleteDialogOpen = false">Cancel</Button>
          <Button variant="destructive" @click="handleDeleteFriend" :disabled="deleteLoading">
            <Loader2 v-if="deleteLoading" class="mr-2 h-4 w-4 animate-spin" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
