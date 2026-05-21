import type { Task, TaskFilters, TaskTiming, WeekdayTaskGroup } from './types';

const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function createTask(
  input: Partial<Task> & Pick<Task, 'title'>,
  today = toDateKey(new Date())
): Task {
  const now = new Date().toISOString();

  return {
    id: input.id ?? createId(),
    title: input.title.trim(),
    status: input.status ?? 'todo',
    plannedDate: input.plannedDate ?? today,
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? 'medium',
    tags: [...(input.tags ?? [])],
    notes: input.notes ?? '',
    repeat: input.repeat ?? 'none',
    createdAt: input.createdAt ?? now,
    completedAt: input.completedAt ?? null
  };
}

export function getTaskTiming(task: Task, today: string): TaskTiming {
  if (task.status === 'done' || !task.dueDate) {
    return { isOverdue: false, isDueToday: false };
  }

  return {
    isOverdue: task.dueDate < today,
    isDueToday: task.dueDate === today
  };
}

export function groupTasksByWeekday(tasks: Task[], today: string): WeekdayTaskGroup[] {
  const monday = getMonday(today);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);

    return {
      date,
      label: weekdayLabels[index],
      tasks: tasks
        .filter((task) => task.status !== 'done' && task.plannedDate === date)
        .sort(compareTasks)
    };
  });
}

export function completeTask(task: Task, completedAt = new Date().toISOString()) {
  const completed: Task = {
    ...task,
    status: 'done',
    completedAt
  };

  if (task.repeat === 'none') {
    return { completed, nextTask: null };
  }

  const step = task.repeat === 'daily' ? 1 : 7;
  const nextPlannedDate = addDays(task.plannedDate, step);
  const nextDueDate = task.dueDate ? addDays(task.dueDate, step) : null;

  return {
    completed,
    nextTask: createTask(
      {
        ...task,
        id: createId(),
        status: 'todo',
        plannedDate: nextPlannedDate,
        dueDate: nextDueDate,
        completedAt: null,
        createdAt: completedAt
      },
      nextPlannedDate
    )
  };
}

export function isTaskVisibleForFilters(task: Task, filters: TaskFilters): boolean {
  const statusMatches = filters.statuses.length === 0 || filters.statuses.includes(task.status);
  const tagsMatch = filters.tags.length === 0 || filters.tags.every((tag) => task.tags.includes(tag));

  return statusMatches && tagsMatch;
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function compareTasks(a: Task, b: Task): number {
  const priorityWeight = { high: 0, medium: 1, low: 2 };
  const priorityDelta = priorityWeight[a.priority] - priorityWeight[b.priority];

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return a.createdAt.localeCompare(b.createdAt);
}

function getMonday(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(dateKey, offset);
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
