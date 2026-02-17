<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { AvatarImageProps } from "reka-ui"
import { AvatarImage } from "reka-ui"
import { transformUrl, refreshDownloadUrl } from '@/utils/oss'

const props = defineProps<AvatarImageProps>()
const finalSrc = ref('')

watchEffect(async () => {
  if (!props.src) {
    finalSrc.value = ''
    return
  }

  // 尝试获取带签名的 URL (如果是 OSS 资源)
  const signed = await refreshDownloadUrl(props.src)
  if (signed) {
    finalSrc.value = signed
  } else {
    // 如果获取签名失败或不是 OSS 资源，使用转换后的 URL
    finalSrc.value = transformUrl(props.src)
  }
})
</script>

<template>
  <AvatarImage v-bind="props" :src="finalSrc" class="h-full w-full object-cover">
    <slot />
  </AvatarImage>
</template>
