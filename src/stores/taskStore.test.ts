import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { resetTaskRepositoryForTests, setTaskRepositoryForTests, useTaskStore } from './taskStore';
import type { Task } from '../domain/types';

describe('task store persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T08:00:00.000Z'));
    resetTaskRepositoryForTests();
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

  it('restores saved tasks on demand', async () => {
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
    await store.loadTasks();

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

  it('loads and saves tasks through a configured remote repository', async () => {
    const remoteTask = taskFactory({ id: 'remote', title: '远程任务' });
    const repository = {
      loadTasks: vi.fn().mockResolvedValue([remoteTask]),
      saveTasks: vi.fn().mockResolvedValue(undefined),
      deleteTask: vi.fn().mockResolvedValue(undefined)
    };
    setTaskRepositoryForTests(repository);

    const store = useTaskStore();
    await store.loadTasks();
    const task = store.addTask({ title: '同步任务' });

    expect(store.tasks[0]).toMatchObject({ title: '同步任务' });
    expect(repository.loadTasks).toHaveBeenCalled();
    expect(repository.saveTasks).toHaveBeenCalledWith([expect.objectContaining({ id: task.id })]);
    expect(localStorage.getItem('todo-time-workbench:tasks')).toBeNull();
  });

  it('does not migrate existing local tasks when remote storage is empty', async () => {
    const localTask = taskFactory({ id: 'local-old', title: '本地旧任务' });
    localStorage.setItem('todo-time-workbench:tasks', JSON.stringify([localTask]));
    const repository = {
      loadTasks: vi.fn().mockResolvedValue([]),
      saveTasks: vi.fn().mockResolvedValue(undefined),
      deleteTask: vi.fn().mockResolvedValue(undefined)
    };
    setTaskRepositoryForTests(repository);

    const store = useTaskStore();
    await store.loadTasks();

    expect(store.tasks).toEqual([]);
    expect(repository.saveTasks).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('todo-time-workbench:tasks') ?? '[]')).toEqual([localTask]);
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
