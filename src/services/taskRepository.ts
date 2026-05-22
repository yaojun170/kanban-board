import type { Task, TaskPriority, TaskRepeat, TaskStatus } from '../domain/types';

export interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  planned_date: string;
  due_date: string | null;
  priority: TaskPriority;
  tags: string[];
  notes: string;
  repeat: TaskRepeat;
  created_at: string;
  completed_at: string | null;
}

interface SupabaseQueryResult<T> {
  data?: T | null;
  error?: { message?: string } | null;
}

export interface SupabaseLikeClient {
  from(table: string): any;
}

export interface TaskRepository {
  loadTasks(): Promise<Task[]>;
  saveTasks(tasks: Task[]): Promise<void>;
  deleteTask(id: string): Promise<void>;
}

export function createSupabaseTaskRepository(client: SupabaseLikeClient): TaskRepository {
  return {
    async loadTasks() {
      const { data, error } = await client.from('tasks').select('*').order('created_at', { ascending: false });
      throwIfSupabaseError(error);
      return (data ?? []).map(fromTaskRow);
    },

    async saveTasks(tasks) {
      if (!tasks.length) {
        return;
      }

      const { error } = await client.from('tasks').upsert(tasks.map(toTaskRow), { onConflict: 'id' });
      throwIfSupabaseError(error);
    },

    async deleteTask(id) {
      const { error } = await client.from('tasks').delete().eq('id', id);
      throwIfSupabaseError(error);
    }
  };
}

export function toTaskRow(task: Task): TaskRow {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    planned_date: task.plannedDate,
    due_date: task.dueDate,
    priority: task.priority,
    tags: task.tags,
    notes: task.notes,
    repeat: task.repeat,
    created_at: task.createdAt,
    completed_at: task.completedAt
  };
}

export function fromTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    plannedDate: row.planned_date,
    dueDate: row.due_date,
    priority: row.priority,
    tags: row.tags ?? [],
    notes: row.notes ?? '',
    repeat: row.repeat,
    createdAt: row.created_at,
    completedAt: row.completed_at
  };
}

function throwIfSupabaseError(error: SupabaseQueryResult<unknown>['error']) {
  if (error) {
    throw new Error(error.message ?? 'Supabase request failed');
  }
}
