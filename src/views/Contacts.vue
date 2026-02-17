<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useChatStore } from '@/store/chat'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'vue-sonner'
import request from '@/utils/request'
import { Check, X } from 'lucide-vue-next'

const activeTab = ref('friends')
const friends = ref<any[]>([])
const friendRequests = ref<any[]>([])
const groupRequests = ref<any[]>([])

const fetchFriends = async () => {
  try {
    const res: any = await request.get('/friend/list')
    friends.value = res || []
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
            <div v-for="friend in friends" :key="friend.id" class="flex items-center gap-4 p-4 border rounded-lg">
              <Avatar>
                <AvatarImage :src="friend.avatar" />
                <AvatarFallback>{{ friend.nickname?.slice(0, 2) || friend.username.slice(0, 2) }}</AvatarFallback>
              </Avatar>
              <div>
                <div class="font-medium">{{ friend.nickname || friend.username }}</div>
                <div class="text-sm text-muted-foreground">{{ friend.online ? 'Online' : 'Offline' }}</div>
              </div>
            </div>
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
                  <AvatarImage :src="req.avatar" />
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
  </div>
</template>
