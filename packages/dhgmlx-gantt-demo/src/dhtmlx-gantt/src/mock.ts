export default {
    data: [
      {
        id: "A1",
        text: "Project #2",
        start_date: "2023-08-28",
        duration: 10,
        end_date: "2023-09-08",
        progress: 0.4,
        open: true,
        showCode: 1,
        code: 0.1,
        task_user: "A",
        parent: 0
      },
      {
        id: "A2",
        text: "Task #1",
        start_date: "2023-08-29",
        duration: 4,
        end_date: "2023-09-01",
        progress: 0.6,
        parent: "A1",
        showCode: 1.1,
        code: 0.1,
        task_user: "A"
      },
      {
        id: "A3",
        text: "Task #2",
        start_date: "2023-08-30",
        duration: 6,
        end_date: "2023-09-06",
        progress: 0.6,
        parent: "A1",
        pre_task: "A2",
        showCode: 1.2,
        code: 0.2,
        task_user: "A"
      },
      {
        id: "A4",
        text: "Project #3",
        start_date: "2023-08-28",
        duration: 6,
        end_date: "2023-09-04",
        progress: 1,
        showCode: 2,
        code: 0.2,
        task_user: "A",
        parent: 0
      }
    ]
  };
  