import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './Router/index' // 1. Import router

const app = createApp(App)

app.use(router) // 2. Mount router instance to Vue app
app.mount('#app')