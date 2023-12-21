<template>
  <el-dropdown @command="(...args) => $emit('command', ...args)">
    <div @click.stop>
      <div class="gantt_add" :style="{ width: '43px', height: '43px' }"></div>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="(menu, menuIndex) in menus"
          :key="menuIndex"
          :command="menu.key"
        >
          {{ menu.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
<script setup lang="ts">
import type { PropType } from "vue";

// 这里因为是借助 mount 渲染已经不是 app 根组件的实例了 所以全局组件失效必须引入
import { ElDropdownItem, ElDropdown, ElDropdownMenu } from "element-plus";

defineOptions({
  inheritAttrs: false,
});
defineProps({
  menus: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
});
</script>
<style scoped></style>
