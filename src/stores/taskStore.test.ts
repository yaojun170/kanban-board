import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTaskStore } from './taskStore';

describe('task store persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T08:00:00.000Z'));
  });

  it('adds a task and persists it to localStorage', () => {
    const store = useTaskStore();

    const task = store.addTask({ title: '整理收件箱', tags: ['工作'], dueDate: '2026-05-21' });

    expect(store.tasks).toHaveLength(1);
    expect(task.plannedDate).toBe('2026-05-21');
    expect(JSON.parse(localStorage.getItem('todo-time-workbench:tasks') ?? '[]')).toMatchObject([
      { title: '整理收件箱', tags: ['工作'], dueDate: '2026-05-21' }
    ]);
  });

  it('restores saved tasks on demand', () => {
    localStorage.setItem(
      'todo-time-workbench:tasks',
      JSON.stringify([
        {
          id: 'saved',
          title: '保存的任务',
          status: 'doing',
          plannedDate: '2026-05-21',
          dueDate: null,
          priority: 'high',
          tags: [],
          notes: '',
          repeat: 'none',
          createdAt: '2026-05-20T00:00:00.000Z',
          completedAt: null
        }
      ])
    );

    const store = useTaskStore();
    store.loadTasks();

    expect(store.tasks).toHaveLength(1);
    expect(store.tasks[0]).toMatchObject({ id: 'saved', title: '保存的任务', status: 'doing' });
  });

  it('completes recurring tasks and persists the generated next task', () => {
    const store = useTaskStore();
    const task = store.addTask({ title: '晨间复盘', repeat: 'daily', dueDate: '2026-05-21' });

    store.completeTaskById(task.id);

    expect(store.tasks).toHaveLength(2);
    expect(store.tasks.find((item) => item.id === task.id)).toMatchObject({
      status: 'done',
      completedAt: '2026-05-21T08:00:00.000Z'
    });
    expect(store.tasks.find((item) => item.id !== task.id)).toMatchObject({
      title: '晨间复盘',
      status: 'todo',
      plannedDate: '2026-05-22',
      dueDate: '2026-05-22'
    });
    expect(JSON.parse(localStorage.getItem('todo-time-workbench:tasks') ?? '[]')).toHaveLength(2);
  });
});
