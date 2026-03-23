import { createRouter, createWebHistory } from 'vue-router'
import ProfileView from '@/views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: ProfileView },
    { path: '/restaurant/:id', component: () => import('@/views/RestaurantView.vue') },
    { path: '/user/:id', component: () => import('@/views/ProfileView.vue') },
  ],
})

export default router
