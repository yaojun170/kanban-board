import { describe, expect, it, vi } from 'vitest';
import { createSupabaseTaskRepository, fromTaskRow, toTaskRow } from './taskRepository';
import type { Task } from '../domain/types';

describe('task repository', () => {
  it('maps tasks to Supabase rows and back', () => {
    const task = taskFactory({ id: 'mapped', title: '映射任务', dueDate: '2026-05-22', tags: ['工作'] });

    const row = toTaskRow(task);

    expect(row).toMatchObject({
      id: 'mapped',
      title: '映射任务',
      planned_date: '2026-05-21',
      due_date: '2026-05-22',
      completed_at: null
    });
    expect(fromTaskRow(row)).toEqual(task);
  });

  it('loads tasks from Supabase ordered by creation time', async () => {
    const select = vi.fn(() => query);
    const order = vi.fn(() => Promise.resolve({ data: [toTaskRow(taskFactory({ id: 'remote' }))], error: null }));
    const query = { select, order };
    const client = { from: vi.fn(() => query) };
    const repository = createSupabaseTaskRepository(client);

    const tasks = await repository.loadTasks();

    expect(client.from).toHaveBeenCalledWith('tasks');
    expect(select).toHaveBeenCalledWith('*');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('remote');
  });

  it('upserts and deletes tasks in Supabase', async () => {
    const upsert = vi.fn(() => Promise.resolve({ error: null }));
    const eq = vi.fn(() => Promise.resolve({ error: null }));
    const deleteBuilder = { eq };
    const table = {
      upsert,
      delete: vi.fn(() => deleteBuilder)
    };
    const client = { from: vi.fn(() => table) };
    const repository = createSupabaseTaskRepository(client);

    await repository.saveTasks([taskFactory({ id: 'saved' })]);
    await repository.deleteTask('saved');

    expect(upsert).toHaveBeenCalledWith([expect.objectContaining({ id: 'saved' })], { onConflict: 'id' });
    expect(table.delete).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 'saved');
  });
});

function taskFactory(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-id',
    title: '测试任务',
    status: 'todo',
    plannedDate: '2026-05-21',
    dueDate: null,
    priority: 'medium',
    tags: [],
    notes: '',
    repeat: 'none',
    createdAt: '2026-05-21T00:00:00.000Z',
    completedAt: null,
    ...overrides
  };
}
