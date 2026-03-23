import { createRouter, createWebHistory } from 'vue-router'
import LeaderboardView from '@/views/LeaderboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: LeaderboardView },
    { path: '/restaurant/:id', component: () => import('@/views/RestaurantView.vue') },
    { path: '/user/:id', component: () => import('@/views/LeaderboardView.vue') },
  ],
})

export default router
