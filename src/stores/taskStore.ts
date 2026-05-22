import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  compareTasks,
  completeTask,
  createTask,
  getTaskTiming,
  groupTasksByWeekday,
  isTaskVisibleForFilters,
  toDateKey
} from '../domain/taskLogic';
import type { Task, TaskFilters, TaskPriority, TaskRepeat, TaskStatus } from '../domain/types';
import { createDefaultTaskRepository } from '../services/supabaseClient';
import type { TaskRepository } from '../services/taskRepository';

export const STORAGE_KEY = 'todo-time-workbench:tasks';

export interface TaskDraft {
  title: string;
  plannedDate?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  tags?: string[];
  notes?: string;
  repeat?: TaskRepeat;
}

const localTaskRepository: TaskRepository = {
  async loadTasks() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? safeParseTasks(saved) : [];
  },

  async saveTasks(tasksToSave) {
    const saved = localStorage.getItem(STORAGE_KEY);
    const existing = saved ? safeParseTasks(saved) : [];
    const merged = [...tasksToSave, ...existing.filter((task) => !tasksToSave.some((item) => item.id === task.id))];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  },

  async deleteTask(id) {
    const saved = localStorage.getItem(STORAGE_KEY);
    const existing = saved ? safeParseTasks(saved) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((task) => task.id !== id)));
  }
};

let taskRepository: TaskRepository = createDefaultTaskRepository(localTaskRepository);

export function setTaskRepositoryForTests(repository: TaskRepository) {
  taskRepository = repository;
}

export function resetTaskRepositoryForTests() {
  taskRepository = localTaskRepository;
}

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const selectedTaskId = ref<string | null>(null);
  const statusFilters = ref<TaskStatus[]>([]);
  const tagFilters = ref<string[]>([]);
  const today = computed(() => toDateKey(new Date()));

  const filters = computed<TaskFilters>(() => ({
    statuses: statusFilters.value,
    tags: tagFilters.value
  }));

  const visibleTasks = computed(() =>
    tasks.value.filter((task) => isTaskVisibleForFilters(task, filters.value)).sort(compareTasks)
  );

  const activeTasks = computed(() => visibleTasks.value.filter((task) => task.status !== 'done'));
  const completedTasks = computed(() => visibleTasks.value.filter((task) => task.status === 'done'));

  const overdueTasks = computed(() =>
    activeTasks.value.filter((task) => getTaskTiming(task, today.value).isOverdue)
  );

  const todayTasks = computed(() =>
    activeTasks.value.filter((task) => task.plannedDate === today.value).sort(compareTasks)
  );

  const dueTodayTasks = computed(() =>
    activeTasks.value.filter((task) => getTaskTiming(task, today.value).isDueToday).sort(compareTasks)
  );

  const weekGroups = computed(() => groupTasksByWeekday(visibleTasks.value, today.value));
  const allTags = computed(() => Array.from(new Set(tasks.value.flatMap((task) => task.tags))).sort());
  const selectedTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value) ?? null);

  async function loadTasks() {
    tasks.value = await taskRepository.loadTasks();
    selectedTaskId.value = tasks.value[0]?.id ?? null;
  }

  function persist(tasksToSave: Task[]) {
    void taskRepository.saveTasks(tasksToSave);
  }

  function addTask(draft: TaskDraft): Task {
    const task = createTask({
      title: draft.title,
      plannedDate: draft.plannedDate,
      dueDate: draft.dueDate ?? null,
      priority: draft.priority,
      tags: draft.tags ?? [],
      notes: draft.notes,
      repeat: draft.repeat
    });

    tasks.value = [task, ...tasks.value];
    selectedTaskId.value = task.id;
    persist([task]);
    return task;
  }

  function updateTask(id: string, patch: Partial<Task>) {
    let updatedTask: Task | null = null;
    tasks.value = tasks.value.map((task) => (task.id === id ? { ...task, ...patch } : task));
    updatedTask = tasks.value.find((task) => task.id === id) ?? null;
    if (updatedTask) {
      persist([updatedTask]);
    }
  }

  function deleteTask(id: string) {
    tasks.value = tasks.value.filter((task) => task.id !== id);
    if (selectedTaskId.value === id) {
      selectedTaskId.value = tasks.value[0]?.id ?? null;
    }
    void taskRepository.deleteTask(id);
  }

  function completeTaskById(id: string) {
    const task = tasks.value.find((item) => item.id === id);
    if (!task) {
      return;
    }

    const result = completeTask(task);
    tasks.value = tasks.value.map((item) => (item.id === id ? result.completed : item));

    if (result.nextTask) {
      tasks.value = [result.nextTask, ...tasks.value];
    }

    persist(result.nextTask ? [result.completed, result.nextTask] : [result.completed]);
  }

  function setTaskStatus(id: string, status: TaskStatus) {
    if (status === 'done') {
      completeTaskById(id);
      return;
    }

    updateTask(id, { status, completedAt: null });
  }

  function selectTask(id: string | null) {
    selectedTaskId.value = id;
  }

  function toggleStatusFilter(status: TaskStatus) {
    statusFilters.value = statusFilters.value.includes(status)
      ? statusFilters.value.filter((item) => item !== status)
      : [...statusFilters.value, status];
  }

  function toggleTagFilter(tag: string) {
    tagFilters.value = tagFilters.value.includes(tag)
      ? tagFilters.value.filter((item) => item !== tag)
      : [...tagFilters.value, tag];
  }

  return {
    tasks,
    selectedTaskId,
    statusFilters,
    tagFilters,
    today,
    visibleTasks,
    activeTasks,
    completedTasks,
    overdueTasks,
    todayTasks,
    dueTodayTasks,
    weekGroups,
    allTags,
    selectedTask,
    loadTasks,
    persist,
    addTask,
    updateTask,
    deleteTask,
    completeTaskById,
    setTaskStatus,
    selectTask,
    toggleStatusFilter,
    toggleTagFilter
  };
});

function safeParseTasks(serialized: string): Task[] {
  try {
    const parsed = JSON.parse(serialized);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
