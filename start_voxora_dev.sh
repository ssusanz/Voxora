#!/bin/bash
set -e

echo "=============================="
echo " Voxora 完整开发环境启动脚本 (Expo + Server)"
echo "=============================="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "项目根目录: $ROOT_DIR"

# 1️⃣ 安装 pnpm（如果未安装）
if ! command -v pnpm &> /dev/null
then
    echo "pnpm 未安装，正在安装..."
    npm install -g pnpm
else
    echo "pnpm 已安装 ✅"
fi

# 2️⃣ 安装依赖
echo "安装根工作区依赖..."
pnpm install

echo "安装客户端依赖..."
cd "$ROOT_DIR/client"
pnpm install

echo "安装服务端依赖..."
cd "$ROOT_DIR/server"
pnpm install

# 3️⃣ 初始化数据库（可选）
if [ -f "$ROOT_DIR/server/src/storage/database/shared/schema.ts" ]; then
    echo "初始化数据库（如果需要）..."
    node src/storage/database/shared/schema.ts || true
fi

# 4️⃣ 启动后端服务
echo "启动后端服务..."
cd "$ROOT_DIR"
nohup bash .cozeproj/scripts/dev_run.sh > "$ROOT_DIR/logs/server.log" 2>&1 &

# 5️⃣ 启动前端客户端 (Expo / React Native)
echo "启动前端客户端 (Expo / Metro)..."
cd "$ROOT_DIR/client"
nohup pnpm run start > "$ROOT_DIR/logs/client.log" 2>&1 &

# 6️⃣ 提示信息
echo "=============================="
echo "Voxora 开发环境已启动 🎉"
echo "前端客户端: http://localhost:5000 (Expo / React Native Metro)"
echo "后端服务: http://localhost:19091 (Server Dev Run 默认端口)"
echo "日志文件: "
echo "  后端 -> $ROOT_DIR/logs/server.log"
echo "  前端 -> $ROOT_DIR/logs/client.log"
echo "=============================="
