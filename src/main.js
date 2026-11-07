// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './Router/index.js';

export const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbyZD8guhpja-w6bBHMwIM9TmjCZnspvw32k7OyP_TvbNfJHPsoXjvUhiYvedbZdSw8t9A/exec';

const app = createApp(App)

app.config.globalProperties.$deployedUrl = DEPLOYED_URL;

app.use(router)
app.mount('#app')