import dayjs from "dayjs";

export function isSameDate(date1, date2) {
  return dayjs(date1).isSame(dayjs(date2), "day");
}

export function isDateAfter(date1, date2) {
  return dayjs(date1).isAfter(dayjs(date2), "day");
}

export function isDateBefore(date1, date2) {
  return dayjs(date1).isBefore(dayjs(date2), "day");
}
