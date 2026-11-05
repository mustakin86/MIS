<template>
  <div class="app-layout">
    <!-- Sidebar Component -->
    <Sidebar :is-collapsed="!isSidebarOpen" />

    <!-- Wrapper for Header and Main Content -->
    <div class="wrapper" :class="{ 'wrapper-expanded': !isSidebarOpen }">
      <!-- Header Component -->
      <Header 
        @toggle-sidebar="toggleSidebar" 
        v-model:searchQuery="searchQuery" 
        @sync="handleSync" 
        :is-syncing="isSyncing"
        :is-sidebar-collapsed="!isSidebarOpen"
      />

      <!-- Main Content Area -->
      <main class="main-content">
        <div class="p-1">
          <RouterView /> 
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Sidebar from '@/components/layout/side_bar.vue';
import Header from '@/components/layout/header.vue';

const isSidebarOpen = ref(true);
const searchQuery = ref('');
const isSyncing = ref(false);

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const handleSync = () => {
  isSyncing.value = true;
  setTimeout(() => {
    isSyncing.value = false;
  }, 2000);
};
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Right-side container handling header and main view */
.wrapper {
  margin-left: 240px; /* Matches sidebar width */
  width: calc(100% - 240px);
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: margin-left 0.3s ease, width 0.3s ease;
}

.wrapper.wrapper-expanded {
  margin-left: 0;
  width: 100%;
}

/* Push content down so it doesn't hide behind the fixed header */
.main-content {
  margin-top:5px; 
  flex: 1;
  overflow-y: auto;
  background-color: #f8fafc;
}
</style>