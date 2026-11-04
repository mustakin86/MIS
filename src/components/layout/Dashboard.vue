<template>
  <div class="app-layout">
    <!-- Sidebar Component -->
    <Sidebar :is-collapsed="!isSidebarOpen" />

    <!-- Header Component -->
    <Header 
      @toggle-sidebar="toggleSidebar" 
      v-model:searchQuery="searchQuery" 
      @sync="handleSync" 
      :is-syncing="isSyncing"
      :is-sidebar-collapsed="!isSidebarOpen"
    />

    <!-- Main Content Area -->
    <main class="main-content" :class="{ 'content-expanded': !isSidebarOpen }">
      <div class="p-4">
        <!-- CRITICAL: This is required so child pages render inside the layout! -->
        <RouterView /> 
      </div>
    </main>
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
  // Simulate sync process
  setTimeout(() => {
    isSyncing.value = false;
  }, 2000);
};
</script>