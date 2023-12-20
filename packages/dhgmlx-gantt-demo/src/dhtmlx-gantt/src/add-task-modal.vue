<template>
  <el-dialog v-model="dialogVisible" title="新增/编辑 任务" width="60%">
    <el-form :model="formData" label-width="120px">
      <el-form-item label="任务序号">
        <el-input v-model="formData.showCode" />
      </el-form-item>
      <el-form-item label="任务名称">
        <el-input v-model="formData.text" />
      </el-form-item>
      <el-form-item label="负责人">
        <el-input v-model="formData.task_user" />
      </el-form-item>
      <el-form-item label="父级任务">
        <v-select v-model="formData.parent" :options="parentOptions" />
      </el-form-item>

      <el-form-item label="前置任务">
        <v-select v-model="formData.pre_task" :options="preTaskOptions" />
      </el-form-item>
      <el-form-item label="开始时间">
        <el-date-picker v-model="formData.start_date" type="date" value-format="YYYY-MM-DD" />
      </el-form-item>
      <el-form-item label="持续时间">
        <el-input-number v-model="formData.duration"  />
      </el-form-item>
      <el-form-item label="结束时间">
        <el-date-picker v-model="formData.end_date"  value-format="YYYY-MM-DD"/>
      </el-form-item>
      <el-form-item label="进度">
        <el-slider v-model="formData.progress" />
      </el-form-item>
      <el-form-item label="任务状态">
        <v-select v-model="formData.task_status" :options="[]" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" @click="submit"> 确认 </el-button>
      </span>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import dayjs from "dayjs";
import { ref, reactive, watch } from "vue";
import VSelect from "./components/select.vue";
import gantt from "./gantt";
import { delayChildStartDate, generateNumber } from "./utils";
import BigNumber from "bignumber.js";

const props = defineProps({
  currentTask: Object,
  ganttState: Object,
});

const dialogVisible = ref(false);
const preTaskOptions = ref<any[]>([]);
const parentOptions = ref<any[]>([]);

const formData = reactive<{
  showCode: string;
  // code: string;
  text: string;
  task_user: string;
  parent: string;
  pre_task: string;
  start_date: string;
  duration: string;
  end_date: string;
  progress: string;
  task_status: string;
}>({
  showCode: "",
  // code: "",
  text: "",
  task_user: "",
  parent: "",
  pre_task: "",
  start_date: "",
  duration: "",
  end_date: "",
  progress: "",
  task_status: "",
});

// watch(formData, (newVal, oldVal)=> {

// })

const submit = () => {
  const currentTask = props.currentTask;
  const isNewFlag = currentTask?.isNew || currentTask?.$new;

  const newTask = {
    ...currentTask,
    ...formData,
    isNew: isNewFlag,
    isEdit: !isNewFlag,
  };

  const originParent = currentTask?.parent;
  const { parent } = newTask;

  const {
    treeMap = {},
    addType = "",
    broIndex,
    targetMap,
    sourceMap,
  } = props.ganttState || {};

  // 计算 tindex 如果为新增本级，那么就是之前存的 broIndex, 如果是添加子级，直接用子级长度作为 index
  const parentLength = treeMap[parent]?.length;
  const tindex = parentLength
    ? addType === "bro"
      ? broIndex
      : parentLength
    : 0;

  const endDate = new Date(newTask.end_date);
  endDate.setDate(endDate.getDate() + 1); // 确认任务时 结束日期加一天
  newTask.end_date = endDate;

  if (newTask.pre_task) {
    const { id, pre_task: preTask } = newTask;
    // 设置 link
    const tempLink = {
      id: `${preTask}-${id}`,
      source: preTask,
      target: id,
      type: "0",
    };

    // 如果 targetMap 中不存在，直接 添加 link
    if (!targetMap[id]) {
      targetMap[id] = tempLink;
      sourceMap[preTask] = tempLink;
      gantt.addLink(tempLink);
    } else {
      // 如果 targetMap 中存在
      const preLink = targetMap[id];

      // 看一下存的 source 是否和 当前前置任务一致，不一致的时候
      if (preLink.source !== preTask) {
        gantt.deleteLink(preLink.id);
        targetMap[id] = tempLink;
        sourceMap[preTask] = tempLink;
        gantt.addLink(tempLink);
        newTask.pre_task = preTask;
      }
    }
  } else {
    // 如果保存的任务 没有配置前置任务
    const { id, pre_task: preTask } = newTask;
    const preLink = targetMap[id];

    // 查看是否存在于  targetMap 中，如果存在，即这次为清空前置任务，需要删掉 link
    if (targetMap[id]) {
      gantt.deleteLink(preLink.id);
      delete targetMap[id];
      delete targetMap[preTask];
    }
  }



  // 如果存在 $new 则代表是新建的
  if (newTask.$new) {
    delete newTask.$new;
    // 先添加任务，在重排
    gantt.addTask(newTask, parent, tindex);
    newUpdateSortCode(newTask.id, parent, tindex, newTask);
  } else {
    if (originParent !== parent) {
      newUpdateSortCode(newTask.id, parent, tindex, undefined, newTask);
    } else {
      gantt.updateTask(newTask.id, newTask);
      updateTreeMapItem(newTask.parent, newTask.id, newTask);
    }
  }

  gantt.eachTask((child) => {
    // 限制 任务子级的 开始日期和结束日期
    controlChildLimit(child, newTask, newTask.start_date, false);
  }, newTask.id);

  gantt.eachTask((child) => {
    // 限制 任务子级的 开始日期和结束日期
    controlChildLimit(child, newTask, newTask.start_date, false);
  }, newTask.id);

  close();
  gantt.resetLayout(); // 重置表格 布局，即新建任务的时候，可以看到新建的任务
};

// 更新 treeMap 里的数据
function updateTreeMapItem(parentId, id, task) {
  const { treeMap = {} } = props.ganttState || {};
  const list = treeMap[parentId];
  const index = list.findIndex((item) => item.id === id);

  if (index >= 0) {
    list[index] = { ...list[index], ...task };
  }
}


  // 限制 任务子级的 开始日期和结束日期
  function controlChildLimit(child, task, parentStart, noChangeFlag) {
    // 如果子级的开始时间到 节假日了，也需要往后延迟到工作日
    // 除此之外 还要和父级保持 相等的工作日天数差值
    const childStartDate = delayChildStartDate(parentStart, child.offsetDur);

    // 更新 子级任务的数据
    child.start_date = childStartDate;
    child.end_date = gantt.calculateEndDate(childStartDate, child.duration);

    // 限制子级 不超过父级的 开始日期 和 结束日期
    // if (task && +task.start_date > +child.start_date) {
    //   limitMoveRight(child, task);
    // }
    // if (task && +task.end_date < +child.end_date) {
    //   limitMoveLeft(child, task);
    // }

    // 更新任务
    child.isEdit = true;

    // 如果传了 这个参数 就不去实时更新
    // 主要是在 模态框里确定后使用的，在那里如果提前更新的话 会导致最后更新数据出现错行的问题
    if (!noChangeFlag) {
      gantt.updateTask(child.id, child);
      updateTreeMapItem(child.parent, child.id, child);
    }
  }

// 新版  重排 任务用于排序的 code（隐式code 不重排，确保同级 code 唯一，然后显示code 只在前端渲染，给后端只传更改的数据）
function newUpdateSortCode(id, parent, tindex, newTask, editTask) {

  const {
    treeMap = {},

  } = props.ganttState || {};

  
  // 获取 全局保存的树状的 数据
  const tempTreeMap = treeMap;

  // 获取它的兄弟数组
  let broList = tempTreeMap[parent] || [];
  broList = broList.sort((a, b) => {
    return a.code - b.code;
  });

  // 通过 树状数据 处理出 人物列表
  const taskList = Object.values(tempTreeMap).reduce((prev, next) => {
    return prev.concat(next);
  }, []);

  // 遍历任务列表，找到正在移动的任务 的原始数据
  let moveTask = newTask || {};
  taskList.forEach((item) => {
    if (`${item.id}` === `${id}`) {
      // eslint-disable-next-line camelcase
      // const { start_date, end_date, duration } = editTask;
      const { parent: originParent } = item;

      const tempTask = { ...item, ...editTask };
      // setDynFieldValue(tempTask, 'start_date', start_date);
      // setDynFieldValue(tempTask, 'end_date', end_date);
      // setDynFieldValue(tempTask, 'duration', duration);
      // setDynFieldValue(tempTask, 'parent', originParent);
      tempTask.parent = originParent;

      moveTask = tempTask;
    }
  });

  // 找到该任务的原始父级 和 原始的兄弟数组
  const originParent = newTask ? null : moveTask.parent;
  const originBroList = (tempTreeMap[originParent] || []).sort((a, b) => {
    return a.code - b.code;
  });

  // 并找出 移动任务在 原始兄弟数组中的 Index
  let originIndex = 0;
  originBroList.forEach((item, index) => {
    if (item.id === moveTask.id) {
      originIndex = index;
    }
  });

  // 判断 拖拽任务 拖拽前的父级 是否与 拖拽后的父级一直，并且 originIndex 是否小于 当前index
  const indexFlag = originParent === parent && originIndex < tindex;
  // 如果 indexFlag 为 true 的话 tindex 要比往常多 1，因为是同级拖拽，前面的数据一道后面时，index 不比平常多 1的话，会导致数据取的不对
  const beforeIndex = indexFlag ? tindex : tindex - 1;
  const afterIndex = indexFlag ? tindex + 1 : tindex;

  // 如果 拖拽到最后一个位置
  if (
    tindex > 0 &&
    tindex === (originParent === parent ? broList.length - 1 : broList.length)
  ) {
    console.log("插入最后");
    // 获取之前最后一个位置的 task
    const beforeTask = broList[beforeIndex];

    // 如果该 task 就是 MoveTask 则 return，会出现这个状况是因为 taskMove 会执行两次，第二次执行会让 code 混乱
    if (beforeTask.id === moveTask.id) return;

    // 获取 需要切割的 code
    // codeArr 会将 code 根据小数点切割成数组
    let codeArr = "";
    if (beforeTask.code) {
      codeArr = beforeTask.code.toString().split(".");
    } else {
      codeArr = [];
    }

    // 根据 code 小数点后的数量确定 小数精度
    const precision = codeArr[1]?.length || 0;
    // 根据小数精度，确定需要增加的 Num 量
    const preNum = generateNumber(precision);

    // 让 beforeCode 与 preNum 相加 即为 移动任务新的 code
    const moveCode = Number(BigNumber(beforeTask.code).plus(preNum).toString());
    moveTask.code = moveCode;
  } else if (tindex > 0) {
    console.log("插入中间");
    // 如果不是在最后，并且 tindex > 0，即为在两个值之间插入了
    // 找到插入位置前一个任务 和 后一个任务
    const beforeTask = broList[beforeIndex];
    const afterTask = broList[afterIndex];

    // 如果后一个任务 就是 MoveTask 则 return，会出现这个状况是因为 taskMove 会执行两次，第二次执行会让 code 混乱
    if (afterTask.id === moveTask.id) return;

    // 分别获取 Before 和 after 任务code 切割后的文本
    const beforeCodeArr = beforeTask.code.toString().split(".");
    const afterCodeArr = afterTask.code.toString().split(".");

    // 获取 before 和 after code 的精度，去最小的，最精细的
    const beforePre = beforeCodeArr[1]?.length || 1;
    const afterPre = afterCodeArr[1]?.length || 1;
    let precision = Math.max(beforePre, afterPre);

    // 根据小数精度，确定需要增加的 Num 量
    let preNum = generateNumber(precision);
    let moveCode = 0;
    // 如果 beforeCode + preNum === afterCode 时，需要提升精度 1 级精度
    if (
      BigNumber(preNum).plus(beforeTask.code).toString() === `${afterTask.code}`
    ) {
      precision += 1;
      preNum = generateNumber(precision);
    }

    // 让 beforeCode 与 preNum 相加 即为 移动任务新的 code
    moveCode = Number(BigNumber(preNum).plus(beforeTask.code).toString());
    moveTask.code = moveCode;
  } else {
    console.log("插入开头");
    // 以上两个都不满足的话，即为插入到第一个的位置
    // 查找之前在 第一个的任务，如果找不到，即为之前没有，默认为一个空数组
    const afterTask = broList[afterIndex] || {};

    // 如果后一个任务 就是 MoveTask 则 return，会出现这个状况是因为 taskMove 会执行两次，第二次执行会让 code 混乱
    if (afterTask.id === moveTask.id) return;

    // 获取 需要切割的 code
    // codeArr 会将 code 根据小数点切割成数组
    let codeArr = "";
    if (afterTask.code) {
      codeArr = afterTask.code.toString().split(".");
    } else {
      codeArr = [];
    }

    // 根据 code 小数点后的数量确定 小数精度
    const precision = codeArr[1]?.length || 0;
    // 根据小数精度，确定需要增加的 Num 量
    const preNum = generateNumber(precision + 1);
    const moveCode = Number(preNum.toFixed(precision + 1));
    moveTask.code = moveCode;
    // setDynFieldValue(moveTask, 'code', moveCode);

    // 如果之前没有 broList，需要新建一个，并且更新到 tempTreeMap 中，用于之后添加
    if (!broList.length) {
      tempTreeMap[parent] = [];
      broList = tempTreeMap[parent];
    }
  }

  // 修改 移动任务的 parent 为 当前插入的 parent，并且编辑标识改为 true
  moveTask.parent = parent;
  // setDynFieldValue(moveTask, 'parent', parent);

  // 如果 存在 父级
  if (parent && parent !== 0) {
    const parentTask = gantt.getTask(parent);

    // 当 移动的任务的持续时间 小于或等于 父级的持续时间
    if (moveTask.duration <= parentTask.duration) {
      // 如果 移动任务的开始日期 大于 父任务的开始日期 并且 小于父任务的结束日期
      // 需要计算其 与 父任务开始日期的差值
      if (
        moveTask.start_date > parentTask.start_date &&
        moveTask.start_date < parentTask.end_date
      ) {
        const offsetDur = gantt.calculateDuration(
          parentTask.start_date,
          moveTask.start_date
        );
        moveTask.offsetDur = offsetDur;
      } else {
        moveTask.offsetDur = 0;
      }

      // 限制任务的 开始结束日期
      controlChildLimit(moveTask, parentTask, parentTask.start_date, true);
    } else {
      // 当 移动的任务的持续时间 大于 父级的持续时间
      // 任务时间变成和父任务一致
      // eslint-disable-next-line camelcase
      const { start_date, end_date, duration } = parentTask;
      moveTask.start_date = start_date;
      moveTask.end_date = end_date;
      moveTask.duration = duration;
      // setDynFieldValue(moveTask, 'start_date', start_date);
      // setDynFieldValue(moveTask, 'end_date', end_date);
      // setDynFieldValue(moveTask, 'duration', duration);
    }
  }

  if (!(moveTask.isNew || moveTask.$new)) moveTask.isEdit = true;

  // 将该任务 从原本存在的数组中 删除
  if (tempTreeMap[originParent])
    tempTreeMap[originParent].splice(originIndex, 1);

  // 在 要插入的数组中添加
  broList.splice(tindex, 0, moveTask);
  props.ganttState.treeMap=  tempTreeMap;

  // 更新所有任务 以及 生成新的 codeMap
  // updateCodeMapAndTask(tempTreeMap);
}

const cancel = () => {};

const show = (_id, data) => {
  dialogVisible.value = true;
  parentOptions.value = data.parentOptions;
  preTaskOptions.value = data.preTaskOptions;
};

const close = () => {
  dialogVisible.value = true;
};

defineExpose({
  show,
  close,
});
</script>
<style scoped></style>
