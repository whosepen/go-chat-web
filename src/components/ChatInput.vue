<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Paperclip, Send } from 'lucide-vue-next'

const emit = defineEmits(['send', 'upload'])

const content = ref('')

const handleSend = () => {
  if (!content.value.trim()) return
  emit('send', content.value)
  content.value = ''
}

const handleFile = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    emit('upload', target.files[0])
  }
}
</script>

<template>
  <div class="p-4 border-t bg-background flex items-end gap-2">
    <div class="relative">
      <input 
        type="file" 
        id="file-upload" 
        class="hidden" 
        @change="handleFile"
      />
      <Button variant="ghost" size="icon" as="label" for="file-upload" class="cursor-pointer">
        <Paperclip class="h-5 w-5" />
      </Button>
    </div>
    
    <Textarea 
      v-model="content" 
      placeholder="Type a message..." 
      class="min-h-[40px] max-h-[150px] resize-none flex-1"
      @keydown.enter.prevent="handleSend"
    />
    
    <Button size="icon" @click="handleSend">
      <Send class="h-5 w-5" />
    </Button>
  </div>
</template>
