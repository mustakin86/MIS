// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './Router/index.js';

export const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbwF3VOrJGQUQx8HozZQH6g63pAsnSXWbYw085H0Eq7INj90Vj5Q_K61hlAeTrVsXYHn/exec';

const app = createApp(App)

app.config.globalProperties.$deployedUrl = DEPLOYED_URL;

app.use(router)
app.mount('#app')