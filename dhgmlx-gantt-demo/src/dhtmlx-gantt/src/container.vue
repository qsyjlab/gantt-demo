<template>
  <div style="height: 100%" ref="ganttContainer"></div>
</template>

<script lang="ts">
import { gantt } from "dhtmlx-gantt";

import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import { defineComponent } from "vue";
gantt.i18n.setLocale("cn");

export default defineComponent({
  props: {
    tasks: {
      type: Object,
      default() {
        return { data: [], links: [] };
      },
    },
  },

  mounted: function () {
    gantt.config.date_format = "%Y-%m-%d";

    gantt.init(this.$refs.ganttContainer);
    gantt.parse(this.$props.tasks);
  },
})
</script>

<style></style>
