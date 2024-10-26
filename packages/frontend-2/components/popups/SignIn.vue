<template>
  <AuthLoginPanel
    v-model:open="showDialog"
    dialog-mode
    max-width="sm"
    subtitle="Create account to keep using Agmify!"
  />
</template>
<script setup lang="ts">
const route = useRoute()

const showDialogBase = ref(false)

const showDialog = computed({
  get: () => showDialogBase.value,
  set: (newVal) => {
    if (newVal && route.fullPath.startsWith('/error')) {
      return
    }

    showDialogBase.value = newVal
  }
})
</script>
