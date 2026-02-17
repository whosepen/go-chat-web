<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { refreshDownloadUrl, transformUrl } from '@/utils/oss'

const props = defineProps<{
  message: any
  isMe: boolean
}>()

const imageUrl = ref('')
const videoUrl = ref('')

onMounted(async () => {
  if (props.message.media === 2) {
    // 优先获取带签名的 URL
    const signed = await refreshDownloadUrl(props.message.content)
    imageUrl.value = signed || transformUrl(props.message.content)
  } else if (props.message.media === 3) {
    const signed = await refreshDownloadUrl(props.message.content)
    videoUrl.value = signed || transformUrl(props.message.content)
  }
})

const handleImageError = async () => {
  // 如果之前获取签名失败或过期，重试一次
  const newUrl = await refreshDownloadUrl(props.message.content)
  if (newUrl) {
    imageUrl.value = newUrl
  }
}

const time = computed(() => {
  if (!props.message.send_time) return ''
  return format(new Date(props.message.send_time * 1000), 'HH:mm')
})

const isImage = computed(() => props.message.media === 2)
const isVideo = computed(() => props.message.media === 3)
</script>

<template>
  <div :class="cn('flex w-full gap-2 mb-4', isMe ? 'flex-row-reverse' : 'flex-row')">
    <Avatar class="h-8 w-8">
      <AvatarImage :src="message.avatar" />
      <AvatarFallback>{{ message.from_id?.toString().slice(0, 2) }}</AvatarFallback>
    </Avatar>
    
    <div :class="cn('flex flex-col max-w-[70%]', isMe ? 'items-end' : 'items-start')">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-muted-foreground">{{ message.nickname || message.from_id }}</span>
        <span class="text-xs text-muted-foreground">{{ time }}</span>
      </div>
      
      <div 
        :class="cn(
          'p-3 rounded-lg text-sm break-words',
          isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
        )"
      >
        <div v-if="isImage">
          <img :src="imageUrl" class="max-w-full rounded-md cursor-pointer" loading="lazy" @error="handleImageError" />
        </div>
        <div v-else-if="isVideo">
          <video :src="videoUrl" controls class="max-w-full rounded-md"></video>
        </div>
        <div v-else>
          {{ message.content }}
        </div>
      </div>
    </div>
  </div>
</template>
