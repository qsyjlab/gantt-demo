export const originColumns = [
  {
    name: "add",
    width: 44,
    align: "center",
  },
  {
    type: "input",
    name: "showCode",
    label: "任务序号",
    tree: true,
    width: 100,
    min_width: 100,
  },
  {
    type: null,
    name: "code",
    originField: "code",
    label: "任务序号",
    hide: true,
  },
  {
    type: "input",
    name: "text",
    originField: "text",
    label: "任务名称",
    // tree: true,
    width: "*",
    min_width: 160,
  },
  {
    type: "input",
    name: "task_user",
    originField: "task_user",
    label: "负责人",
    width: 100,
    min_width: 100,
    align: "center",
  },
  {
    type: "select",
    name: "parent",
    originField: "parent",
    hide: true,
    label: "父任务",
  },
  {
    type: "select",
    name: "pre_task",
    originField: "pre_task",
    hide: true,
    label: "前置任务",
  },
  {
    type: "date",
    name: "start_date",
    originField: "start_date",
    label: "开始日期",
    align: "center",
    width: 80,
    min_width: 80,
  },
  {
    type: "number",
    name: "duration",
    originField: "duration",
    label: "持续时间",
    align: "center",
    min: 1,
    formatType: "date",
  },
  {
    type: "date",
    name: "end_date",
    originField: "end_date",
    label: "结束时间",
    align: "center",
    disabled: true,
    width: 80,
    min_width: 80,
  },
  {
    type: "slider",
    name: "progress",
    originField: "progress",
    label: "进度",
    width: 80,
    align: "center",
    template: (item: any) => {
      return item.progress
    },
  },
  {
    type: "select",
    name: "task_status",
    originField: "task_status",
    hide: true,
    align: "center",
    label: "任务状态",
    options: [
      {
        value: "continue",
        label: "未完成",
      },
      {
        value: "finish",
        label: "完成",
      },
    ],
  },
];

export const zoomLevels = [
  // {
  //   name: "hour",
  //   label: '小时',
  //   scale_height: 50,
  //   min_column_width: 30,
  //   scales: [
  //     { unit: "day", format: "%Y-%m-%d" },
  //     { unit: "hour", format: "%H" },
  //   ],
  // },
  {
    name: "day",
    label: "日",
    scale_height: 70,
    min_column_width: 30,
    scales: [
      { unit: "month", format: "%Y年 %F" },
      // { unit: "day", step: 1, format: "%j %D" },
      {
        unit: "day",
        step: 1,
        format: (date) => {
          const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
          const day = new Date(date).getDate();
          const weekDay = new Date(date).getDay();
          return `<div class='scale-formate-date'>
            <span class='formate-date'>${day}</span>
            <span class='formate-weekDay'>${weekDays[weekDay]}</span>
            </div>`;
          // return "<strong>Day " + dayNumber(date) + "</strong><br/>" + dateFormat(date);
        },
      },
    ],
  },
  {
    name: "week",
    label: "周",
    scale_height: 50,
    min_column_width: 50,
    scales: [
      { unit: "month", format: "%Y年 %F" },
      { unit: "week", step: 1, date: "%W周" },
    ],
  },
  {
    name: "month",
    label: "月",
    scale_height: 50,
    min_column_width: 50,
    scales: [
      // { unit: "year", step: 1, format: "%Y年" },
      {
        unit: "quarter",
        step: 1,
        format: (date) => {
          const year = new Date(date).getFullYear();
          const month = new Date(date).getMonth();
          const quarter = Math.floor(month / 3 + 1);
          return `${year}年-Q${quarter}`;
          // return `Q${quarter}`;
        },
      },
      { unit: "month", step: 1, format: "%F" },
    ],
  },
  {
    name: "quarter",
    label: "季",
    scale_height: 50,
    min_column_width: 50,
    scales: [
      { unit: "year", step: 1, format: "%Y年" },
      {
        unit: "quarter",
        step: 1,
        format: (date: Date) => {
          // const year = new Date(date).getFullYear();
          const month = new Date(date).getMonth();
          const quarter = Math.floor(month / 3 + 1);
          // return `${year}年-Q${quarter}`;
          return `Q${quarter}`;
        },
      },
    ],
  },
  {
    name: "year",
    label: "年",
    scale_height: 50,
    min_column_width: 50,
    scales: [{ unit: "year", step: 1, format: "%Y年" }],
  },
];

export const zoomMap = {
  day: "日",
  week: "周",
  month: "月",
  quarter: "季",
  year: "年",
};

export const operationMenu = [
  {
    key: "add-bro",
    label: "新增本级",
  },
  {
    key: "add-child",
    label: "新增子级",
  },
  {
    key: "delete",
    label: "删除",
  },
];
