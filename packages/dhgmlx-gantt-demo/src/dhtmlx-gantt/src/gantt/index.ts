import "./gantt.config";
import { gantt } from "dhtmlx-gantt";

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

export * from './interface'
export default gantt;
