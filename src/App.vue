<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { addDays, getTaskTiming } from './domain/taskLogic';
import type { Task, TaskPriority, TaskRepeat, TaskStatus } from './domain/types';
import { useTaskStore } from './stores/taskStore';

const store = useTaskStore();

const priorityLabels: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低'
};

const statusLabels: Record<TaskStatus, string> = {
  todo: '待办',
  doing: '进行中',
  done: '完成'
};

const repeatLabels: Record<TaskRepeat, string> = {
  none: '不重复',
  daily: '每日',
  weekly: '每周'
};

const quickTask = reactive({
  title: '',
  plannedDate: '',
  dueDate: '',
  priority: 'medium' as TaskPriority,
  tags: '',
  notes: '',
  repeat: 'none' as TaskRepeat
});

const detailDraft = reactive({
  title: '',
  status: 'todo' as TaskStatus,
  plannedDate: '',
  dueDate: '',
  priority: 'medium' as TaskPriority,
  tags: '',
  notes: '',
  repeat: 'none' as TaskRepeat
});

const showAdvancedQuickAdd = ref(false);
const showCompleted = ref(false);
const activeView = ref<'workbench' | 'kanban'>('workbench');
const draggedTaskId = ref<string | null>(null);
const selectedDate = ref(store.today);

const statusOptions: TaskStatus[] = ['todo', 'doing', 'done'];
const priorityOptions: TaskPriority[] = ['high', 'medium', 'low'];
const repeatOptions: TaskRepeat[] = ['none', 'daily', 'weekly'];

const todayLabel = computed(() => formatDate(store.today));
const selectedDateLabel = computed(() => formatDate(selectedDate.value || store.today));
const selectedDateSectionLabel = computed(() => (selectedDate.value === store.today ? '今日任务' : '计划日期'));
const selectedDateTasks = computed(() =>
  store.activeTasks.filter((task) => task.plannedDate === selectedDate.value)
);
const visibleKanbanColumns = computed(() =>
  statusOptions.map((status) => ({
    status,
    label: statusLabels[status],
    tasks: store.visibleTasks.filter((task) => task.status === status)
  }))
);

onMounted(() => {
  store.loadTasks();
  selectedDate.value = store.today;
  quickTask.plannedDate = store.today;
});

watch(
  () => store.selectedTask,
  (task) => {
    if (!task) {
      clearDetailDraft();
      return;
    }

    detailDraft.title = task.title;
    detailDraft.status = task.status;
    detailDraft.plannedDate = task.plannedDate;
    detailDraft.dueDate = task.dueDate ?? '';
    detailDraft.priority = task.priority;
    detailDraft.tags = task.tags.join(', ');
    detailDraft.notes = task.notes;
    detailDraft.repeat = task.repeat;
  },
  { immediate: true }
);

function addQuickTask() {
  const title = quickTask.title.trim();

  if (!title) {
    return;
  }

  store.addTask({
    title,
    plannedDate: quickTask.plannedDate || store.today,
    dueDate: quickTask.dueDate || null,
    priority: quickTask.priority,
    tags: parseTags(quickTask.tags),
    notes: quickTask.notes.trim(),
    repeat: quickTask.repeat
  });

  quickTask.title = '';
  quickTask.dueDate = '';
  quickTask.tags = '';
  quickTask.notes = '';
  quickTask.priority = 'medium';
  quickTask.repeat = 'none';
  quickTask.plannedDate = selectedDate.value || store.today;
}

function saveDetail() {
  const task = store.selectedTask;
  const title = detailDraft.title.trim();

  if (!task || !title) {
    return;
  }

  store.updateTask(task.id, {
    title,
    status: detailDraft.status,
    plannedDate: detailDraft.plannedDate || store.today,
    dueDate: detailDraft.dueDate || null,
    priority: detailDraft.priority,
    tags: parseTags(detailDraft.tags),
    notes: detailDraft.notes.trim(),
    repeat: detailDraft.repeat,
    completedAt: detailDraft.status === 'done' ? task.completedAt ?? new Date().toISOString() : null
  });
}

function selectDate(offset: number) {
  selectedDate.value = addDays(store.today, offset);
  quickTask.plannedDate = selectedDate.value;
}

function complete(task: Task) {
  store.completeTaskById(task.id);
}

function onDragStart(task: Task) {
  draggedTaskId.value = task.id;
}

function onDrop(status: TaskStatus) {
  if (draggedTaskId.value) {
    store.setTaskStatus(draggedTaskId.value, status);
  }

  draggedTaskId.value = null;
}

function taskTone(task: Task) {
  const timing = getTaskTiming(task, store.today);

  return {
    'is-selected': store.selectedTaskId === task.id,
    'is-overdue': timing.isOverdue,
    'is-due-today': timing.isDueToday,
    'is-done': task.status === 'done'
  };
}

function timingLabel(task: Task) {
  const timing = getTaskTiming(task, store.today);

  if (timing.isOverdue) {
    return '逾期';
  }

  if (timing.isDueToday) {
    return '今天到期';
  }

  if (task.dueDate) {
    return `截止 ${formatDate(task.dueDate)}`;
  }

  return '';
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function clearDetailDraft() {
  detailDraft.title = '';
  detailDraft.status = 'todo';
  detailDraft.plannedDate = store.today;
  detailDraft.dueDate = '';
  detailDraft.priority = 'medium';
  detailDraft.tags = '';
  detailDraft.notes = '';
  detailDraft.repeat = 'none';
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(`${dateKey}T00:00:00`));
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">本机保存 · GitHub Pages 可部署</p>
        <h1>Todo 时间工作台</h1>
      </div>
      <nav class="view-switch" aria-label="视图切换">
        <button :class="{ active: activeView === 'workbench' }" type="button" @click="activeView = 'workbench'">
          工作台
        </button>
        <button :class="{ active: activeView === 'kanban' }" type="button" @click="activeView = 'kanban'">
          看板
        </button>
      </nav>
    </header>

    <main v-if="activeView === 'workbench'" class="workbench-grid">
      <aside class="sidebar panel">
        <section>
          <p class="section-label">日期入口</p>
          <button :class="{ active: selectedDate === store.today }" class="date-tile" type="button" @click="selectDate(0)">
            <strong>今天</strong>
            <span>{{ todayLabel }}</span>
          </button>
          <button
            :class="{ active: selectedDate === addDays(store.today, 1) }"
            class="date-tile"
            type="button"
            @click="selectDate(1)"
          >
            <strong>明天</strong>
            <span>{{ formatDate(addDays(store.today, 1)) }}</span>
          </button>
          <button
            :class="{ active: selectedDate === addDays(store.today, 7) }"
            class="date-tile"
            type="button"
            @click="selectDate(7)"
          >
            <strong>下周</strong>
            <span>{{ formatDate(addDays(store.today, 7)) }}</span>
          </button>
        </section>

        <section>
          <p class="section-label">状态筛选</p>
          <div class="filter-stack">
            <button
              v-for="status in statusOptions"
              :key="status"
              :class="{ active: store.statusFilters.includes(status) }"
              type="button"
              @click="store.toggleStatusFilter(status)"
            >
              {{ statusLabels[status] }}
            </button>
          </div>
        </section>

        <section>
          <p class="section-label">标签筛选</p>
          <div v-if="store.allTags.length" class="tag-cloud">
            <button
              v-for="tag in store.allTags"
              :key="tag"
              :class="{ active: store.tagFilters.includes(tag) }"
              type="button"
              @click="store.toggleTagFilter(tag)"
            >
              {{ tag }}
            </button>
          </div>
          <p v-else class="empty-note">添加任务时输入标签后会显示在这里。</p>
        </section>
      </aside>

      <section class="today-column">
        <form class="quick-add panel" data-test="quick-add" @submit.prevent="addQuickTask">
          <div class="quick-row">
            <input
              v-model="quickTask.title"
              data-test="quick-title"
              type="text"
              placeholder="快速添加一个今天要推进的事项"
              aria-label="任务标题"
            />
            <input v-model="quickTask.plannedDate" data-test="quick-planned-date" type="date" aria-label="计划执行日" />
            <button type="submit">添加</button>
          </div>

          <div class="quick-tools">
            <select v-model="quickTask.priority" aria-label="优先级">
              <option v-for="priority in priorityOptions" :key="priority" :value="priority">
                {{ priorityLabels[priority] }}优先级
              </option>
            </select>
            <button type="button" class="ghost" @click="showAdvancedQuickAdd = !showAdvancedQuickAdd">
              {{ showAdvancedQuickAdd ? '收起' : '更多' }}
            </button>
          </div>

          <div v-if="showAdvancedQuickAdd" class="advanced-fields">
            <input v-model="quickTask.dueDate" type="date" aria-label="截止日期" />
            <input v-model="quickTask.tags" type="text" placeholder="标签，用英文逗号分隔" />
            <select v-model="quickTask.repeat" aria-label="重复规则">
              <option v-for="repeat in repeatOptions" :key="repeat" :value="repeat">
                {{ repeatLabels[repeat] }}
              </option>
            </select>
            <textarea v-model="quickTask.notes" placeholder="备注"></textarea>
          </div>
        </form>

        <section class="panel task-section">
          <div class="section-heading">
            <div>
              <p class="section-label">{{ selectedDateSectionLabel }}</p>
              <h2>{{ selectedDateLabel }}</h2>
            </div>
            <span class="count-pill">{{ selectedDateTasks.length }}</span>
          </div>

          <div v-if="selectedDateTasks.length" class="task-list">
            <article
              v-for="task in selectedDateTasks"
              :key="task.id"
              class="task-card"
              :class="taskTone(task)"
              draggable="true"
              @click="store.selectTask(task.id)"
              @dragstart="onDragStart(task)"
            >
              <div class="task-main">
                <span class="priority-dot" :class="task.priority"></span>
                <strong>{{ task.title }}</strong>
              </div>
              <div class="task-meta">
                <span>{{ statusLabels[task.status] }}</span>
                <span v-if="timingLabel(task)">{{ timingLabel(task) }}</span>
                <span v-if="task.repeat !== 'none'">{{ repeatLabels[task.repeat] }}</span>
              </div>
              <div v-if="task.tags.length" class="inline-tags">
                <span v-for="tag in task.tags" :key="tag">{{ tag }}</span>
              </div>
              <button v-if="task.status !== 'done'" class="complete-button" type="button" @click.stop="complete(task)">
                完成
              </button>
            </article>
          </div>
          <p v-else class="empty-note">这一天还没有安排任务。</p>
        </section>

        <section v-if="store.overdueTasks.length || store.dueTodayTasks.length" class="panel task-section alert-panel">
          <div class="section-heading">
            <div>
              <p class="section-label">视觉提醒</p>
              <h2>到期与逾期</h2>
            </div>
          </div>
          <div class="task-list compact">
            <article
              v-for="task in [...store.overdueTasks, ...store.dueTodayTasks]"
              :key="task.id"
              class="task-card"
              :class="taskTone(task)"
              @click="store.selectTask(task.id)"
            >
              <strong>{{ task.title }}</strong>
              <span>{{ timingLabel(task) }}</span>
            </article>
          </div>
        </section>
      </section>

      <aside class="right-column">
        <section class="panel">
          <div class="section-heading">
            <div>
              <p class="section-label">本周计划</p>
              <h2>按计划执行日分组</h2>
            </div>
          </div>

          <div class="week-list">
            <div v-for="group in store.weekGroups" :key="group.date" class="week-day">
              <div class="week-day-header">
                <strong>{{ group.label }}</strong>
                <span>{{ formatDate(group.date) }}</span>
              </div>
              <button
                v-for="task in group.tasks"
                :key="task.id"
                type="button"
                class="week-task"
                :class="taskTone(task)"
                @click="store.selectTask(task.id)"
              >
                <span>{{ task.title }}</span>
                <small>{{ priorityLabels[task.priority] }}</small>
              </button>
              <p v-if="!group.tasks.length" class="empty-note">无安排</p>
            </div>
          </div>
        </section>

        <section class="panel detail-panel">
          <div class="section-heading">
            <div>
              <p class="section-label">任务详情</p>
              <h2>{{ store.selectedTask ? '编辑任务' : '未选择任务' }}</h2>
            </div>
          </div>

          <form v-if="store.selectedTask" class="detail-form" @submit.prevent="saveDetail">
            <label>
              标题
              <input v-model="detailDraft.title" type="text" />
            </label>
            <div class="detail-grid">
              <label>
                状态
                <select v-model="detailDraft.status">
                  <option v-for="status in statusOptions" :key="status" :value="status">
                    {{ statusLabels[status] }}
                  </option>
                </select>
              </label>
              <label>
                优先级
                <select v-model="detailDraft.priority">
                  <option v-for="priority in priorityOptions" :key="priority" :value="priority">
                    {{ priorityLabels[priority] }}
                  </option>
                </select>
              </label>
              <label>
                计划执行日
                <input v-model="detailDraft.plannedDate" type="date" />
              </label>
              <label>
                截止日期
                <input v-model="detailDraft.dueDate" type="date" />
              </label>
            </div>
            <label>
              标签
              <input v-model="detailDraft.tags" type="text" placeholder="标签，用英文逗号分隔" />
            </label>
            <label>
              重复
              <select v-model="detailDraft.repeat">
                <option v-for="repeat in repeatOptions" :key="repeat" :value="repeat">
                  {{ repeatLabels[repeat] }}
                </option>
              </select>
            </label>
            <label>
              备注
              <textarea v-model="detailDraft.notes"></textarea>
            </label>
            <div class="detail-actions">
              <button type="submit">保存</button>
              <button type="button" class="ghost danger" @click="store.deleteTask(store.selectedTask!.id)">
                删除
              </button>
            </div>
          </form>
          <p v-else class="empty-note">选择任意任务后可在这里查看和编辑。</p>
        </section>
      </aside>
    </main>

    <main v-else class="kanban-view">
      <section
        v-for="column in visibleKanbanColumns"
        :key="column.status"
        class="kanban-column panel"
        @dragover.prevent
        @drop="onDrop(column.status)"
      >
        <div class="section-heading">
          <div>
            <p class="section-label">状态列</p>
            <h2>{{ column.label }}</h2>
          </div>
          <span class="count-pill">{{ column.tasks.length }}</span>
        </div>
        <article
          v-for="task in column.tasks"
          :key="task.id"
          class="task-card"
          :class="taskTone(task)"
          draggable="true"
          @click="store.selectTask(task.id)"
          @dragstart="onDragStart(task)"
        >
          <div class="task-main">
            <span class="priority-dot" :class="task.priority"></span>
            <strong>{{ task.title }}</strong>
          </div>
          <div class="task-meta">
            <span>计划 {{ formatDate(task.plannedDate) }}</span>
            <span v-if="timingLabel(task)">{{ timingLabel(task) }}</span>
          </div>
        </article>
        <p v-if="!column.tasks.length" class="empty-note">拖动任务到这里即可更新状态。</p>
      </section>
    </main>

    <footer v-if="store.completedTasks.length" class="completed-strip">
      <button type="button" class="ghost" @click="showCompleted = !showCompleted">
        {{ showCompleted ? '收起完成记录' : `查看完成记录 (${store.completedTasks.length})` }}
      </button>
      <div v-if="showCompleted" class="completed-list">
        <button
          v-for="task in store.completedTasks"
          :key="task.id"
          type="button"
          class="completed-task"
          @click="store.selectTask(task.id)"
        >
          {{ task.title }}
        </button>
      </div>
    </footer>
  </div>
</template>
