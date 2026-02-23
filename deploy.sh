#!/bin/bash

# 任务排班系统 - 阿里云部署脚本
# 请在服务器上运行此脚本

echo "========================================"
echo "  任务排班系统 - 部署脚本"
echo "========================================"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    echo "运行: sudo su -"
    exit 1
fi

echo -e "${YELLOW}开始安装环境...${NC}"

# 1. 安装 Node.js
echo -e "${YELLOW}[1/5] 安装 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    echo -e "${GREEN}Node.js 安装完成${NC}"
else
    echo -e "${GREEN}Node.js 已安装: $(node -v)${NC}"
fi

# 2. 安装 PM2
echo -e "${YELLOW}[2/5] 安装 PM2 进程管理器...${NC}"
npm install -g pm2
echo -e "${GREEN}PM2 安装完成${NC}"

# 3. 创建应用目录
echo -e "${YELLOW}[3/5] 创建应用目录...${NC}"
APP_DIR="/var/www/task-app"
mkdir -p $APP_DIR
cd $APP_DIR
echo -e "${GREEN}应用目录创建完成: $APP_DIR${NC}"

# 4. 上传项目文件
echo -e "${YELLOW}[4/5] 准备上传文件...${NC}"
echo -e "${GREEN}请将以下文件上传到 $APP_DIR 目录:${NC}"
echo "  - server.js"
echo "  - package.json"
echo "  - index.html"
echo "  - script.js"
echo "  - style.css"
echo ""
echo -e "${YELLOW}上传完成后，请按回车继续...${NC}"
read

# 5. 安装依赖并启动
echo -e "${YELLOW}[5/5] 安装依赖并启动服务...${NC}"
cd $APP_DIR

if [ ! -f "package.json" ]; then
    echo -e "${RED}未找到 package.json，请先上传文件${NC}"
    exit 1
fi

npm install

# 停止旧进程
pm2 delete task-app 2>/dev/null

# 启动服务
pm2 start server.js --name task-app
pm2 save

# 设置开机自启
pm2 startup > /dev/null 2>&1
PM2_STARTUP=$(pm2 startup | grep "sudo env")
if [ -n "$PM2_STARTUP" ]; then
    echo "$PM2_STARTUP"
fi

echo ""
echo "========================================"
echo -e "${GREEN}  部署完成！${NC}"
echo "========================================"
echo ""
echo -e "访问地址: ${GREEN}http://47.85.12.207:3001${NC}"
echo ""
echo "常用命令:"
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs"
echo "  重启服务: pm2 restart task-app"
echo "  停止服务: pm2 stop task-app"
echo ""
