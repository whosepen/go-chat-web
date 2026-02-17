<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const props = defineProps<{
  message: any
  isMe: boolean
}>()

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
          <img :src="message.content" class="max-w-full rounded-md cursor-pointer" loading="lazy" />
        </div>
        <div v-else-if="isVideo">
          <video :src="message.content" controls class="max-w-full rounded-md"></video>
        </div>
        <div v-else>
          {{ message.content }}
        </div>
      </div>
    </div>
  </div>
</template>
