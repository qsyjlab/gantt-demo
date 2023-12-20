import gantt from "./gantt";
import { originColumns } from "./config";
import { arrFormatToTree, handleSortOptions, treeFormatToOptions } from "./utils";
import { calcOffsetDuration, state, handleCalcMax } from "./container.vue";

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
setVisible(true);
gantt.resetLayout(); // 重置表格 布局，即新建任务的时候，可以看到新建的任务
};

// 关闭 弹出框事件
gantt.hideLightbox = () => {
setVisible(false);
setMaxCount();
};
}
