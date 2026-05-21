export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskRepeat = 'none' | 'daily' | 'weekly';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  plannedDate: string;
  dueDate: string | null;
  priority: TaskPriority;
  tags: string[];
  notes: string;
  repeat: TaskRepeat;
  createdAt: string;
  completedAt: string | null;
}

export interface TaskFilters {
  statuses: TaskStatus[];
  tags: string[];
}

export interface WeekdayTaskGroup {
  date: string;
  label: string;
  tasks: Task[];
}

export interface TaskTiming {
  isOverdue: boolean;
  isDueToday: boolean;
}
