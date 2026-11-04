import { createRouter, createWebHistory } from 'vue-router';
import DashboardLayout from '@/components/layout/Dashboard.vue';
import Dashboard from '@/views/Dashboard.vue';

const routes = [
  {
    path: '/',
    component: DashboardLayout, // This renders your Sidebar + Header + Layout wrapper
    children: [
      {
        path: '', // This loads Dashboard.vue inside the layout's <RouterView /> at root '/'
        name: 'Dashboard',
        component: Dashboard
      },
      {
        path: '/item_list',
        name: 'ItemList',
        component: () => import('@/views/Library/item_list.vue')
      },
      {
        path: '/machine_list',
        name: 'MachineList',
        component: () => import('@/views/Library/machine_list.vue')
      },
      {
        path: '/user',
        name: 'UserList',
        component: () => import('@/views/User/user.vue')
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;