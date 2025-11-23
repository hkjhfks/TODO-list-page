# TODO List Web 应用

简洁的待办清单页面，支持标题、备注、网址，链接可在新标签页打开，数据存储在后端文件中。

## 功能
- 添加/编辑/删除待办，支持完成状态切换
- 备注与可点击的网址（新标签页打开）
- 列表卡片自适应多列布局
- 后端文件持久化：`data/todos.json`

## 快速开始
```bash
npm install
npm start
```
默认服务：`http://localhost:3000`

## 目录结构
- `server.js`：Express 后端与 API
- `public/`：前端页面、样式、脚本
- `data/todos.json`：待办数据存储文件

## API 简要
- `GET /api/todos`：获取全部待办
- `POST /api/todos`：创建待办，body `{ title, note?, url? }`
- `PATCH /api/todos/:id`：更新任意字段 `{ title?, note?, url?, completed? }`
- `DELETE /api/todos/:id`：删除待办

## 说明
- 未知的 `/api/` 路径返回 404，其余路径回退到单页前端。
- 前端添加按钮在列表卡片右上角，点击弹出添加窗口。
