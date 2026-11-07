// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './Router/index.js';

// import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

const app = createApp(App)

app.use(router)
app.mount('#app')   