import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.vue';

describe('App workbench', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T08:00:00.000Z'));
    setActivePinia(createPinia());
  });

  it('renders the time workbench and adds a task from the quick input', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });

    expect(wrapper.text()).toContain('Todo 时间工作台');
    expect(wrapper.text()).toContain('今日任务');
    expect(wrapper.text()).toContain('本周计划');

    await wrapper.get('[data-test="quick-title"]').setValue('完成项目首页');
    await wrapper.get('[data-test="quick-add"]').trigger('submit');

    expect(wrapper.text()).toContain('完成项目首页');
    expect(JSON.parse(localStorage.getItem('todo-time-workbench:tasks') ?? '[]')).toHaveLength(1);
  });

  it('switches the date entry to tomorrow and adds tasks to that selected date', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });

    const tomorrowButton = wrapper.findAll('button').find((button) => button.text().includes('明天'));

    expect(tomorrowButton).toBeTruthy();
    await tomorrowButton!.trigger('click');

    expect((wrapper.get('input[type="date"]').element as HTMLInputElement).value).toBe('2026-05-22');
    expect(wrapper.text()).toContain('计划日期');
    expect(wrapper.text()).toContain('5月22日');

    await wrapper.get('[data-test="quick-title"]').setValue('明天跟进设计');
    await wrapper.get('[data-test="quick-add"]').trigger('submit');

    const savedTasks = JSON.parse(localStorage.getItem('todo-time-workbench:tasks') ?? '[]');
    expect(savedTasks[0]).toMatchObject({
      title: '明天跟进设计',
      plannedDate: '2026-05-22'
    });
    expect(wrapper.text()).toContain('明天跟进设计');
  });
});
