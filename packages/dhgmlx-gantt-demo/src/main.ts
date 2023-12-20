import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/theme-chalk/index.css';
import '@/dhtmlx-gantt/src/style.css';

createApp(App).use(ElementPlus).mount('#app')
