# Todo 时间工作台

一个前端优先的日常事务管理看板，使用 Vue + Vite + Pinia 构建。配置 Supabase 后，任务会保存到数据库；未配置 Supabase 时会回退到当前浏览器的 localStorage。

## 功能

- 三栏时间工作台：首页聚焦日期入口、今日任务、本周计划和任务详情。
- 快速添加：默认计划执行日为今天，支持优先级、截止日期、标签、备注和简单重复。
- 视觉提醒：未完成任务会按截止日期标记逾期和今天到期。
- 辅助看板：待办、进行中、完成三列，支持拖拽任务更新状态。
- 简单重复：每日/每周任务完成后自动生成下一次任务。
- 数据保存：支持 Supabase Auth + Database；未配置时使用 localStorage 回退。

## 本地开发

```bash
npm install
npm run dev
```

## Supabase 配置

本地开发使用 `.env.local`：

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

当前应用使用 Supabase Magic Link 登录。登录后的任务数据按 Supabase Auth 用户隔离，只能读写自己的任务。

## 验证

```bash
npm test
npm run build
```

## GitHub Pages

项目使用 `base: './'`，构建产物是纯静态文件，可以发布到 GitHub Pages。推送到 `main` 后，仓库开启 Pages 并选择 GitHub Actions 即可使用内置工作流部署。

在 GitHub 仓库里添加两个 Actions secrets：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

如果使用 Magic Link 登录，还需要在 Supabase Dashboard 的 Auth URL 配置里允许你的 GitHub Pages 地址作为 redirect URL。

注意：未配置 Supabase 环境变量时，任务数据只保存在访问该页面的当前浏览器中，清除浏览器数据会删除任务。
# kanban-board
