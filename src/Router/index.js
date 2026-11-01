// src/router/index.js
import { createMemoryHistory, createRouter } from 'vue-router'
import UserManagement from '@/components/User/user.vue'
import Dashboard from '@/views/Dashboard.vue' // Optional: your dashboard view

const routes = [
  { 
    path: '/', 
    name: 'Dashboard', 
    component: Dashboard 
  },
  { 
    path: '/users', 
    name: 'Users', 
    component: UserManagement 
  },
]

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
})