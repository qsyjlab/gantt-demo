<template>

  <gantt-elastic :tasks="tasks" :options="options" :dynamic-style="{}">
    <!-- <gantt-header slot="header"></gantt-header>
    <gantt-footer slot="footer"></gantt-footer> -->
  </gantt-elastic>
</template>
<script setup lang="ts">
// import GanttElastic from 'gantt-elastic/src/GantElastic.vue';
import GanttElastic from "gantt-elastic";
import { tasks, options } from "./gantt.config";

console.log('GanttElastic',GanttElastic);



</script>
<style scoped></style>
