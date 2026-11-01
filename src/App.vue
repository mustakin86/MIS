<!-- src/App.vue -->
<template>
  <div id="app">
    <!-- RouterView renders whichever view matches the current route (e.g. Dashboard, Users) -->
    <RouterView />
  </div>
</template>

<script setup>
// Root app component acts as the main entry point for Vue Router
</script>

<style>
/* Global resets or app-level utility styles can go here */
body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f8fafc;
}
</style>