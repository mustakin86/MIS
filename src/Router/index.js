// src/router/index.js
import { createWebHistory, createRouter } from 'vue-router'
import DashboardLayout from '@/views/Dashboard.vue' // Assumes this is your layout containing <router-view>


const routes = [
  { 
    path: '/', 
    component: DashboardLayout, // Parent layout with sidebar & header
    children: [
      {
        path: '', // Default child loaded at root '/'
        name: 'DashboardHome',
        component: () => import('@/views/Dashboard.vue') // Or your main dashboard stats component
      },
      { 
        path: '/user', // Renders at /user inside the dashboard layout
        name: 'Users', 
         component: () => import('@/components/User/user.vue')
      },
      { 
        path: '/Empolyee_Evaluation', // Renders at /user inside the dashboard layout
        name: 'Skill Test', 
        component: () => import('@/components/EmpolyeeEvaluation/Empolyee_Evaluation.vue')
      },
       { 
        path: '/item_list', // Renders at /user inside the dashboard layout
        name: 'Item', 
        component: () => import('@/components/Library/item_list.vue')
      },
       { 
        path: '/machine_list', // Renders at /user inside the dashboard layout
        name: 'machine', 
        component: () => import('@/components/Library/machine_list.vue')
      },
       { 
        path: '/add_smv', // Renders at /user inside the dashboard layout
        name: 'smv', 
        component: () => import('@/components/smv/add_smv.vue')
      }
    ]
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})