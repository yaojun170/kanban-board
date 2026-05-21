import { describe, expect, it } from 'vitest';
import {
  addDays,
  completeTask,
  createTask,
  getTaskTiming,
  groupTasksByWeekday,
  isTaskVisibleForFilters
} from './taskLogic';
import type { Task } from './types';

describe('task domain logic', () => {
  it('creates a task with time-workbench defaults', () => {
    const task = createTask({ title: '写周计划' }, '2026-05-21');

    expect(task.title).toBe('写周计划');
    expect(task.status).toBe('todo');
    expect(task.plannedDate).toBe('2026-05-21');
    expect(task.priority).toBe('medium');
    expect(task.repeat).toBe('none');
    expect(task.tags).toEqual([]);
    expect(task.completedAt).toBeNull();
  });

  it('marks overdue and due-today tasks from dueDate only', () => {
    const overdue = taskFactory({ dueDate: '2026-05-20', plannedDate: '2026-05-30' });
    const today = taskFactory({ dueDate: '2026-05-21', plannedDate: '2026-05-30' });
    const done = taskFactory({ dueDate: '2026-05-20', status: 'done' });

    expect(getTaskTiming(overdue, '2026-05-21')).toMatchObject({ isOverdue: true, isDueToday: false });
    expect(getTaskTiming(today, '2026-05-21')).toMatchObject({ isOverdue: false, isDueToday: true });
    expect(getTaskTiming(done, '2026-05-21')).toMatchObject({ isOverdue: false, isDueToday: false });
  });

  it('groups unfinished tasks by planned weekday for the current week', () => {
    const tasks = [
      taskFactory({ id: 'monday', title: '周一事项', plannedDate: '2026-05-18' }),
      taskFactory({ id: 'today', title: '今天事项', plannedDate: '2026-05-21' }),
      taskFactory({ id: 'next-week', title: '下周事项', plannedDate: '2026-05-25' }),
      taskFactory({ id: 'done', title: '完成事项', plannedDate: '2026-05-21', status: 'done' })
    ];

    const groups = groupTasksByWeekday(tasks, '2026-05-21');

    expect(groups.map((group) => group.date)).toEqual([
      '2026-05-18',
      '2026-05-19',
      '2026-05-20',
      '2026-05-21',
      '2026-05-22',
      '2026-05-23',
      '2026-05-24'
    ]);
    expect(groups[0].tasks.map((task) => task.id)).toEqual(['monday']);
    expect(groups[3].tasks.map((task) => task.id)).toEqual(['today']);
    expect(groups.flatMap((group) => group.tasks.map((task) => task.id))).not.toContain('done');
    expect(groups.flatMap((group) => group.tasks.map((task) => task.id))).not.toContain('next-week');
  });

  it('keeps completed recurring task and creates the next planned instance', () => {
    const daily = taskFactory({
      id: 'daily',
      repeat: 'daily',
      plannedDate: '2026-05-21',
      dueDate: '2026-05-21',
      tags: ['健康']
    });

    const result = completeTask(daily, '2026-05-21T10:00:00.000Z');

    expect(result.completed.status).toBe('done');
    expect(result.completed.completedAt).toBe('2026-05-21T10:00:00.000Z');
    expect(result.nextTask).toMatchObject({
      title: daily.title,
      status: 'todo',
      plannedDate: '2026-05-22',
      dueDate: '2026-05-22',
      repeat: 'daily',
      tags: ['健康'],
      completedAt: null
    });
    expect(result.nextTask?.id).not.toBe(daily.id);
  });

  it('filters by selected status and tags', () => {
    const task = taskFactory({ status: 'doing', tags: ['工作', '沟通'] });

    expect(isTaskVisibleForFilters(task, { statuses: ['doing'], tags: ['工作'] })).toBe(true);
    expect(isTaskVisibleForFilters(task, { statuses: ['todo'], tags: ['工作'] })).toBe(false);
    expect(isTaskVisibleForFilters(task, { statuses: ['doing'], tags: ['学习'] })).toBe(false);
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
