---
title: TODO List · 带持久化后端
emoji: ✅
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
---

# TODO List Web 应用

简洁的待办清单页面，支持标题、备注、网址，链接可在新标签页打开。  
本地运行时数据存储在 `data/todos.json`，部署到 Hugging Face 时可写入 Hub 仓库实现真正持久化。

## 功能
- 添加/编辑/删除待办，支持完成状态切换
- 备注与可点击的网址（新标签页打开）
- 列表卡片自适应多列布局
- 后端持久化：
  - 默认：本地 JSON 文件 `data/todos.json`
  - Hugging Face：写入 Hub 仓库中的 `data/todos.json`

## 快速开始
```bash
npm install
npm start
```
默认服务：`http://localhost:3000`

## 目录结构
- `server.js`：Express 后端与 API
- `public/`：前端页面、样式、脚本
- `data/todos.json`：本地开发时的待办数据存储文件（在 Hugging Face 上默认使用 Hub 仓库存储）

## API 简要
- `GET /api/todos`：获取全部待办
- `POST /api/todos`：创建待办，body `{ title, note?, url? }`
- `PATCH /api/todos/:id`：更新任意字段 `{ title?, note?, url?, completed? }`
- `DELETE /api/todos/:id`：删除待办

## 在 Hugging Face Spaces 部署

本项目已适配 Hugging Face Docker Space，只需：

1. 在 Hugging Face 创建 Space  
   - 类型：`Docker`  
   - 将本仓库代码推送到该 Space 仓库（包含 `Dockerfile`）
2. Space 会自动根据 `Dockerfile` 构建镜像并运行：  
   - 运行环境：`node:20-alpine`  
   - 暴露端口：`7860`（与 `server.js` 中的 `PORT` 环境变量对齐）

### 持久化存储配置（免费版可用）

通过 Hugging Face Hub 仓库保存 `todos.json`，实现跨重启的持久化：

在 Space 的 Settings → Variables and secrets 中添加环境变量：

- `HF_TOKEN`（必填）：  
  - 你的 Hugging Face Access Token，需具备对应仓库的写权限，建议设置为 Secret。
- `HF_REPO_ID`（可选）：  
  - 写入的仓库 ID，如：`your-name/todo-data`。  
  - 不设置时默认使用当前 Space 的 `SPACE_ID`（即把 Space 自己当作存储仓库，类型为 `space`）。
- `HF_REPO_TYPE`（可选）：  
  - `dataset` / `space` / `model`，默认 `space`。
- `HF_REPO_FILE`（可选）：  
  - 仓库中的文件路径，默认 `data/todos.json`。

存储策略：

- 若 `HF_TOKEN` 和 `HF_REPO_ID` / `SPACE_ID` 配置完整：  
  - 读写优先使用 Hub 仓库中的 `HF_REPO_FILE`。  
  - 远端文件不存在时默认视为 `[]`（空列表）。  
  - 写入失败时会自动退回到本地 `data/todos.json`。
- 未配置或配置不完整时：  
  - 仅使用本地 `data/todos.json`，重启容器后数据会丢失。

## 说明
- 未知的 `/api/` 路径返回 404，其余路径回退到单页前端。
- 前端添加按钮在列表卡片右上角，点击弹出添加窗口。
