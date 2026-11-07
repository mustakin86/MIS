import { createRouter, createWebHistory } from 'vue-router';
import DashboardLayout from '@/components/layout/applayout.vue';
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
      },
      {
        path: '/add_smv',
        name: 'AddSMV',
        component: () => import('@/views/smv/add_smv.vue')
      },
      {
        path: '/edit/:itemName?',
        name: 'EditSMV',
        component: () => import('@/views/smv/edit_smv.vue')
      },
      {
        path: '/smv_list',
        name: 'SMVList',
        component: () => import('@/views/smv/smv_list.vue')
      },
      {
        path: '/Empolyee_Evaluation',
        name: 'EmpolyeeEvaluation',
        component: () => import('@/views/EmpolyeeEvaluation/Empolyee_Evaluation.vue')
      },
        {
        path: '/add_ob',
        name: 'AddOB',
        component: () => import('@/views/operationBreakdown/add_ob.vue')
      },
        {
        path: '/ob_list',
        name: 'OBList',
        component: () => import('@/views/operationBreakdown/ob_list.vue')
      },  {
        path: '/edit_ob/:PO_No?',
        name: 'EditOB',
        component: () => import('@/views/operationBreakdown/edit_ob.vue')
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;