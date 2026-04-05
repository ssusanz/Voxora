#!/bin/bash
set -e

echo "=============================="
echo " Voxora iPhone 17 Max Demo 脚本"
echo "=============================="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$ROOT_DIR/client"
LOG_DIR="$ROOT_DIR/logs"
# 与 start_voxora_clean_dev.sh 缺省一致（外网二维码主机名）；纯内网可注释
export REACT_NATIVE_PACKAGER_HOSTNAME="${REACT_NATIVE_PACKAGER_HOSTNAME:-116.237.2.237}"

mkdir -p "$LOG_DIR"

# 1️⃣ 安装 client 依赖
echo "安装 client 依赖..."
cd "$CLIENT_DIR"
pnpm install

# 2️⃣ 启动 Expo (Metro + DevTools)，LAN 模式（不用 tunnel）
echo "启动 Expo (Metro Bundler + DevTools)..."
# 与主开发脚本 Metro 端口一致（外网缺省 18081）
nohup pnpm exec expo start --lan --port 18081 > "$LOG_DIR/expo_demo.log" 2>&1 &

# 3️⃣ 等待 Metro 启动
echo "等待 Metro 启动 (约10秒)..."
sleep 10

# 4️⃣ 打开 Expo DevTools 浏览器
echo "打开 Expo DevTools..."
open http://localhost:19002

echo "=============================="
echo "Demo 准备完成 ✅"
echo "- 使用 iPhone 17 Max 扫码运行 Voxora App"
echo "- Metro 端口: 18081 (JS Bundle)"
echo "- DevTools: http://localhost:19002"
echo "- 日志文件: $LOG_DIR/expo_demo.log"
echo "=============================="
