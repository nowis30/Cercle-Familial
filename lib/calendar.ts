import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type HolidayEntry = {
  label: string;
  date: Date;
};

export function getMonthGridDates(currentMonth: Date) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function getHolidayEntriesForMonth(year: number, monthIndex: number): HolidayEntry[] {
  const all: HolidayEntry[] = [
    { label: "Jour de l'An", date: new Date(year, 0, 1) },
    { label: "Fete nationale (QC)", date: new Date(year, 5, 24) },
    { label: "Fete du Canada", date: new Date(year, 6, 1) },
    { label: "Noel", date: new Date(year, 11, 25) },
    { label: "Paques", date: new Date(year, 3, 5) },
  ];

  return all.filter((entry) => entry.date.getMonth() === monthIndex);
}
