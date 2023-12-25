<template>
  <!-- @ts-nocheck -->
  <div>
    <el-space>
      <el-button
        v-for="(zoom, zoomIndex) in zoomLevels"
        :key="zoomIndex"
        type="primary"
        @click="ganttZoomChagne(zoom)"
      >
        {{ zoom.label }}
      </el-button>
    </el-space>
  </div>

  <div style="height: 90%" ref="ganttContainerRef"></div>

  <!-- 还要共享值 直接放着了 -->
  <el-dialog
    v-model="dialogVisible"
    title="新增/编辑 任务"
    width="60%"
    :show-close="false"
    @close="cancelCreateTask"
  >
    <el-form :model="formData" label-width="120px">
      <el-form-item label="任务序号">
        <el-input v-model="formData.showCode" disabled />
      </el-form-item>
      <el-form-item label="任务名称">
        <el-input v-model="formData.text" />
      </el-form-item>
      <el-form-item label="负责人">
        <el-input v-model="formData.task_user" />
      </el-form-item>
      <el-form-item label="父级任务">
        <v-select
          v-model="formData.parent"
          :options="parentTaskOpitons"
          @change="() => handleFormDataValuesChange('parent')"
        />
      </el-form-item>

      <el-form-item label="前置任务">
        <v-select
          v-model="formData.pre_task"
          :options="preTaskOptions"
          @change="() => handleFormDataValuesChange('pre_task')"
        />
      </el-form-item>
      <el-form-item label="开始时间">
        <el-date-picker
          v-model="formData.start_date"
          type="date"
          @change="() => handleFormDataValuesChange('start_date')"
        />
      </el-form-item>
      <el-form-item label="持续时间">
        <el-input-number
          v-model="formData.duration"
          :max="state.maxCount"
          @change="() => handleFormDataValuesChange('duration')"
        />
      </el-form-item>
      <el-form-item label="结束时间">
        <el-date-picker v-model="formData.end_date" disabled />
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
        <el-button @click="cancelCreateTask">取消</el-button>
        <el-button type="primary" @click="submit"> 确认 </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, isVNode, createApp, h, nextTick } from "vue";
import { ElMessageBox, ElMessage } from "element-plus";
import BigNumber from "bignumber.js";
import gantt, {
  BusinessTask,
  Task,
  TaskDataEx,
  TaskOption,
  calcOffsetDuration,
  controlChildLimit,
  handleCalcMax,
  updateTreeMapItem,
} from "./gantt";
import { originColumns, zoomLevels, operationMenu } from "./config";

import mockData from "./mock";
import {
  arrFormatToTree,
  handleSortOptions,
  treeFormatToOptions,
  generateNumber,
  isComponent,
  isSameDate,
  isDateBefore,
  isDateAfter,
  warning
} from "./utils";

import { cloneDeep } from "lodash-es";

import VSelect from "./components/select.vue";
import OperateDropdown from "./components/operate-dropdown.vue";

const ganttContainerRef = ref();

const dialogVisible = ref(false);

const state = reactive<
  {
    broIndex: number;
    codeMap: Record<string, any>;
    sourceMap: Record<string, any>;
    targetMap: Record<string, any>;
    maxCount: number | undefined;
    currentTask: null | BusinessTask;
    addType: "bro" | "child" | "";
    deleteList: any[];
  } & Record<string, any>
>({
  broIndex: 0,
  codeMap: {},
  sourceMap: {},
  targetMap: {},

  // 最大持续时间
  maxCount: undefined,
  currentTask: null,
  treeMap: {},
  addType: "",
  deleteList: [],
});

const parentTaskOpitons = ref<TaskOption[]>([]);
const preTaskOptions = ref<TaskOption[]>([]);

const formData = reactive<TaskDataEx>({
  id: undefined,
  name: "string",
  showCode: "",
  // code: "",
  text: "",
  task_user: "",
  parent: "",
  pre_task: "",
  start_date: undefined,
  duration: 0,
  end_date: undefined,
  progress: 0,
  task_status: "",
});

onMounted(() => {
  initGanntContainer();
  setLinkChangeListener();
  setBeforeUpdateTaskListener();
  setZooms();
  setColumns();
  // setDateMarker();
  registerLightBox();

  const formatData = formatTask();
  gantt.parse(formatData);
});

// 显示
function show() {
  dialogVisible.value = true;

  const task = state.currentTask;

  if (task) {
    formData.showCode = task.showCode;
    formData.name = task.name;
    formData.duration = task.duration;
    formData.end_date = task.end_date;
    formData.parent = task.parent;
    formData.pre_task = task.pre_task;
    formData.start_date = task.start_date;
    formData.progress = task.progress;
    formData.task_user = task.task_user;
    formData.text = task.text;
  }
}
// 隐藏
function close() {
  dialogVisible.value = false;
}

// 取消编辑或新建 任务
function cancelCreateTask() {
  if (state.currentTask?.$new && !state.submit) {
    gantt.deleteTask(state.currentTask.id);
  }

  close();
  state.maxCount = undefined;
  state.currentTask = null;
  state.submit = false;
}

const submit = () => {
  state.submit = true;
  const currentTask = state.currentTask;
  const isNewFlag = currentTask?.isNew || currentTask?.$new;

  const newTask = {
    ...currentTask,
    ...formData,

    isNew: isNewFlag,
    isEdit: !isNewFlag,
  };

  if (newTask.progress) {
    newTask.progress = (newTask.progress as number) / 100;
  }

  const originParent = currentTask?.parent;
  const { parent = 0 } = newTask;

  const {
    treeMap = {},
    addType = "",
    broIndex,
    targetMap,
    sourceMap,
  } = state || {};

  // 计算 tindex 如果为新增本级，那么就是之前存的 broIndex, 如果是添加子级，直接用子级长度作为 index
  const parentLength = treeMap[parent || 0]?.length;

  const tindex = parentLength
    ? addType === "bro"
      ? broIndex
      : parentLength
    : 0;

  const endDate = new Date(newTask.end_date || new Date());
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

    if (id) {
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
    }
  } else {
    // 如果保存的任务 没有配置前置任务
    const { id, pre_task: preTask } = newTask;

    if (id) {
      const preLink = targetMap[id];

      // 查看是否存在于  targetMap 中，如果存在，即这次为清空前置任务，需要删掉 link
      if (targetMap[id]) {
        gantt.deleteLink(preLink.id);
        delete targetMap[id];
        delete targetMap[preTask];
      }
    }
  }

  // 如果存在 $new 则代表是新建的
  if (newTask.$new) {
    delete newTask.$new;
    // 先添加任务，在重排
    gantt.addTask(newTask, parent, tindex);
    newUpdateSortCode(newTask.id, parent, tindex, newTask, {});
  } else {
    if (originParent !== parent) {
      newUpdateSortCode(newTask.id, parent, tindex, undefined, newTask);
    } else {
      if (newTask.id) {
        gantt.updateTask(newTask.id, newTask as unknown as Task);
        updateTreeMapItem(state.targetMap, newTask.parent, newTask.id, newTask);
      }
    }
  }

  gantt.eachTask((child) => {
    // 限制 任务子级的 开始日期和结束日期
    controlChildLimit(
      state.targetMap,
      child,
      newTask,
      newTask.start_date,
      false
    );
  }, newTask.id);

  state.addType = "";
  close();
  gantt.resetLayout(); // 重置表格 布局，即新建任务的时候，可以看到新建的任务
};

// 变更 zoom 范围
const ganttZoomChagne = (zoom) => {
  gantt.ext.zoom.setLevel(zoom.name);
};

// 某些属性字段变动时的判定
const handleFormDataValuesChange = (key: keyof TaskDataEx) => {
  if (key === "duration" || key === "start_date") {
    const { start_date, duration } = formData;

    if (key === "start_date") {
      // 如果这次更新的时 start_date, 需要重新计算 duration 的上限
      if (start_date) {
        const durationLimit = handleCalcMax(formData);

        // 当 duration 上限存在 并且 duration 大于上限时， duration 等于上线
        if (durationLimit && duration > durationLimit) {
          formData.duration = durationLimit;
        }
      }
    }

    const endDate = gantt.calculateEndDate(start_date || new Date(), duration);
    endDate.setDate(endDate.getDate() - 1); // 联动更新完 结束日期要减一

    formData.end_date = endDate;
  }

  if (key === "parent") {
    const parent = String(formData.parent);
    if (parent === "0") {
      state.maxCount = undefined;
    } else {
      const parentTask = gantt.getTask(parent) as any;
      const parentEndDate = new Date(parentTask.end_date || new Date());
      parentEndDate.setDate(parentEndDate.getDate() - 1);
      const tempTask = { ...state.currentTask, ...formData };

      // 如果 任务 不在父任务的范围内
      if (
        !(
          formData.end_date <= parentEndDate &&
          formData.start_date >= parentTask.start_date
        )
      ) {
        // 如果 任务原本的持续时间 大于 父任务的持续时间，任务的持续时间改为与父任务相等
        if (tempTask.duration > parentTask.duration) {
          tempTask.duration = parentTask.duration;
        }

        // 获取父级的 startDate 并计算 任务修改到父任务日期范围内后的 endDate
        const startDate = parentTask.start_date;
        const endDate = gantt.calculateEndDate(startDate, tempTask.duration);
        endDate.setDate(endDate.getDate() - 1);

        // 重新更新 开始和结束日期
        tempTask.start_date = startDate;
        tempTask.end_date = endDate;

        Object.assign(formData, tempTask);
      }

      state.maxCount = handleCalcMax(tempTask);
    }
  }
};

const menuEventHandler = (command, task) => {
  const id = new Date().getTime();
  const tempTask = {
    id,
  };

  const index = state.treeMap[task.parent].findIndex(
    (cur) => cur.id === task.id
  );

  if (command === "delete") {
    // 点击删除时，弹出提示框
    showDeleteConfirm(task);
  }

  if (command === "add-bro") {
    gantt.createTask(
      tempTask,
      task.parent !== 0 ? task.parent : undefined,
      index + 1
    );
    state.addType = "bro";
    state.broIndex = index + 1;
  }

  if (command === "add-child") {
    // 点击 新建子级时
    gantt.createTask(tempTask, task.id);

    state.addType = "child";
  }
};

function showDeleteConfirm(task) {
  ElMessageBox.confirm(
    "将删除此行数据，如有下级数据将一并删除，是否删除?",
    "Warning",
    {
      type: "warning",
    }
  ).then(() => {
    removeTask(task);
  });
}

function removeTask(task) {
  const tempTreeMap = { ...state.treeMap };

  const tempTask = task || state.currentTask;
  // 如果是 新建的任务
  if (tempTask.$new || tempTask.isNew) {
    gantt.deleteTask(tempTask.id);
  } else {
    // 将 任务记录到需要给后端
    state.deleteList.push(tempTask);

    // 如果存在子级， 子级也一起进入删除队列
    if (tempTreeMap[tempTask.id]) {
      deleteChildren(tempTreeMap[tempTask.id]);
    }
    gantt.deleteTask(tempTask.id);

    // 删除子级，将子级记录进删除队列中
    function deleteChildren(list) {
      list.forEach((item) => {
        state.deleteList.push(item);

        if (state.treeMap[item.id]) {
          deleteChildren(state.treeMap[item.id]);
        }
      });
    }
  }

  // 找到 该任务的位置，并删除 treeMap 中的数据
  let originIndex = 0;
  tempTreeMap[tempTask.parent].forEach((item, index) => {
    if (item.id === tempTask.id) {
      originIndex = index;
    }
  });
  tempTreeMap[tempTask.parent].splice(originIndex, 1);
  state.treeMap = { ...tempTreeMap };

  // 更新所有任务 以及 生成新的 codeMap
  updateCodeMapAndTask(tempTreeMap);

  state.maxCount = undefined;
  state.currentTask = null;
}

// 新版  重排 任务用于排序的 code（隐式code 不重排，确保同级 code 唯一，然后显示code 只在前端渲染，给后端只传更改的数据）
function newUpdateSortCode(id, parent, tindex, newTask, editTask = {}) {
  const { treeMap = {} } = state || {};

  // 获取 全局保存的树状的 数据
  const tempTreeMap = treeMap;
  // 获取它的兄弟数组
  let broList = tempTreeMap[parent || 0] || [];
  broList = broList.sort((a, b) => {
    return a.code - b.code;
  });

  // 通过 树状数据 处理出 人物列表
  const taskList = Object.values(tempTreeMap as Task).reduce((prev, next) => {
    return prev.concat(next);
  }, []);

  // 遍历任务列表，找到正在移动的任务 的原始数据
  let moveTask = newTask || {};
  taskList.forEach((item) => {
    if (`${item.id}` === `${id}`) {
      const { parent: originParent } = item;

      const tempTask = { ...item, ...editTask };
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
    let codeArr: string[] = [];
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
    console.log("插入到中间");
  } else {
    console.log("插入开头");
    // 以上两个都不满足的话，即为插入到第一个的位置
    // 查找之前在 第一个的任务，如果找不到，即为之前没有，默认为一个空数组
    const afterTask = broList[afterIndex] || {};

    // 如果后一个任务 就是 MoveTask 则 return，会出现这个状况是因为 taskMove 会执行两次，第二次执行会让 code 混乱
    if (afterTask.id === moveTask.id) return;

    // 获取 需要切割的 code
    // codeArr 会将 code 根据小数点切割成数组
    let codeArr: string[] = [];
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
    if (moveTask.duration <= (parentTask.duration || 0)) {
      // 如果 移动任务的开始日期 大于 父任务的开始日期 并且 小于父任务的结束日期
      // 需要计算其 与 父任务开始日期的差值
      if (
        moveTask!.start_date > parentTask!.start_date &&
        moveTask!.start_date < parentTask!.end_date
      ) {
        const offsetDur = gantt.calculateDuration(
          parentTask?.start_date || new Date(),
          moveTask.start_date
        );
        moveTask.offsetDur = offsetDur;
      } else {
        moveTask.offsetDur = 0;
      }

      // 限制任务的 开始结束日期
      controlChildLimit(
        state.targetMap,
        moveTask,
        parentTask,
        parentTask.start_date,
        true
      );
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
  debugger;
  state.treeMap = tempTreeMap;

  // 更新所有任务 以及 生成新的 codeMap
  updateCodeMapAndTask(tempTreeMap);
}

// 更新 codeMap 以及 重排任务的显示序号
function updateCodeMapAndTask(treeMap) {
  const newList: Task[] = [];

  // 因为在 treeMap 中没有最外层的数据，所以这里初始化一个最外层的对象
  const tempCodeMap = {
    0: {
      code: null,
      count: treeMap[0]?.length,
    },
  };

  // 处理 任务成 codeMap, 并获得 更新过 code 的任务
  formatCodeMap(treeMap[0], null, treeMap, tempCodeMap, newList);
  state.codeMap = tempCodeMap;

  // 批量更新任务
  gantt.batchUpdate(() => {
    newList.forEach((item) => {
      gantt.updateTask(item.id, item);
    });
  });
  gantt.resetLayout();
}

// 将数据处理成我们需要的集合
function formatTask() {
  const tempData: Record<string, any> = mockData;
  const taskTree: Record<string, any> = {};
  const tempLinks: any[] = [];

  tempData.data.forEach((item) => {
    const temp: Record<string, any> = { ...item };

    // 如果 外部的开始日期和结束日期都有值，更新成 0 点即可
    const startDate = new Date(`${temp.start_date} 00:00:00`);
    temp.start_date = startDate;
    const endDate = new Date(`${temp.end_date} 00:00:00`);
    endDate.setDate(endDate.getDate() + 1); // 在渲染页面的时候 结束日期 + 1天
    temp.end_date = endDate;

    const status = temp.progress === 1 ? "finish" : "continue";
    temp.task_status = status;

    if (!taskTree[temp.parent]) {
      taskTree[temp.parent] = [];
    }
    taskTree[temp.parent].push(temp);

    if (item.pre_task) {
      const source = item.pre_task;
      const target = item.id;

      const link = {
        id: `${source}-${target}`,
        type: "0",
        source,
        target,
      };
      tempLinks.push(link);
      state.targetMap[target] = link;
      state.sourceMap[source] = link;
    }
  });

  // 这里不要使用 parse 深拷贝，日期会丢失
  state.treeMap = cloneDeep(taskTree);

  // 设置 codeMap
  const tempCodeMap = {
    0: {
      code: null,
      count: taskTree[0]?.length,
    },
  };
  const newList: any[] = [];
  formatCodeMap(taskTree[0], null, taskTree, tempCodeMap, newList);
  state.codeMap = { ...tempCodeMap };
  tempData.data = newList;

  tempData.links = tempLinks;

  return tempData;
}

// 处理 任务成 codeMap
function formatCodeMap(
  items,
  parentCode,
  tree,
  tempCodeMap,
  newList,
  level = 0
) {
  if (!items) return;
  // 将 子代任务进行排序
  items.sort((a, b) => {
    return a.code - b.code;
  });

  // 遍历排序好的 子代
  items.forEach((item, index) => {
    const { id } = item;
    // 如果有 父级code，生成新的 code 为 父级code.父级子任务数量
    const code = parentCode ? `${parentCode}.${index + 1}` : String(index + 1);
    item.showCode = code;
    // 增加这三行 带$的属性 是为了 让甘特图新增完任务重排的时候顺序不乱
    item.$index = index;
    item.$level = level;
    if (state.broIndex) item.$rendered_parent = item.parent;

    // 将更新了 code 的 item 传出去更新

    if (!item.parent) item.parent = 0;
    newList.push(item);

    // 如果 tree[item.id] 存在，即为 该任务有子代，继续遍历
    if (tree[item.id]) {
      tempCodeMap[id] = {
        count: tree[item.id].length,
        code,
      };

      formatCodeMap(tree[item.id], code, tree, tempCodeMap, newList, level + 1);
    } else {
      tempCodeMap[id] = {
        count: 0,
        code,
      };
    }
  });
}

// 注册自定义 任务弹出框
function registerLightBox() {
  // 打开 弹出框事件
  gantt.showLightbox = (id) => {
    formData.id = id;

    const task = gantt.getTask(id);
    const store = gantt.getDatastore("task") as any;
    // 给其任务的子级 计算开始日期之间的工作日天数的差值
    calcOffsetDuration(id);

    // 获取 当前所有任务，临时拼接成树后，再转为筛掉自己和子级的 下拉框选项
    // 该下拉框选项 用于选择 父任务
    const taskList = Object.values(store.pull);
    const taskTree = arrFormatToTree(taskList);
    const taskOptions: TaskOption[] = [];
    treeFormatToOptions(taskOptions, taskTree, id, "text");

    // 如果 task 有任务链接，需要筛选一下，让选择的父任务不能选其后置任务
    let parentOptions: TaskOption[] = [];
    const preTasks = taskOptions.slice(1);
    const sourceLink = state.sourceMap[task.id];
    if (sourceLink) {
      const { target } = sourceLink;
      parentOptions = taskOptions.filter((cur) => cur.value !== target);
    } else {
      parentOptions = taskOptions;
    }

    // 将 下拉框数据根据 showCode 进行排序
    handleSortOptions(parentOptions);

    preTaskOptions.value = preTasks;
    parentTaskOpitons.value = parentOptions;

    // 让 status 与 进度保持一直
    if (task.progress === 1) {
      task.task_status = "finish";
    } else {
      task.task_status = "continue";
    }

    // 获取 当前任务的 code
    const map = state.codeMap;
    const { parent = 0 } = task;
    let { showCode } = task;

    // 如果 当前任务 是新建的，需要设置一个 默认code
    // 如果在根目录下，则直接 code = 根目录任务count + 1
    // 如果在某个任务下，则 code = 父任务code + 父任务子代count + 1
    if (task.$new) {
      showCode =
        parent === 0
          ? String(map[0].count + 1)
          : `${map[parent].code}.${map[parent].count + 1}`;
    }
    const tempTask = {
      ...task,
      showCode,
      parent: parent === 0 ? 0 : String(parent), // dhtmlx 会默认给 parent 为数字 0，但我们需要 字符串0，需要手动转一下
    };

    const date = new Date();
    date.setTime(task.end_date?.getTime() || 0);

    // 打开模态框时，如果结束时间 比 开始时间大时 要 减一天

    if (task.end_date!.getTime() > task.start_date!.getTime()) {
      date.setTime((task.end_date?.getTime() as number) - 24 * 60 * 60 * 1000);
    }

    tempTask.end_date = date;

    // 计算 持续时间的最大值
    state.maxCount = handleCalcMax(tempTask);

    // 设置默认值
    state.currentTask = tempTask as BusinessTask;

    // setVisible(true);
    gantt.resetLayout(); // 重置表格 布局，即新建任务的时候，可以看到新建的任务

    nextTick(() => {
      show();
    });
  };

  // 关闭 弹出框事件
  gantt.hideLightbox = () => {
    close();
    state.maxCount = undefined;
  };
}

function initGanntContainer() {
  gantt.init(ganttContainerRef.value);
  gantt.config.autofit = true; // 表格列宽自适应
  gantt.config.autoscroll = true; // 自动滚动
  gantt.config.autoscroll_speed = 50; // 定义将任务或链接拖出当前浏览器屏幕时自动滚动的速度（以毫秒为单位）
  gantt.config.autosize = true; // 自适应甘特图的尺寸大小, 使得在不出现滚动条的情况下, 显示全部任务
  // gantt.config.readonly = true; // 只读模式
  gantt.config.fit_tasks = true; // 当task的长度改变时，自动调整图表坐标轴区间用于适配task的长度
  gantt.config.round_dnd_dates = true; // 将任务开始时间和结束时间自动“四舍五入”, 从而对齐坐标轴刻度
  // gantt.config.select_task = false; // 任务是否可以点击选中
  gantt.config.smart_scales = true; // 仅仅渲染在屏幕可见的那部分时间轴。在处理时间轴非常长的时候，可以提升性能
  gantt.config.smart_rendering = true; // 按需渲染, 仅仅渲染在屏幕可见的那部分任务和依赖线。这个在显示大量的任务时，性能比较高。
  gantt.config.layout = {
    css: "gantt_container",
    cols: [
      {
        width: 400,
        min_width: 400,
        rows: [
          {
            view: "grid",
            scrollX: "gridScroll",
            scrollable: true,
            scrollY: "scrollVer",
          },
          { view: "scrollbar", id: "gridScroll", group: "horizontal" },
        ],
      },
      // { resizer: true, width: 10 },
      {
        rows: [
          { view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer" },
          { view: "scrollbar", id: "scrollHor", group: "horizontal" },
        ],
      },
      { view: "scrollbar", id: "scrollVer" },
    ],
  };

  // 设置 甘特图 时间列的 class 类名，用于配置禁用日期的样式
  gantt.templates.timeline_cell_class = (_task, date) => {
    const disableHighlight = ["month", "year", "quarter"].includes("month");
    // _curZoom.current

    if (!disableHighlight && !gantt.isWorkTime(date)) return "week_end";
    return "";
  };

  // 设置 任务的 class 类名，用于配置 任务完成时的 样式
  gantt.templates.task_class = (_start, _end, task) => {
    if (task.progress === 1) return "completed_task";
    return "";
  };

  // // 任务移动后的回调事件
  // gantt.attachEvent("onAfterTaskMove", (id, parent, tindex) => {
  //   // newUpdateSortCode(id, parent, tindex);
  // });

  // 配置 可以让表格渲染 用 vue 组件
  gantt.config.external_render = {
    isElement: (element) => {
      return isVNode(element) || isComponent(element);
    },
    renderElement: (element, container) => {
      const app = createApp(element);
      app.mount(container);

      // render(h(element), container)
      return container;
    },
  };
}

// 设置 link 链接变动的时候的 回调函数
function setLinkChangeListener() {
  // 链接添加后的回调事件
  gantt.attachEvent("onAfterLinkAdd", (id, link) => {
    const { target, source } = link;
    const newId = `${source}-${target}`;
    // 查找 targetMap 看该任务 存不存在 已有的链接
    const targetLink = state.targetMap[target];
    const sourceLink = state.targetMap[source];
    const nowLink = gantt.getLink(id);

    // 查找 来源节点的 link，如果 来源link的 source 等于 当前 target 时，代表任务循环引用了
    if (sourceLink && sourceLink?.source === target) {
      // 不一致且存在链接的时候，不允许他拖拽上
      if (nowLink) {
        gantt.deleteLink(id);
        ElMessage.warning(
          "任务之间不能循环引用，该任务的前置任务不能是其后置任务！"
        );
        return true;
      }
    } else if (targetLink) {
      // 看一下是否和当前的 来源是否不一致 或 链接的来源为 这次的目标，这即为循环引用，不允许
      if (targetLink.source !== source) {
        // 不一致且存在链接的时候，不允许他拖拽上
        if (nowLink) {
          gantt.deleteLink(id);
          ElMessage.warning(
            "该任务已有前置任务，如需关联，请先删除该任务的关联关系！"
          );
        }
      } else if (id !== newId) {
        // 如果来源一致，即有可能重复链接了
        if (nowLink) {
          gantt.deleteLink(id);
          ElMessage.warning("该任务已链接此前置任务，无需再关联一次！");
        }
      }
    } else {
      // 如果不存在
      // 更新 新增好的 Link 的 id
      const newLink = { ...link, id: newId };
      state.targetMap[target] = newLink;
      state.sourceMap[source] = newLink;
      gantt.changeLinkId(id, newId);

      // 然后更新 目标组件
      const targetTask = gantt.getTask(target);
      targetTask.pre_task = String(source);
      // setDynFieldValue(targetTask, 'pre_task', String(source));

      targetTask.isEdit = true;
      gantt.updateTask(targetTask.id, targetTask);
      updateTreeMapItem(
        state.targetMap,
        targetTask.parent,
        targetTask.id,
        targetTask
      );
    }

    return true;
  });

  // 链接删除后的回调函数
  gantt.attachEvent("onAfterLinkDelete", (id, item) => {
    console.log("id, item", id, item);

    const { target, source } = item;
    const newId = `${source}-${target}`;
    const preLink = state.targetMap[target];

    // 如果 targetMap 中存在这个 link，并且 这个 id 是我们拼接好的 id，不是组件自己生成的 id 时 才去删掉
    if (preLink?.source === source && id === newId) {
      // 将其删掉
      delete state.targetMap[target];
      delete state.sourceMap[source];

      // 找到 link 指到的目标任务
      // 将该任务的 前置任务清空
      const targetTask = gantt.getTask(target);
      targetTask.pre_task = undefined;
      // setDynFieldValue(targetTask, 'pre_task', undefined);

      targetTask.isEdit = true;
      gantt.updateTask(targetTask.id, targetTask);
      updateTreeMapItem(
        state.targetMap,
        targetTask.parent,
        targetTask.id,
        targetTask
      );
    }
  });
}

function setBeforeUpdateTaskListener() {
  gantt.attachEvent("onBeforeTaskChanged", function (id, mode, task) {
    if (mode === "resize") {

      if(!task.parent) return true
      // 变更后的数据
      const nowTask =  gantt.getTask(id)

      if(!nowTask.parent) return true

      const parentTask = gantt.getTask(nowTask.parent)


      // 如果时间改变判定时间范围
      if(!isSameDate(nowTask.start_date, task.start_date) || !isSameDate(nowTask.end_date, task.end_date)) {


        if(isDateBefore(nowTask.start_date, parentTask.start_date)) {
          warning('不能超出父级时间范围')
        
          return false
        }
          
        if(isDateAfter(nowTask.end_date, parentTask.end_date)) {
          warning('不能超出父级时间范围')
          return false
        }

      }

      debugger
    }
    return true;
  });
}

// 设置 时间刻度范围 以及 时间刻度具体数值 以及 初始时间刻度
function setZooms() {
  const zoomConfig = {
    levels: zoomLevels,
    useKey: "ctrlKey",
    // trigger: "wheel",
    element: () => {
      return gantt.$root.querySelector(".gantt_task");
    },
  };

  gantt.ext.zoom.init(zoomConfig);
  gantt.ext.zoom.setLevel("day");
}

// 设置网格列
function setColumns() {
  const columns = originColumns.map((item) => {
    const temp = { ...item };
    if (item.name === "add") {
      temp["onrender"] = (task) => {
        return h(OperateDropdown, {
          menus: operationMenu,
          onCommand: (command) => menuEventHandler(command, task),
        });
      };
    }
    return temp;
  });

  gantt.config.columns = columns;
}
</script>

<style>
@import "./style.css";
</style>
