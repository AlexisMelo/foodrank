import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomeView },
    { path: '/profile', component: () => import('@/views/ProfileView.vue') },
    { path: '/explore', component: () => import('@/views/ExploreView.vue') },
    { path: '/restaurant/:id', component: () => import('@/views/RestaurantView.vue') },
    { path: '/user/:id', component: () => import('@/views/ProfileView.vue') },
    { path: '/tierlists', component: () => import('@/views/TierlistsView.vue') },
    { path: '/tierlists/:id', component: () => import('@/views/TierlistDetailView.vue') },
    { path: '/search', component: () => import('@/views/SearchResultsView.vue') },
    { path: '/review/:id', component: () => import('@/views/NewReviewView.vue') },
  ],
})

export default router
