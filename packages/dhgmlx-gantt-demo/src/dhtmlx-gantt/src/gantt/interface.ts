import { Task } from "dhtmlx-gantt";

export type { Task };

export interface TaskDataEx {
  id?: string | number;
  name: string;
  showCode: string;
  // code: string;
  text: string;
  task_user: string;
  parent: string;
  pre_task: string;

  duration: number;
  end_date?: Date;
  start_date?: Date;
  progress: string;
  task_status: string;
}

export type BusinessTask = Task & TaskDataEx;

export interface TaskOption {
  label: string;
  value: string | number;
  showCode?: string;
}
