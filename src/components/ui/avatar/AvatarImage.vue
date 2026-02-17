<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { AvatarImageProps } from "reka-ui"
import { AvatarImage } from "reka-ui"
import { loadImage } from '@/utils/oss'

const props = defineProps<AvatarImageProps>()
const finalSrc = ref('')

watchEffect(async () => {
  if (!props.src) {
    finalSrc.value = ''
    return
  }

  const cachedUrl = await loadImage(props.src)
  finalSrc.value = cachedUrl || props.src || ''
})
</script>

<template>
  <AvatarImage v-bind="props" :src="finalSrc" class="h-full w-full object-cover">
    <slot />
  </AvatarImage>
</template>
