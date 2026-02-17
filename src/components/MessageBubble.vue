<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { loadImage, transformUrl } from '@/utils/oss'

const props = defineProps<{
  message: any
  isMe: boolean
}>()

const imageUrl = ref('')
const videoUrl = ref('')

onMounted(async () => {
  if (props.message.media === 2) {
    const cached = await loadImage(props.message.content)
    imageUrl.value = cached || transformUrl(props.message.content)
  } else if (props.message.media === 3) {
    // 视频也可以缓存，但考虑到大小，这里暂时只对视频封面或较小视频做处理，或者统一处理
    // 目前 loadImage 是通用的，只要是 OSS URL 都会尝试缓存
    const cached = await loadImage(props.message.content)
    videoUrl.value = cached || transformUrl(props.message.content)
  }
})

const handleImageError = async () => {
  // 重新尝试加载（会再次尝试缓存或下载）
  const newUrl = await loadImage(props.message.content)
  if (newUrl) {
    imageUrl.value = newUrl
  }
}

const time = computed(() => {
  // 后端返回的是 created_at (毫秒级时间戳) 或 send_time (本地消息也是毫秒)
  const timestamp = props.message.created_at || props.message.send_time
  if (!timestamp) return ''
  // 统一按毫秒处理，不再乘以 1000
  return format(new Date(timestamp), 'HH:mm')
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
