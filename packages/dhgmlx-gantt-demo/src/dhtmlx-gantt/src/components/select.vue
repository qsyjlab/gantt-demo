<template>
  <el-select
    v-if="multiple"
    multiple
    :modelValue="modelValue"
    @update:model-value="(value) => $emit('update:modelValue', value)"
  >
    <el-option
      v-for="item in options"
      :key="item.value"
      :label="item.label"
      :value="item.value"
      :disabled="item.disabled"
    />
  </el-select>
  <el-select
    v-else
    :modelValue="modelValue"
    @update:model-value="(value) => $emit('update:modelValue', value)"
  >
    <el-option
      v-for="item in options"
      :key="item.value"
      :label="item.label"
      :value="item.value"
      :disabled="item.disabled"
    />
  </el-select>
</template>

<script setup lang="ts">
import { PropType, watch } from "vue";
import { ElSelect, ElOption } from "element-plus";

defineOptions({
  name: "Select",
});

const props = defineProps({
  modelValue: [String, Number, Array],
  options: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
  multiple: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

watch(
  () => props.multiple,
  (newVal) => {
    // 单选多选切换错误解决
    emit("update:modelValue", newVal ? [] : undefined);
  }
);

</script>

<style lang="scss" scoped></style>
