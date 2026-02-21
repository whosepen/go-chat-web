<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChatStore } from '@/store/chat'
import { useUserStore } from '@/store/user'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, LogOut, Shield, ShieldOff, UserX, Save, UserPlus, Crown, User } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import MessageBubble from '@/components/MessageBubble.vue'
import ChatInput from '@/components/ChatInput.vue'
import request from '@/utils/request'
import axios from 'axios'

const chatStore = useChatStore()
const userStore = useUserStore()

const groupMembers = ref<any[]>([])
const groupDetail = ref<any>(null)
const showMemberDialog = ref(false)
const selectedMember = ref<any>(null)
const showQuitDialog = ref(false)
const isEditingGroup = ref(false)
const editGroupForm = ref({ name: '', desc: '', icon: '' })
const memberNickname = ref('')
const currentUserRole = computed(() => {
  const me = groupMembers.value.find(m => String(m.user_id) === String(userStore.userInfo?.id))
  return me?.role || 3 // 1:Owner, 2:Admin, 3:Member
})

const activeChat = computed(() => {
  return chatStore.conversations.find(c => c.id === chatStore.activeChatId && c.type === chatStore.activeChatType)
})

const messages = computed(() => {
  if (!chatStore.activeChatId) return []
  const key = chatStore.getChatKey(chatStore.activeChatId, chatStore.activeChatType || 'private')
  const rawMessages = chatStore.messages[key] || []
  
  return rawMessages.map(msg => {
    const enriched = { ...msg }
    const isMe = String(msg.from_id) === String(userStore.userInfo?.id) || msg.from_id === 'me'
    
    if (isMe) {
        enriched.avatar = userStore.userInfo?.avatar
        enriched.nickname = userStore.userInfo?.nickname || userStore.userInfo?.username
    } else if (activeChat.value?.type === 'group') {
        const member = groupMembers.value.find(m => String(m.user_id) === String(msg.from_id))
        if (member) {
            enriched.avatar = member.avatar
            enriched.nickname = member.nickname || member.username
        }
    } else {
        enriched.avatar = activeChat.value?.avatar
        enriched.nickname = activeChat.value?.nickname || activeChat.value?.username
    }
    return enriched
  })
})

const scrollAreaRef = ref<HTMLElement | null>(null)

watch(() => messages.value, () => {
  setTimeout(() => {
    const scrollViewport = scrollAreaRef.value?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
    if (scrollViewport) {
      scrollViewport.scrollTop = scrollViewport.scrollHeight
    }
  }, 100)
}, { deep: true })

watch(() => activeChat.value, () => {
  setTimeout(() => {
    const scrollViewport = scrollAreaRef.value?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
    if (scrollViewport) {
      scrollViewport.scrollTop = scrollViewport.scrollHeight
    }
  }, 100)
})

const fetchGroupDetails = async () => {
  if (!activeChat.value || activeChat.value.type !== 'group') return
  
  try {
    // Note: The backend API /group/info requires group_id parameter
    // The backend API /group/members requires group_id parameter
    // activeChat.value.id should be the group_id
    
    const [infoRes, membersRes] = await Promise.all([
      request.get('/group/info', { params: { group_id: activeChat.value.id }, silent: true } as any) as Promise<any>,
      request.get('/group/members', { params: { group_id: activeChat.value.id }, silent: true } as any) as Promise<any>
    ])
    
    groupDetail.value = infoRes
    
    // Enrich members with avatar from local friend list if available
    const members = (membersRes as any) || []
    groupMembers.value = members.map((m: any) => {
      // Find friend by UserID
      const friend = chatStore.conversations.find(c => c.type === 'private' && Number(c.id) === Number(m.user_id))
      return {
        ...m,
        // Prioritize friend avatar, then member.avatar (from API), then fallback
        avatar: friend?.avatar || m.avatar, 
        is_friend: !!friend
      }
    })
    
    // Sync group detail to form
    if (infoRes) {
        editGroupForm.value = {
            name: infoRes.name,
            desc: infoRes.desc || '',
            icon: infoRes.icon || ''
        }
    }
  } catch (e: any) {
    console.error('Failed to fetch group details', e)
  }
}

watch(() => [chatStore.activeChatId, chatStore.activeChatType], ([newId, newType]) => {
  if (newId && newType === 'group') {
    fetchGroupDetails()
  } else {
    groupMembers.value = []
    groupDetail.value = null
    isEditingGroup.value = false
  }
}, { immediate: true })

const openSelfMemberDialog = () => {
  const me = groupMembers.value.find(m => String(m.user_id) === String(userStore.userInfo?.id))
  if (me) {
    openMemberDialog(me)
  }
}
const openMemberDialog = (member: any) => {
  selectedMember.value = member
  memberNickname.value = member.nickname || ''
  showMemberDialog.value = true
}

const handleGroupIconUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
        const res: any = await request.post('/media/upload', {
            filename: file.name,
            type: 'group_icon'
        })
        
        const { put_url, file_url } = res
        
        await axios.put(put_url, file, {
            headers: {
                'Content-Type': file.type
            }
        })
        
        editGroupForm.value.icon = file_url
        toast.success('Group icon uploaded')
    } catch (e: any) {
        console.error('Upload failed', e)
        toast.error('Failed to upload icon')
    }
}

const handleUpdateGroup = async () => {
    try {
        await request.post('/group/info/update', {
            group_id: activeChat.value.id,
            name: editGroupForm.value.name,
            desc: editGroupForm.value.desc,
            icon: editGroupForm.value.icon
        })
        toast.success('Group info updated')
        isEditingGroup.value = false
        fetchGroupDetails()
        // Refresh conversation list to update name/avatar in sidebar
        chatStore.fetchConversations()
    } catch (e: any) {
        toast.error(e.message)
    }
}

const handleUpdateMember = async () => {
    if (!selectedMember.value) return
    try {
        await request.post('/group/members/update', {
            group_id: activeChat.value.id,
            target_id: selectedMember.value.user_id,
            new_nickname: memberNickname.value,
            new_role: selectedMember.value.role // Role update separate
        })
        toast.success('Member info updated')
        showMemberDialog.value = false
        fetchGroupDetails()
    } catch (e: any) {
        toast.error(e.message)
    }
}

const handleUpdateRole = async (newRole: number) => {
    if (!selectedMember.value) return
    try {
        await request.post('/group/members/update', {
            group_id: activeChat.value.id,
            target_id: selectedMember.value.user_id,
            new_nickname: selectedMember.value.nickname,
            new_role: newRole
        })
        toast.success('Member role updated')
        showMemberDialog.value = false
        fetchGroupDetails()
    } catch (e: any) {
        toast.error(e.message)
    }
}

const handleAddFriend = async () => {
  if (!selectedMember.value) return
  try {
    await request.post('/friend/request', {
        target_id: selectedMember.value.user_id,
        remark: `From group ${activeChat.value?.name}`
    })
    toast.success('Friend request sent')
    showMemberDialog.value = false
  } catch (e: any) {
    toast.error(e.message)
  }
}
const handleKickMember = async () => {
    if (!selectedMember.value) return
    if (!confirm('Are you sure you want to kick this member?')) return
    
    try {
        await request.post('/group/kick', {
            group_id: activeChat.value.id,
            user_id: selectedMember.value.user_id
        })
        toast.success('Member kicked')
        showMemberDialog.value = false
        fetchGroupDetails()
    } catch (e: any) {
        toast.error(e.message)
    }
}

const handleQuitGroup = async () => {
    try {
        await request.post('/group/quit', {
            group_id: activeChat.value.id
        })
        toast.success('Left group successfully')
        showQuitDialog.value = false
        chatStore.activeChatId = null
        chatStore.fetchConversations()
    } catch (e: any) {
        toast.error(e.message)
    }
}

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
    const res: any = await request.post('/media/upload', {
        filename: file.name,
        type: 'chat'
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
    const mediaType = isImage ? 2 : 3
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
    
    chatStore.sendMediaMessage(file_url, activeChat.value?.type === 'group' ? 3 : 2, chatStore.activeChatId, mediaType)
    
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
          <span class="text-xs text-muted-foreground" v-else>
            @{{ activeChat.username || activeChat.name }}
          </span>
        </div>
      </div>

      <div v-if="activeChat.type === 'group'" class="flex items-center">
        <Popover>
          <PopoverTrigger as-child>
            <div class="flex items-center cursor-pointer hover:opacity-80 transition-opacity p-1 rounded-md hover:bg-muted/50" @click="fetchGroupDetails">
              <div class="flex -space-x-2 mr-2">
                <Avatar v-for="member in groupMembers.slice(0, 3)" :key="member.user_id" class="border-2 border-background w-8 h-8">
                  <AvatarImage :src="member.avatar" />
                  <AvatarFallback>{{ member.nickname ? member.nickname.slice(0, 2).toUpperCase() : '??' }}</AvatarFallback>
                </Avatar>
              </div>
              <div class="bg-secondary text-secondary-foreground rounded-full p-1.5 w-8 h-8 flex items-center justify-center shadow-sm">
                <Plus class="w-4 h-4" />
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent class="w-80" align="end">
            <div class="flex flex-col items-center gap-4 py-2">
              <div class="relative group w-full flex flex-col items-center">
                 <div v-if="currentUserRole <= 2" class="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" class="h-6 w-6" @click="isEditingGroup = !isEditingGroup">
                        <Edit2 class="w-3 h-3" />
                    </Button>
                 </div>
                 
                 <div v-if="isEditingGroup" class="w-full flex flex-col gap-2">
                    <div class="flex flex-col gap-1">
                        <Label class="text-xs">Icon</Label>
                        <div class="flex items-center gap-2">
                            <Avatar class="h-8 w-8 shrink-0">
                                <AvatarImage :src="editGroupForm.icon" />
                                <AvatarFallback>?</AvatarFallback>
                            </Avatar>
                            <Input type="file" accept="image/*" class="h-8 text-xs file:text-xs" @change="handleGroupIconUpload" />
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <Label class="text-xs">Name</Label>
                        <Input v-model="editGroupForm.name" class="h-7 text-xs" placeholder="Group Name" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <Label class="text-xs">Description</Label>
                        <Input v-model="editGroupForm.desc" class="h-7 text-xs" placeholder="Description" />
                    </div>
                    <div class="flex justify-end gap-2 mt-2">
                        <Button size="sm" variant="outline" class="h-7 text-xs" @click="isEditingGroup = false">Cancel</Button>
                        <Button size="sm" class="h-7 text-xs" @click="handleUpdateGroup">Save</Button>
                    </div>
                 </div>

                 <div v-else class="flex flex-col items-center w-full">
                    <Avatar class="w-20 h-20 border-4 border-background shadow-sm">
                        <AvatarImage :src="groupDetail?.icon || activeChat.avatar" />
                        <AvatarFallback class="text-2xl">{{ activeChat.name ? activeChat.name.slice(0, 2).toUpperCase() : '??' }}</AvatarFallback>
                    </Avatar>
                    <div class="text-center w-full mt-2 relative group">
                        <div v-if="currentUserRole > 2" class="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" class="h-5 w-5" @click="openSelfMemberDialog">
                                <Edit2 class="w-3 h-3" />
                            </Button>
                        </div>
                        <h3 class="font-bold text-lg truncate px-2">{{ groupDetail?.name || activeChat.name }}</h3>
                        <p class="text-xs text-muted-foreground px-4 truncate">{{ groupDetail?.desc || 'No description' }}</p>
                        <div class="flex items-center justify-center gap-2 mt-1">
                        <span class="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono">
                            Code: {{ groupDetail?.code || '...' }}
                        </span>
                        </div>
                    </div>
                 </div>
              </div>
              
              <div class="w-full mt-2">
                <div class="flex items-center justify-between mb-2 px-1">
                  <h4 class="text-sm font-medium">Members</h4>
                  <span class="text-xs text-muted-foreground">{{ groupMembers.length }}</span>
                </div>
                <ScrollArea class="h-64 w-full rounded-md border bg-muted/20 p-3">
                  <div class="grid grid-cols-4 gap-3">
                    <div 
                        v-for="member in groupMembers" 
                        :key="member.user_id" 
                        class="flex flex-col items-center gap-1 group cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors"
                        @click="openMemberDialog(member)"
                    >
                      <div class="relative">
                        <Avatar class="w-10 h-10 border border-border group-hover:border-primary transition-colors">
                          <AvatarImage :src="member.avatar" />
                          <AvatarFallback class="text-[10px]">{{ member.nickname ? member.nickname.slice(0, 2).toUpperCase() : '??' }}</AvatarFallback>
                        </Avatar>
                        <div v-if="member.role === 1" class="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                            <Crown class="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        </div>
                        <div v-else-if="member.role === 2" class="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                            <User class="w-3 h-3 text-blue-500 fill-blue-500" />
                        </div>
                      </div>
                      <span class="text-[10px] truncate w-full text-center text-muted-foreground group-hover:text-foreground transition-colors">
                        {{ member.nickname }}
                      </span>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              <div class="w-full border-t pt-2 mt-2">
                  <Button variant="destructive" class="w-full h-8 text-xs" @click="showQuitDialog = true">
                      <LogOut class="w-3 h-3 mr-2" />
                      Quit Group
                  </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
    
    <ScrollArea class="flex-1 p-4" ref="scrollAreaRef">
      <div class="flex flex-col gap-4 pb-4">
        <MessageBubble 
          v-for="(msg, index) in messages" 
          :key="index" 
          :message="msg" 
          :is-me="String(msg.from_id) === String(userStore.userInfo?.id) || msg.from_id === 'me'" 
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

  <!-- Member Action Dialog -->
  <Dialog v-model:open="showMemberDialog">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Member Info</DialogTitle>
      </DialogHeader>
      <div class="flex flex-col gap-4 py-4" v-if="selectedMember">
        <div class="flex items-center gap-4">
            <Avatar class="h-16 w-16">
                <AvatarImage :src="selectedMember.avatar" />
                <AvatarFallback>{{ selectedMember.nickname?.slice(0, 2) }}</AvatarFallback>
            </Avatar>
            <div>
                <h4 class="font-semibold">{{ selectedMember.nickname }}</h4>
                <p class="text-sm text-muted-foreground">@{{ selectedMember.username }}</p>
                <!-- Email removed -->
                <div class="mt-1">
                    <span v-if="selectedMember.role === 1" class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded flex items-center gap-1 w-fit"><Crown class="w-3 h-3" /> Owner</span>
                    <span v-else-if="selectedMember.role === 2" class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded flex items-center gap-1 w-fit"><User class="w-3 h-3" /> Admin</span>
                    <span v-else class="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">Member</span>
                </div>
            </div>
            <div class="ml-auto" v-if="String(selectedMember.user_id) !== String(userStore.userInfo?.id) && !selectedMember.is_friend">
                 <Button size="icon" variant="ghost" title="Add Friend" @click="handleAddFriend">
                     <UserPlus class="w-5 h-5" />
                 </Button>
            </div>
        </div>

        <div class="grid gap-2">
            <Label>Nickname in Group</Label>
            <div class="flex gap-2">
                <Input v-model="memberNickname" :disabled="currentUserRole > 2 && String(selectedMember.user_id) !== String(userStore.userInfo?.id)" />
                <Button 
                    size="icon" 
                    variant="ghost" 
                    v-if="currentUserRole <= 2 || String(selectedMember.user_id) === String(userStore.userInfo?.id)"
                    @click="handleUpdateMember"
                >
                    <Save class="w-4 h-4" />
                </Button>
            </div>
        </div>

        <div class="flex flex-col gap-2 mt-2" v-if="currentUserRole === 1 && String(selectedMember.user_id) !== String(userStore.userInfo?.id)">
             <Label>Role Management</Label>
             <div class="flex gap-2">
                 <Button 
                    v-if="selectedMember.role === 3" 
                    variant="outline" 
                    class="flex-1"
                    @click="handleUpdateRole(2)"
                >
                    <Shield class="w-4 h-4 mr-2" />
                    Promote to Admin
                 </Button>
                 <Button 
                    v-if="selectedMember.role === 2" 
                    variant="outline" 
                    class="flex-1"
                    @click="handleUpdateRole(3)"
                >
                    <ShieldOff class="w-4 h-4 mr-2" />
                    Demote to Member
                 </Button>
             </div>
        </div>

        <div class="border-t pt-4 mt-2" v-if="currentUserRole <= 2 && currentUserRole < selectedMember.role">
            <Button variant="destructive" class="w-full" @click="handleKickMember">
                <UserX class="w-4 h-4 mr-2" />
                Kick Member
            </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Quit Group Confirmation -->
  <Dialog v-model:open="showQuitDialog">
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Quit Group</DialogTitle>
            <DialogDescription>
                Are you sure you want to quit this group? You will no longer receive messages from this group.
            </DialogDescription>
        </DialogHeader>
        <DialogFooter>
            <Button variant="outline" @click="showQuitDialog = false">Cancel</Button>
            <Button variant="destructive" @click="handleQuitGroup">Quit Group</Button>
        </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
