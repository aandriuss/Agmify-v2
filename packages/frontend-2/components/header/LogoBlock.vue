<template>
  <Component
    :is="mainComponent"
    class="flex items-center shrink-0"
    :to="to"
    :target="target"
  >
    <img class="h-8 w-8 block mr-1" :src="logoSrc" alt="Agmify" />

    <div
      v-if="!minimal"
      class="text-sm mt-0 font-medium"
      :class="showTextOnMobile ? '' : 'hidden md:flex'"
    >
      Agmify
    </div>
  </Component>
</template>
<script setup lang="ts">
import { useTheme } from '~~/lib/core/composables/theme'
import agmifyLogoDark from '~/assets/images/agmify_logo_big_w.png'
import agmifyLogoLight from '~/assets/images/agmify_logo_big.png'

const props = withDefaults(
  defineProps<{
    minimal?: boolean
    to?: string
    showTextOnMobile?: boolean
    target?: string
    noLink?: boolean
  }>(),
  {
    to: '/'
  }
)

const { isDarkTheme } = useTheme()
const NuxtLink = resolveComponent('NuxtLink')
const mainComponent = computed(() => (props.noLink ? 'div' : NuxtLink))

const logoSrc = computed(() => {
  return isDarkTheme.value ? agmifyLogoDark : agmifyLogoLight
})
</script>
