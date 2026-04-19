#!/bin/bash
# 仅启动 Expo Go 用 Metro（默认 18081）。假定后端已在其它进程监听 19091（如 EAS 发布机、或单独起的 server）。
#
# 与 voxora-deploy.sh 的差异：不启动 server、不释放 19091，只清 Metro 端口并 expo start。
#
# 无参数：前台（清 Metro 端口 → expo start，Ctrl+C 即停）
# expo-bg：后台 tmux（需 brew install tmux；可选 VOXORA_TMUX_SESSION、VOXORA_ROOT）

set -e

# ========================= 调试配置（与 voxora-deploy.sh 对齐，只改这里）=========================
LAN_IP="192.168.1.13"
PUBLIC_IP="116.237.2.237"
BACKEND_PORT="19091"
METRO_PORT="18081"
export REACT_NATIVE_PACKAGER_HOSTNAME="$PUBLIC_IP"
export EXPO_PUBLIC_BACKEND_BASE_URL="${EXPO_PUBLIC_BACKEND_BASE_URL:-http://${PUBLIC_IP}:${BACKEND_PORT}}"
export EXPO_PACKAGER_PROXY_URL="http://${PUBLIC_IP}:${METRO_PORT}"
export EXPO_NO_REDIRECT_PAGE=1
# =====================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${VOXORA_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
CLIENT_DIR="$PROJECT_ROOT/client"
LOG_DIR="$PROJECT_ROOT/logs"

if [[ -n "${1:-}" ]]; then
  if [[ "$1" == "expo-bg" ]]; then
    command -v tmux >/dev/null 2>&1 || {
      echo "expo-bg 需要 tmux: brew install tmux" >&2
      exit 1
    }
    TMUX_SESSION="${VOXORA_TMUX_SESSION:-voxora-expo-go}"
    tmux has-session -t "$TMUX_SESSION" 2>/dev/null && tmux kill-session -t "$TMUX_SESSION" || true
    tmux new-session -d -s "$TMUX_SESSION" "cd \"$SCRIPT_DIR\" && exec ./voxora-expo-go.sh"
    echo "expo-bg: tmux \"$TMUX_SESSION\" 已启动。进入: tmux attach -t \"$TMUX_SESSION\""
    exit 0
  fi
  echo "用法: $0           # 前台，仅 Metro（Expo Go）" >&2
  echo "      $0 expo-bg  # 后台 tmux 跑 Metro" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

kill_port_listeners() {
  local port="$1"
  local label="${2:-port $port}"
  local pids
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return 0
  fi
  echo "🧹 释放 $label (TCP $port)，结束进程: $pids"
  kill -TERM $pids 2>/dev/null || true
  sleep 1
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "⚠️  端口 $port 仍被占用，SIGKILL: $pids"
    kill -KILL $pids 2>/dev/null || true
    sleep 0.5
  fi
}

echo "==================== Voxora Expo Go（仅 Metro，后端假定 ${PUBLIC_IP}:${BACKEND_PORT}）===================="
echo "PROJECT_ROOT=$PROJECT_ROOT"
echo "── 仅释放 Metro 端口（不触碰后端 ${BACKEND_PORT}）──"
kill_port_listeners "$METRO_PORT" "Metro/Expo"

if lsof -nP -iTCP:"$METRO_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "⚠️  Metro 端口 $METRO_PORT 仍被占用，请手动检查" >&2
fi

cleanup() {
  echo ""
  echo "🛑 Stopping Metro..."
  kill_port_listeners "$METRO_PORT" "Metro/Expo"
  echo "✅ Metro 已停止（后端 ${BACKEND_PORT} 未由本脚本管理）"
}

trap cleanup EXIT INT TERM

echo ""
echo "ℹ️  Web: Metro 启动后在该终端按 「w」"
echo ""
echo "🌍 外网 Expo Go: exp://${PUBLIC_IP}:$METRO_PORT"
echo "   API（客户端 EXPO_PUBLIC_BACKEND_BASE_URL）: http://${PUBLIC_IP}:${BACKEND_PORT}"
echo ""
echo "📱 内网: exp://$LAN_IP:$METRO_PORT  |  API: http://$LAN_IP:${BACKEND_PORT}"
echo "📷 二维码应为 exp://（EXPO_NO_REDIRECT_PAGE=1）"
echo "========================================================="
echo "Ctrl+C 停止 Metro"
echo "========================================================="
echo ""

cd "$CLIENT_DIR"
pnpm exec expo start --lan --go --port "$METRO_PORT" --clear
