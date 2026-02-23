# 从 GitHub 迁移到阿里云代码托管平台指南

本文档详细介绍如何将您的 Weekly Task Planner 项目从 GitHub 迁移到阿里云代码托管平台，并配置相应的 CI/CD 流水线。

## 步骤 1: 在阿里云代码托管平台创建项目

1. 登录阿里云控制台
2. 进入云效 DevOps 平台
3. 点击"创建代码仓库"
4. 选择合适的项目名称（例如：weekly-task-planner）
5. 选择代码库类型（推荐 Git）

## 步骤 2: 迁移代码

您可以使用以下两种方法之一迁移代码：

### 方法一：克隆后推送
```bash
# 克隆现有 GitHub 仓库
git clone https://github.com/doashoi/weekly-task-planner.git
cd weekly-task-planner

# 添加阿里云代码仓库为远程源
git remote add aliyun <阿里云代码仓库地址>

# 推送所有分支和标签到阿里云
git push -u aliyun --all
git push -u aliyun --tags
```

### 方法二：直接修改远程源
```bash
# 在现有仓库中修改远程源
git remote set-url origin <阿里云代码仓库地址>

# 推送代码
git push -u origin --all
git push -u origin --tags
```

## 步骤 3: 配置 CI/CD 变量

在阿里云代码托管平台中配置以下 CI/CD 变量：

1. 进入项目设置
2. 找到 CI/CD 或流水线设置
3. 配置以下变量（建议启用保密选项）：
   - `HOST`: 您的阿里云轻量级服务器 IP 地址
   - `PORT`: SSH 端口（通常是 22）
   - `USERNAME`: 服务器登录用户名
   - `SSH_PRIVATE_KEY`: 用于 SSH 连接的私钥内容

### 如何生成和配置 SSH 密钥
```bash
# 在本地生成 SSH 密钥对（如果还没有的话）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/id_rsa.pub username@your_server_ip

# 或者手动复制公钥到服务器
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```

然后将私钥内容复制到阿里云代码托管平台的 CI/CD 变量中。

## 步骤 4: 选择 CI/CD 配置文件

项目根目录包含多个 CI/CD 配置文件，请根据您使用的阿里云 DevOps 版本选择一个：

- `.gitlab-ci.yml`: 适用于兼容 GitLab CI 的阿里云代码托管平台
- `pipeline.yaml`: 适用于阿里云原生流水线
- `aliyun-pipeline.yml`: 阿里云特定格式的流水线配置

推荐优先使用 `.gitlab-ci.yml` 文件，因为它兼容性最好。

## 步骤 5: 验证配置

1. 提交并推送包含 CI/CD 配置文件的代码
2. 在阿里云代码托管平台检查流水线是否正确触发
3. 观察部署过程是否成功

## 步骤 6: 更新 package.json 中的仓库信息

将 package.json 中的仓库地址更新为阿里云代码仓库地址：

```json
{
  "repository": {
    "type": "git",
    "url": "<阿里云代码仓库地址>"
  }
}
```

## 可能遇到的问题及解决方案

### 问题 1: SSH 连接失败
- 检查服务器防火墙是否开放了 SSH 端口
- 确认 SSH 私钥格式正确且权限设置正确
- 确认服务器允许 SSH 密钥认证

### 问题 2: 权限不足
- 确保服务器用户具有对 `/var/www/task-app` 目录的操作权限
- 确认 PM2 已正确安装并可以由该用户运行

### 问题 3: 部署脚本执行失败
- 检查服务器上的 Node.js 和 PM2 是否已正确安装
- 确认服务器上有 `git`、`npm` 等必要工具

## 回滚计划

如果迁移过程中出现问题，可以通过以下方式进行回滚：

1. 使用备份恢复服务器状态
2. 临时切换回 GitHub Actions 部署
3. 重新配置部署路径到 GitHub 仓库

## 注意事项

- 保留原始的 `.github/workflows/deploy.yml` 文件一段时间，以便必要时回滚
- 确保阿里云代码仓库设置为私有（如需要）
- 定期备份服务器上的重要数据
- 监控首次迁移后的应用运行状态

## 验证清单

迁移完成后，请验证以下各项：

- [ ] 代码成功推送到阿里云代码托管平台
- [ ] CI/CD 流水线能正常触发
- [ ] 应用成功部署到服务器
- [ ] 应用功能正常运行
- [ ] 数据持久化正常工作
- [ ] 自动部署流程在代码推送后正常执行