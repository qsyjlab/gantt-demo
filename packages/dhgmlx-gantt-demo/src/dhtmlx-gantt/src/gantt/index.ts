import { delayChildStartDate } from "../utils";
import "./gantt.config";
import { gantt } from "dhtmlx-gantt";
import { cloneDeep } from "lodash-es";

// 计算 持续时间最大值
export function handleCalcMax(task) {
  // || state.currentTask
  const record = { ...task };
  // 如果该任务为根任务，则不需要有最大值的限制
  if (!record.parent) {
    return undefined;
  }

  // 获取父任务的结束日期
  const parentTask = gantt.getTask(record.parent);
  const parentEndDate = new Date(parentTask.end_date);

  // 计算出 过滤了周末的 持续时间，即为 持续时间的最大值
  const startDate = new Date(record.start_date);
  const diffDay = gantt.calculateDuration(startDate, parentEndDate);
  return Number(diffDay);
}

// 给其任务的子级 计算开始日期之间的工作日天数的差值
export function calcOffsetDuration(id) {
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

// 更新 treeMap 里的数据
export function updateTreeMapItem(treeMap, parentId, id, task) {
  const list = treeMap[parentId];
  const index = list?.findIndex((item) => item.id === id);

  if (index >= 0) {
    list[index] = { ...list[index], ...task };
  }
}

// 限制 任务子级的 开始日期和结束日期
export function controlChildLimit(
  treeMap,
  child,
  _task,
  parentStart,
  noChangeFlag
) {
  // 如果子级的开始时间到 节假日了，也需要往后延迟到工作日
  // 除此之外 还要和父级保持 相等的工作日天数差值
  const childStartDate = delayChildStartDate(parentStart, child.offsetDur);

  // 更新 子级任务的数据
  child.start_date = childStartDate;
  child.end_date = gantt.calculateEndDate(childStartDate, child.duration);
  // 更新任务
  child.isEdit = true;
  // 如果传了 这个参数 就不去实时更新
  // 主要是在 模态框里确定后使用的，在那里如果提前更新的话 会导致最后更新数据出现错行的问题
  if (!noChangeFlag) {
    gantt.updateTask(child.id, child);
    updateTreeMapItem(treeMap, child.parent, child.id, child);
  }
}


export * from "./interface";
export default gantt;
