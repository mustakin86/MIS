<template>
  <header class="top-header px-3 d-flex align-items-center justify-content-between" :class="{ 'header-expanded': isSidebarCollapsed }">
    <div class="d-flex align-items-center gap-3">
      <!-- Hamburger Toggle Button -->
      <button class="btn btn-light btn-sm border-0 shadow-sm px-2" @click="$emit('toggle-sidebar')" title="Toggle Navigation">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      
      <!-- Search Input -->
      <div class="position-relative d-none d-sm-block" style="width: 220px;">
        <input 
          type="search" 
          :value="searchQuery" 
          @input="$emit('update:searchQuery', $event.target.value)" 
          class="form-control form-control-sm ps-4 bg-light border-0" 
          placeholder="Search system..."
        >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" x2="16.65" y1="21" y2="16.65"/>
        </svg>
      </div>
    </div>

    <!-- Sync Button -->
    <div class="d-flex align-items-center gap-2">
      <button class="btn btn-primary btn-sm d-flex align-items-center gap-2 shadow-sm px-3" @click="$emit('sync')" :disabled="isSyncing">
        <svg :class="{ 'spin': isSyncing }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
          <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"/>
        </svg>
        <span class="d-none d-sm-inline fw-semibold" style="font-size: 0.8125rem;">Sync Metrics</span>
      </button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  searchQuery: String,
  isSyncing: Boolean,
  isSidebarCollapsed: Boolean
});

defineEmits(['toggle-sidebar', 'update:searchQuery', 'sync']);
</script>

<style scoped>
.top-header {
  position: fixed;
  top: 0;
  right: 0;
  width: calc(100% - 240px);
  height: 52px;
  z-index: 1030;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e2e8f0;
  transition: width 0.3s ease;
}

.top-header.header-expanded {
  width: 100%;
}

@keyframes spin { 
  0% { transform: rotate(0deg); } 
  100% { transform: rotate(360deg); } 
}
.spin { animation: spin 0.6s linear infinite; }
</style>