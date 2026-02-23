# Weekly Task Planner

> 周任务计划系统 - 实时协作工具

## 简介

Weekly Task Planner 是一个基于 Web 的任务分配与协作系统，支持多人实时同步编辑任务安排。

## 功能

- **周任务管理** - 每周一至周五的任务板块划分
- **人员分配** - 拖拽式人员分配到任务板块
- **实时协作** - 多用户同时操作，实时同步
- **任务追踪** - 待办事项勾选与进度显示
- **数据备份** - 支持导出/导入 JSON 格式数据

## 技术架构

| 层级 | 技术 |
|-----|------|
| 后端 | Node.js + Express |
| 实时通信 | Socket.io |
| 前端 | 原生 JavaScript + CSS3 |

## 访问

**生产环境**: http://47.85.12.207:3001

## 快速开始

### 本地运行

```bash
# 克隆项目
git clone https://github.com/doashoi/weekly-task-planner.git
cd weekly-task-planner

# 安装依赖
npm install

# 启动服务
npm start

# 访问 http://localhost:3001
```

### 部署

详见 [部署文档](#部署指南)

## 项目结构

```
weekly-task-planner/
├── server.js           # Express 服务器 + Socket.io
├── index.html          # 前端页面入口
├── script.js           # 前端业务逻辑
├── style.css           # 样式文件
├── package.json        # 项目依赖
├── README.md           # 项目说明
└── .github/
    └── workflows/
        └── deploy.yml  # CI/CD 自动部署
```

## 部署指南

### 服务器环境要求

- Node.js 14+
- PM2 进程管理器
- 服务器系统：Ubuntu/CentOS

### 手动部署

```bash
# 1. 创建目录
mkdir -p /var/www/task-app
cd /var/www/task-app

# 2. 安装依赖
npm install

# 3. 启动服务
pm2 start server.js --name task-app

# 4. 设置开机自启
pm2 save
pm2 startup
```

### 自动部署

推送到 `main` 分支自动触发部署（需配置 GitHub Secrets）。

## 数据存储

生产环境数据保存在服务器本地：

- 路径：`/var/www/task-app/data.json`
- 格式：JSON

建议定期通过前端界面的「数据管理」功能导出备份。

## 许可证

MIT License
