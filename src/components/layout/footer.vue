<template>
  <footer class="bottom-footer px-3 d-flex align-items-center justify-content-between small text-muted">
    <span>© 2026 GMIS Platform. All rights reserved.</span>
    <span>{{ statusMessage }}</span>
  </footer>
</template>

<script setup>
defineProps({
  statusMessage: String
});
</script>

<style scoped>
.bottom-footer {
  position: fixed;
  bottom: 0;
  right: 0;
  width: calc(100% - 220px);
  height: 40px;
  z-index: 1030;
  background-color: #ffffff;
  border-top: 1px solid #e2e8f0;
}
</style>