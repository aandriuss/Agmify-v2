<template>
  <div class="table-layout">
    <header class="table-header">
      <slot name="header" />
    </header>

    <div v-if="$slots.menu" class="table-menu">
      <slot name="menu" />
    </div>

    <main class="table-content">
      <slot />
    </main>

    <footer v-if="$slots.footer" class="table-footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<script setup lang="ts">
// Pure layout component - no props or logic needed
</script>

<style scoped>
.table-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--surface-card);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
  background-color: var(--surface-section);
}

.table-menu {
  border-bottom: 1px solid var(--surface-border);
  background-color: var(--surface-card);
  padding: 0.5rem 1rem;
  transition: all 0.2s ease;
}

.table-content {
  flex: 1;
  position: relative;
  overflow: auto;
  background-color: var(--surface-ground);
}

.table-footer {
  padding: 1rem;
  border-top: 1px solid var(--surface-border);
  background-color: var(--surface-section);
}
</style>
