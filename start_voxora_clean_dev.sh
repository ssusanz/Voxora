#!/bin/bash
# 对外发布 / 外网调试缺省：Metro 与 Expo 二维码主机名为公网 IP，API 见 client app.config.js extra.apiUrl。
# 改「调试配置」一处即可与客户端对齐；不用 tunnel。
#
# Metro 端口说明：终端里的 exp:// 端口即本机监听端口。外网需路由器 公网:METRO_PORT → 本机:METRO_PORT（1:1）。
# 用法：项目根执行 ./start_voxora_clean_dev.sh

set -e

# ========================= 调试配置（只改这里）=========================
# 内网：本机局域网 IP（日志、路由器转发目标、Metro 代理用）
LAN_IP="192.168.1.13"
# 外网：公网 IP（缺省；Expo 终端/二维码、客户端 API 缺省均指向此网段）
PUBLIC_IP="116.237.2.237"
BACKEND_PORT="19091"
# Metro = 二维码 = 外网 Expo Go 端口（路由器外网映射到本机同端口）
METRO_PORT="18081"
# 仅当需要二维码/终端显示内网 IP 时注释掉（例如同 WiFi 且路由器无 NAT 回流）
export REACT_NATIVE_PACKAGER_HOSTNAME="$PUBLIC_IP"
# =====================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${VOXORA_ROOT:-$SCRIPT_DIR}"
CLIENT_DIR="$PROJECT_ROOT/client"
SERVER_DIR="$PROJECT_ROOT/server"
LOG_DIR="$PROJECT_ROOT/logs"

mkdir -p "$LOG_DIR"

echo "==================== Voxora Dev Mode（缺省外网）===================="
echo "PROJECT_ROOT=$PROJECT_ROOT"

check_port() {
  if lsof -i ":$1" >/dev/null 2>&1; then
    echo "⚠️  Port $1 is already in use"
  fi
}

check_port "$BACKEND_PORT"
check_port "$METRO_PORT"

cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  kill "$SERVER_PID" 2>/dev/null || true
  echo "✅ All services stopped"
}

trap cleanup EXIT INT TERM

echo "🚀 Starting backend..."
cd "$SERVER_DIR"
PORT="$BACKEND_PORT" nohup pnpm exec tsx src/index.ts >"$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
sleep 2
echo "✅ Backend 本机监听: 0.0.0.0:$BACKEND_PORT（内网 http://$LAN_IP:$BACKEND_PORT，外网需映射公网:$BACKEND_PORT）"

echo ""
echo "ℹ️  Web: Metro 启动后在该终端按 「w」"

echo ""
echo "🌍 外网（缺省，与终端/二维码一致；路由器 ${PUBLIC_IP}:$METRO_PORT → $LAN_IP:$METRO_PORT）"
echo "   Expo Go: exp://${PUBLIC_IP}:$METRO_PORT"
echo "   API（客户端缺省）: http://${PUBLIC_IP}:$BACKEND_PORT"
echo ""
echo "📱 纯内网备查（同 WiFi、不走公网）"
echo "   exp://$LAN_IP:$METRO_PORT"
echo "   API: http://$LAN_IP:$BACKEND_PORT"
echo ""
echo "📎 与脚本同参：client/app.config.js extra.apiUrl、client/metro.config.js BACKEND_TARGET（内网代理）"
echo "📂 日志: $LOG_DIR/server.log"
echo ""
echo "========================================================="
echo "Ctrl+C 停止全部"
echo "========================================================="
echo ""

cd "$CLIENT_DIR"
pnpm exec expo start --lan --port "$METRO_PORT" --clear
