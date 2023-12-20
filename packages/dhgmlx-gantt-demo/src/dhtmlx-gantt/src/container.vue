<template>
  <button @click="addTask">新增</button>
  <button @click="getJson">获取json</button>
  <div style="height: 90%" ref="ganttContainerRef"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import gantt from "./gantt";
import { originColumns, zoomLevels } from "./config";
import mockData from "./mock";
import {
  arrFormatToTree,
  handleSortOptions,
  treeFormatToOptions,
} from "./utils";

const ganttContainerRef = ref();
const targetMap: Record<string, any> = {};
const treeMap: Record<string, any> = {
  value: null,
};

const state = {
  broIndex: null,
  codeMap: {},
  sourceMap: {},
  maxCount: 0,
  currentTask: null,
};

onMounted(() => {
  initGanntContainer();
  setZooms();
  registerLightBox();

  const formatData = formatTask();
  gantt.parse(formatData);
});

const addTask = () => {
  // 获取当前时间
  const currentDate = new Date();

  // 新任务的数据
  const newTask = {
    id: new Date().getTime(), // 生成唯一 ID
    text: "New Task",
    start_date: currentDate,
    duration: 1,
    data: {},
  };

  // 添加新任务到 Gantt 图表
  gantt.addTask(newTask);

  // 刷新 Gantt 图表
  gantt.render();
};
const getJson = () => {
  console.log("gantt", gantt.serialize());
};

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
      targetMap[target] = link;
      state.sourceMap[source] = link;
    }
  });

  treeMap.value = JSON.parse(JSON.stringify(taskTree));

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
    const task = gantt.getTask(id);
    const store = gantt.getDatastore("task");
    // 给其任务的子级 计算开始日期之间的工作日天数的差值

    calcOffsetDuration(id);

    // 获取 当前所有任务，临时拼接成树后，再转为筛掉自己和子级的 下拉框选项
    // 该下拉框选项 用于选择 父任务
    const taskList = Object.values(store.pull);
    const taskTree = arrFormatToTree(taskList);
    const taskOptions = [];
    treeFormatToOptions(taskOptions, taskTree, id, "text");

    originColumns.forEach((item) => {
      if (item.originField === "parent") {
        // 如果 task 有任务链接，需要筛选一下，让选择的父任务不能选其后置任务
        let options = taskOptions;
        const sourceLink = state.sourceMap[task.id];
        if (sourceLink) {
          const { target } = sourceLink;
          options = taskOptions.filter((cur) => cur.value !== target);
        }
        // 将 下拉框数据根据 showCode 进行排序
        handleSortOptions(options);
        item.options = options;
      } else if (item.originField === "pre_task") {
        item.options = taskOptions.slice(1); // 选择前置任务时需要删除第一位的 root
      }
    });

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
    date.setTime(task.end_date?.getTime());

    // 打开模态框时，如果结束时间 比 开始时间大时 要 减一天
    if (task.end_date?.getTime() > task.start_date?.getTime()) {
      date.setTime(task.end_date?.getTime() - 24 * 60 * 60 * 1000);
    }

    tempTask.end_date = date;

    // 计算 持续时间的最大值
    handleCalcMax(tempTask);

    // 设置默认值
    state.currentTask = tempTask;
    // setVisible(true);
    gantt.resetLayout(); // 重置表格 布局，即新建任务的时候，可以看到新建的任务
  };

  // 关闭 弹出框事件
  gantt.hideLightbox = () => {
    // setVisible(false);
    // setMaxCount();

    state.maxCount = null;
  };
}

// 给其任务的子级 计算开始日期之间的工作日天数的差值
function calcOffsetDuration(id) {
  const task = gantt.getTask(id);

  gantt.eachTask((child) => {
    const offsetDur = gantt.calculateDuration(
      task.start_date as any,
      child.start_date
    );

    child.offsetDur = offsetDur;
  }, id);

  return true;
}

// 计算 持续时间最大值
function handleCalcMax(task) {
  const record = { ...(task || curTask) };

  // 如果该任务为根任务，则不需要有最大值的限制
  if (!record.parent) {
    // setMaxCount();
    state.maxCount = 0;
    return undefined;
  }

  // 获取父任务的结束日期
  const parentTask = gantt.getTask(record.parent);
  const parentEndDate = new Date(parentTask.end_date);

  // 计算出 过滤了周末的 持续时间，即为 持续时间的最大值
  const startDate = new Date(record.start_date);
  const diffDay = gantt.calculateDuration(startDate, parentEndDate);

  state.maxCount = Number(diffDay);
  return Number(diffDay);
}

function initGanntContainer() {
  gantt.init(ganttContainerRef.value);
  gantt.config.autofit = true; // 表格列宽自适应
  // gantt.config.autoscroll = true; // 自动滚动
  // gantt.config.autoscroll_speed = 50; // 定义将任务或链接拖出当前浏览器屏幕时自动滚动的速度（以毫秒为单位）
  gantt.config.autosize = true; // 自适应甘特图的尺寸大小, 使得在不出现滚动条的情况下, 显示全部任务
  // gantt.config.readonly = true; // 只读模式
  gantt.config.fit_tasks = true; // 当task的长度改变时，自动调整图表坐标轴区间用于适配task的长度
  gantt.config.round_dnd_dates = true; // 将任务开始时间和结束时间自动“四舍五入”, 从而对齐坐标轴刻度
  // gantt.config.select_task = false; // 任务是否可以点击选中
  gantt.config.smart_scales = true; // 仅仅渲染在屏幕可见的那部分时间轴。在处理时间轴非常长的时候，可以提升性能
  gantt.config.smart_rendering = true; // 按需渲染, 仅仅渲染在屏幕可见的那部分任务和依赖线。这个在显示大量的任务时，性能比较高。

  gantt.config.columns = originColumns;

  gantt.config.layout = {
    css: "gantt_container",
    cols: [
      {
        width: 400,
        min_width: 300,
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
      { resizer: true, width: 1 },
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
  // gantt.config.external_render = {
  //     // checks the element is a React element
  //     isElement: (element) => {

  //       return true
  //       // return React.isValidElement(element);
  //     },
  //     // renders the React element into the DOM
  //     renderElement: (element, container) => {
  //       // ReactDOM.render(element, container);
  //       return null;
  //     }
  //   };
}

// 设置 时间刻度范围 以及 时间刻度具体数值 以及 初始时间刻度
function setZooms() {
  const zoomConfig = {
    levels: zoomLevels,
    // useKey: "ctrlKey",
    // trigger: "wheel",
    element: () => {
      return gantt.$root.querySelector(".gantt_task");
    },
  };

  gantt.ext.zoom.init(zoomConfig);
  gantt.ext.zoom.setLevel("day");
}
</script>

<style>
@import "./style.css";
</style>
