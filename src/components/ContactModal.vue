<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'vue-sonner'
import request from '@/utils/request'
import { Search, AlertCircle } from 'lucide-vue-next'

const open = ref(false)
const activeTab = ref('friend')
const errorMessage = ref('')

// Add Friend State
const friendUsername = ref('')
const friendSearchResult = ref<any>(null)
const friendRemark = ref('')

// Join Group State
const groupCode = ref('')
const groupSearchResult = ref<any>(null)
const groupRemark = ref('')

// Create Group State
const createGroupName = ref('')

const handleSearchFriend = async () => {
  errorMessage.value = ''
  if (!friendUsername.value) return
  try {
    const res = await request.get('/user/search', { params: { username: friendUsername.value }, silent: true })
    friendSearchResult.value = res
  } catch (e: any) {
    friendSearchResult.value = null
    errorMessage.value = e.message || 'User not found'
  }
}

const handleAddFriend = async () => {
  errorMessage.value = ''
  if (!friendSearchResult.value) return
  try {
    await request.post('/friend/request', { 
      target_id: friendSearchResult.value.id, 
      remark: friendRemark.value || 'Hello' 
    }, { silent: true })
    toast.success('Friend request sent')
    open.value = false
    resetForms()
  } catch (e: any) {
    errorMessage.value = e.message
  }
}

const handleSearchGroup = async () => {
  errorMessage.value = ''
  if (!groupCode.value) return
  try {
    const res = await request.get('/group/search', { params: { group_code: groupCode.value }, silent: true })
    groupSearchResult.value = res
  } catch (e: any) {
    groupSearchResult.value = null
    errorMessage.value = e.message || 'Group not found'
  }
}

const handleJoinGroup = async () => {
  errorMessage.value = ''
  if (!groupSearchResult.value) return
  try {
    await request.post('/group/join', { 
      group_id: groupSearchResult.value.id, 
      remark: groupRemark.value || 'Hello' 
    }, { silent: true })
    toast.success('Join request sent')
    open.value = false
    resetForms()
  } catch (e: any) {
    errorMessage.value = e.message
  }
}

const handleCreateGroup = async () => {
  errorMessage.value = ''
  if (!createGroupName.value) return
  try {
    await request.post('/group/create', { name: createGroupName.value }, { silent: true })
    toast.success('Group created')
    open.value = false
    resetForms()
  } catch (e: any) {
    errorMessage.value = e.message
  }
}

const resetForms = () => {
  friendUsername.value = ''
  friendSearchResult.value = null
  friendRemark.value = ''
  groupCode.value = ''
  groupSearchResult.value = null
  groupRemark.value = ''
  createGroupName.value = ''
  errorMessage.value = ''
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Contacts & Groups</DialogTitle>
      </DialogHeader>
      
      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="friend">Add Friend</TabsTrigger>
          <TabsTrigger value="join-group">Join Group</TabsTrigger>
          <TabsTrigger value="create-group">Create Group</TabsTrigger>
        </TabsList>
        
        <div class="py-2" v-if="errorMessage">
          <Alert variant="destructive">
            <AlertCircle class="w-4 h-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {{ errorMessage }}
            </AlertDescription>
          </Alert>
        </div>

        <!-- Add Friend Tab -->
        <TabsContent value="friend" class="space-y-4 py-4">
          <div class="flex gap-2">
            <Input v-model="friendUsername" placeholder="Username" @keyup.enter="handleSearchFriend" />
            <Button size="icon" @click="handleSearchFriend">
              <Search class="h-4 w-4" />
            </Button>
          </div>
          
          <div v-if="friendSearchResult" class="border rounded-lg p-3 space-y-3">
            <div class="flex items-center gap-3">
              <img :src="friendSearchResult.avatar || 'https://github.com/shadcn.png'" class="h-10 w-10 rounded-full" />
              <div>
                <div class="font-medium">{{ friendSearchResult.nickname || friendSearchResult.username }}</div>
              </div>
            </div>
            <Input v-model="friendRemark" placeholder="Remark (Optional)" />
            <Button class="w-full" @click="handleAddFriend">Send Request</Button>
          </div>
        </TabsContent>

        <!-- Join Group Tab -->
        <TabsContent value="join-group" class="space-y-4 py-4">
          <div class="flex gap-2">
            <Input v-model="groupCode" placeholder="Group Code" @keyup.enter="handleSearchGroup" />
            <Button size="icon" @click="handleSearchGroup">
              <Search class="h-4 w-4" />
            </Button>
          </div>
          
          <div v-if="groupSearchResult" class="border rounded-lg p-3 space-y-3">
            <div class="flex items-center gap-3">
              <img :src="groupSearchResult.icon || 'https://github.com/shadcn.png'" class="h-10 w-10 rounded-full" />
              <div>
                <div class="font-medium">{{ groupSearchResult.name }}</div>
                <div class="text-xs text-muted-foreground">Members: {{ groupSearchResult.member_count }}</div>
              </div>
            </div>
            <Input v-model="groupRemark" placeholder="Remark (Optional)" />
            <Button class="w-full" @click="handleJoinGroup">Join Group</Button>
          </div>
        </TabsContent>

        <!-- Create Group Tab -->
        <TabsContent value="create-group" class="space-y-4 py-4">
          <Input v-model="createGroupName" placeholder="Group Name" />
          <Button class="w-full" @click="handleCreateGroup">Create Group</Button>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
