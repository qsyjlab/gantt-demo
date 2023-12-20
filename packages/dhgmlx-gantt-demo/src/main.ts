import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus'
import '@/dhtmlx-gantt/src/style.css';

createApp(App).use(ElementPlus).mount('#app')
