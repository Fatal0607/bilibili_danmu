import { createRouter,createWebHashHistory } from 'vue-router';

import Home from '../views/home.vue';

import Danmu from '../views/danmu_window.vue'

export default createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            component: Home
        },
        {
            path: '/danmu',
            component: Danmu
        }
    ]
})
