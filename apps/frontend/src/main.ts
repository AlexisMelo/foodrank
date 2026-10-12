import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { authGuard } from './composables/useAuth'

const app = createApp(App)

router.beforeEach(authGuard)
app.use(router)

app.mount('#app')
