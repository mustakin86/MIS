<template>
  <div class="dashboard-root" :class="{ 'sidebar-collapsed': isCollapsed, 'sidebar-open': isMobileOpen }">
    <!-- Backdrop for mobile -->
    <div class="sidebar-backdrop" @click="isMobileOpen = false"></div>

    <!-- Sidebar Component -->
    <Sidebar :currentNav="currentNav" @update:currentNav="currentNav = $event" :user="userProfile" />

    <!-- Layout Wrapper -->
    <div class="layout-wrapper">
      <!-- Header Component -->
      <Header 
        v-model:searchQuery="searchQuery" 
        :isSyncing="isSyncing" 
        @toggle-sidebar="toggleSidebar" 
        @sync="syncMetrics" 
      />

      <!-- Main Content Area -->
      <main class="main-content">
        <div class="container-fluid px-0">
          <!-- CRITICAL: This is where Vue Router renders child components like UserManagement -->
          <router-view />
        </div>
      </main>

      <!-- Footer Component -->
      <Footer :statusMessage="syncStatus" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Sidebar from '@/components/layout/side_bar.vue';
import Header from '@/components/layout/header.vue';
import Footer from '@/components/layout/footer.vue';

const isCollapsed = ref(false);
const isMobileOpen = ref(false);
const currentNav = ref('Dashboard');
const searchQuery = ref('');
const isSyncing = ref(false);
const syncStatus = ref('Status: Synchronized');

const userProfile = ref({ name: 'Jane Doe', email: 'jane@example.com' });

const toggleSidebar = () => {
  if (window.innerWidth <= 768) {
    isMobileOpen.value = !isMobileOpen.value;
  } else {
    isCollapsed.value = !isCollapsed.value;
  }
};

const syncMetrics = () => {
  isSyncing.value = true;
  setTimeout(() => {
    isSyncing.value = false;
    syncStatus.value = `Status: Operational (Synced ${new Date().toLocaleTimeString()})`;
  }, 600);
};
</script>

<style scoped>
.dashboard-root { background-color: #f8fafc; min-height: 100vh; overflow: hidden; }
.layout-wrapper { margin-left: 220px; height: 100vh; display: flex; flex-direction: column; }
.main-content { flex: 1; overflow-y: auto; margin-top: 52px; margin-bottom: 40px; padding: 1.25rem; position: relative; }
.sidebar-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.4); z-index: 1040; opacity: 0; visibility: hidden; transition: 0.25s; }
/* Inside Dashboard.vue <style scoped> */
.layout-wrapper { 
  margin-left: 220px; 
  min-height: 100vh; /* Changed from height: 100vh */
  display: flex; 
  flex-direction: column; 
}
.main-content { 
  flex: 1; 
  overflow-y: visible; /* Changed from overflow-y: auto */
  margin-top: 52px; 
  margin-bottom: 40px; 
  padding: 1.25rem; 
  position: relative; 
}

@media (max-width: 768px) {
  .layout-wrapper { margin-left: 0 !important; width: 100% !important; }
  .dashboard-root.sidebar-open .sidebar-backdrop { opacity: 1; visibility: visible; }
}

</style>