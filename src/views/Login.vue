<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'vue-sonner'
import { AlertCircle } from 'lucide-vue-next'

const isLogin = ref(true)
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const router = useRouter()
const userStore = useUserStore()

const handleSubmit = async () => {
  errorMessage.value = ''
  
  if (!username.value || !password.value) {
    errorMessage.value = 'Please enter username and password'
    return
  }
  
  if (!isLogin.value) {
    if (password.value !== confirmPassword.value) {
      errorMessage.value = 'Passwords do not match'
      return
    }
    if (!email.value) {
      errorMessage.value = 'Please enter email'
      return
    }
  }

  loading.value = true
  try {
    if (isLogin.value) {
      // Pass silent: true to request to avoid toast, we will show Alert
      await userStore.login({ username: username.value, password: password.value }, { silent: true })
      toast.success('Login Successful')
      router.push('/')
    } else {
      await userStore.register({ username: username.value, password: password.value, email: email.value }, { silent: true })
      toast.success('Registration Successful. Please Login.')
      isLogin.value = true
      password.value = ''
      confirmPassword.value = ''
      email.value = ''
    }
  } catch (error: any) {
    // Show error in Alert
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <Card class="w-[350px]">
      <CardHeader>
        <CardTitle>{{ isLogin ? 'Login to GoChat' : 'Register for GoChat' }}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <Alert variant="destructive" v-if="errorMessage">
          <AlertCircle class="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {{ errorMessage }}
          </AlertDescription>
        </Alert>

        <Input v-model="username" placeholder="Username" />
        <Input v-model="password" type="password" placeholder="Password" @keyup.enter="handleSubmit" />
        <template v-if="!isLogin">
          <Input 
            v-model="confirmPassword" 
            type="password" 
            placeholder="Confirm Password" 
            @keyup.enter="handleSubmit" 
          />
          <Input 
            v-model="email" 
            type="email" 
            placeholder="Email" 
            @keyup.enter="handleSubmit" 
          />
        </template>
      </CardContent>
      <CardFooter class="flex flex-col gap-2">
        <Button class="w-full" @click="handleSubmit" :disabled="loading">
          {{ loading ? (isLogin ? 'Logging in...' : 'Registering...') : (isLogin ? 'Login' : 'Register') }}
        </Button>
        <div class="text-sm text-center">
          <span class="text-muted-foreground">
            {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
          </span>
          <Button variant="link" class="p-0 h-auto ml-1" @click="isLogin = !isLogin; errorMessage = ''">
            {{ isLogin ? 'Register' : 'Login' }}
          </Button>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>
