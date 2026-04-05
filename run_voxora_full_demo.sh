#!/bin/bash
# 与 start_voxora_clean_dev.sh 缺省一致：外网 Metro 端口 18081、后端 19091、PACKAGER 主机名为公网。
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${VOXORA_ROOT:-$SCRIPT_DIR}"
CLIENT_DIR="$PROJECT_ROOT/client"
SERVER_DIR="$PROJECT_ROOT/server"
LOG_DIR="$PROJECT_ROOT/logs"

LAN_IP="192.168.1.13"
PUBLIC_IP="116.237.2.237"
BACKEND_PORT=19091
WEB_PORT=5000
METRO_PORT=18081

mkdir -p "$LOG_DIR"
export REACT_NATIVE_PACKAGER_HOSTNAME="$PUBLIC_IP"

echo "==================== Voxora Dev Mode ===================="

check_port() {
  if lsof -i :$1 >/dev/null 2>&1; then
    echo "⚠️  Port $1 is already in use"
  fi
}

check_port $BACKEND_PORT
check_port $WEB_PORT
check_port $METRO_PORT

cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  kill $SERVER_PID 2>/dev/null || true
  kill $WEB_PID 2>/dev/null || true
  echo "✅ All services stopped"
}

trap cleanup EXIT INT TERM

echo "🚀 Starting backend..."
cd "$SERVER_DIR"
PORT=$BACKEND_PORT nohup pnpm exec tsx src/index.ts >"$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
sleep 2
echo "✅ Backend: http://$LAN_IP:$BACKEND_PORT (PID $SERVER_PID)"

echo "🚀 Starting web..."
cd "$CLIENT_DIR"
nohup pnpm run web >"$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!
sleep 2
echo "✅ Web: http://localhost:$WEB_PORT (PID $WEB_PID)"

echo ""
echo "🌍 外网（缺省）: exp://${PUBLIC_IP}:$METRO_PORT"
echo "📱 内网备查: exp://$LAN_IP:$METRO_PORT"
echo "📡 API: http://${PUBLIC_IP}:$BACKEND_PORT（客户端缺省） / 内网 http://$LAN_IP:$BACKEND_PORT"
echo ""
echo "📂 Logs: $LOG_DIR/server.log, $LOG_DIR/web.log"
echo "========================================================="
echo "Press Ctrl+C to stop EVERYTHING"
echo "========================================================="
echo ""

cd "$CLIENT_DIR"
pnpm exec expo start --lan --port $METRO_PORT --clear
