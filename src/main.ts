import './assets/css/main.css'

import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import b24UiPlugin from '@bitrix24/b24ui-nuxt/vue-plugin'

import App from './App.vue'
import DelayedMessagesApp from './components/DelayedMessagesApp.vue'

/**
 * Один экран без навигации между страницами; vue-router нужен как peer-зависимость
 * для @bitrix24/b24ui-nuxt (B24Header и др.). Hash-история — для открытия dist/index.html по file://
 */
const basePath = import.meta.env.BASE_URL || '/'
const router = createRouter({
  history: createWebHashHistory(basePath),
  routes: [{ path: '/', name: 'home', component: DelayedMessagesApp }]
})

const app = createApp(App)

app.use(router)
app.use(b24UiPlugin)

app.mount('#app')
