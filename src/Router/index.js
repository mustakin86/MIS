import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '../components/User/user.vue'

// Basic placeholder for AboutView if not created yet
const AboutView = { template: '<div><h2>About Page</h2></div>' }

const routes = [
  { path: '/', component: HomeView },
  { path: '/about', component: AboutView },
]

export const router = createRouter({
  history: createMemoryHistory(), // Ideal for Google Apps Script execution context
  routes,
})