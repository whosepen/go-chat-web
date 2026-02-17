<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label/index'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'vue-sonner'
import request from '@/utils/request'
import axios from 'axios'
import { AlertCircle, Loader2 } from 'lucide-vue-next'

const userStore = useUserStore()
const loading = ref(false)
const errorMessage = ref('')

const form = ref({
  nickname: '',
  email: '',
  phone: '',
  avatar: ''
})

const passwordForm = ref({
  old_password: '',
  new_password: '',
  confirm_password: ''
})

onMounted(() => {
  if (userStore.userInfo) {
    form.value = {
      nickname: userStore.userInfo.nickname || '',
      email: userStore.userInfo.email || '',
      phone: userStore.userInfo.phone || '',
      avatar: userStore.userInfo.avatar || ''
    }
  }
})

const handleAvatarUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const res: any = await request.post('/media/upload', {
      filename: file.name,
      type: 'avatar'
    }, { silent: true })
    
    const { put_url, file_url } = res
    
    await axios.put(put_url, file, {
      headers: { 'Content-Type': file.type || 'application/octet-stream' }
    })
    
    form.value.avatar = file_url
    toast.success('Avatar uploaded')
  } catch (e: any) {
    toast.error('Avatar upload failed: ' + e.message)
  }
}

const handleUpdateProfile = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    await request.post('/user/info/update', form.value, { silent: true })
    toast.success('Profile updated')
    await userStore.fetchUserInfo()
  } catch (e: any) {
    errorMessage.value = e.message
  } finally {
    loading.value = false
  }
}

const handleUpdatePassword = async () => {
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    errorMessage.value = 'New passwords do not match'
    return
  }
  
  loading.value = true
  errorMessage.value = ''
  try {
    await request.post('/user/password/update', {
      old_password: passwordForm.value.old_password,
      new_password: passwordForm.value.new_password
    }, { silent: true })
    toast.success('Password updated')
    passwordForm.value = { old_password: '', new_password: '', confirm_password: '' }
  } catch (e: any) {
    errorMessage.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex h-full w-full flex-col p-6 overflow-y-auto">
    <h1 class="text-2xl font-bold mb-6">Settings</h1>
    
    <div class="max-w-2xl w-full space-y-6">
      <div v-if="errorMessage" class="mb-4">
        <Alert variant="destructive">
          <AlertCircle class="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {{ errorMessage }}
          </AlertDescription>
        </Alert>
      </div>

      <!-- Profile Settings -->
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center gap-4">
            <Avatar class="h-20 w-20">
              <AvatarImage :src="form.avatar" />
              <AvatarFallback>{{ form.nickname?.slice(0, 2).toUpperCase() }}</AvatarFallback>
            </Avatar>
            <div class="grid w-full max-w-sm items-center gap-1.5">
              <Label for="avatar">Avatar</Label>
              <Input id="avatar" type="file" accept="image/*" @change="handleAvatarUpload" />
            </div>
          </div>
          
          <div class="grid gap-2">
            <Label for="nickname">Nickname</Label>
            <Input id="nickname" v-model="form.nickname" />
          </div>
          
          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input id="email" v-model="form.email" type="email" />
          </div>
          
          <div class="grid gap-2">
            <Label for="phone">Phone</Label>
            <Input id="phone" v-model="form.phone" />
          </div>
        </CardContent>
        <CardFooter>
          <Button @click="handleUpdateProfile" :disabled="loading">
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            Save Changes
          </Button>
        </CardFooter>
      </Card>

      <!-- Password Settings -->
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-2">
            <Label for="old_password">Current Password</Label>
            <Input id="old_password" type="password" v-model="passwordForm.old_password" />
          </div>
          
          <div class="grid gap-2">
            <Label for="new_password">New Password</Label>
            <Input id="new_password" type="password" v-model="passwordForm.new_password" />
          </div>
          
          <div class="grid gap-2">
            <Label for="confirm_password">Confirm New Password</Label>
            <Input id="confirm_password" type="password" v-model="passwordForm.confirm_password" />
          </div>
        </CardContent>
        <CardFooter>
          <Button @click="handleUpdatePassword" :disabled="loading">
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            Update Password
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
