<template>
  <div>
    <h1>Hello App!</h1>
    <p><strong>Current route path:</strong> {{ $route.fullPath }}</p>
    <nav>
      <RouterLink to="/">Go to Home</RouterLink>
      <RouterLink to="/about">Go to About</RouterLink>
    </nav>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script setup>
</script>

<style scoped>
nav {
  margin-bottom: 20px;
}
nav a {
  margin-right: 15px;
  text-decoration: none;
  color: #0073e6;
}
nav a.router-link-active {
  font-weight: bold;
  text-decoration: underline;
}
</style>