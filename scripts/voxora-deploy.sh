#!/bin/bash
# Voxora 部署。调试配置见下方「调试配置」块；假定已 SSH 到本仓库所在机器。
#
# 无参数：前台调试（清端口 → 后端 + Metro，可交互，SSH 断则停）
# deploy-bg：后台部署（tmux 内跑同上，需 brew install tmux；可选 VOXORA_TMUX_SESSION、VOXORA_ROOT）
#
# Metro：外网路由器 公网:METRO_PORT → 本机:METRO_PORT；API 与 client/app.config.js、metro 配置对齐。

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
# 与文档一致：https://docs.expo.dev/more/expo-cli/#server-url — 保证终端/二维码里的 exp:// 主机为公网（非 localhost）
export EXPO_PACKAGER_PROXY_URL="http://${PUBLIC_IP}:${METRO_PORT}"
# Expo Go：禁用 http「选端」中间页，二维码内容为纯 exp://…，便于相机/Expo Go 直接打开
export EXPO_NO_REDIRECT_PAGE=1
# =====================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${VOXORA_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
CLIENT_DIR="$PROJECT_ROOT/client"
SERVER_DIR="$PROJECT_ROOT/server"
LOG_DIR="$PROJECT_ROOT/logs"

if [[ -n "${1:-}" ]]; then
  if [[ "$1" == "deploy-bg" ]]; then
    command -v tmux >/dev/null 2>&1 || {
      echo "deploy-bg 需要 tmux: brew install tmux" >&2
      exit 1
    }
    TMUX_SESSION="${VOXORA_TMUX_SESSION:-voxora-deploy}"
    tmux has-session -t "$TMUX_SESSION" 2>/dev/null && tmux kill-session -t "$TMUX_SESSION" || true
    tmux new-session -d -s "$TMUX_SESSION" "cd \"$SCRIPT_DIR\" && exec ./voxora-deploy.sh"
    echo "deploy-bg: tmux \"$TMUX_SESSION\" 已启动。进入: tmux attach -t \"$TMUX_SESSION\""
    exit 0
  fi
  echo "用法: $0           # 前台调试部署" >&2
  echo "      $0 deploy-bg  # 后台部署（tmux）" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

# 按端口结束旧部署（便于更新代码后重新跑本脚本；macOS lsof）
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

echo "==================== Voxora deploy（Expo Go + 后端）===================="
echo "PROJECT_ROOT=$PROJECT_ROOT"

echo "── 结束上一部署占用的端口（若存在）──"
kill_port_listeners "$BACKEND_PORT" "后端"
kill_port_listeners "$METRO_PORT" "Metro/Expo"

if lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "⚠️  后端端口 $BACKEND_PORT 仍被占用，请手动检查" >&2
fi
if lsof -nP -iTCP:"$METRO_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "⚠️  Metro 端口 $METRO_PORT 仍被占用，请手动检查" >&2
fi

cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  kill "$SERVER_PID" 2>/dev/null || true
  kill_port_listeners "$BACKEND_PORT" "后端"
  kill_port_listeners "$METRO_PORT" "Metro/Expo"
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
echo "📷 Expo Go 二维码应为 exp://（已关选端页 EXPO_NO_REDIRECT_PAGE）；若仍见 http 链接请确认本脚本已保存并重启 Metro"
echo "📎 与脚本同参：client/app.config.js extra.apiUrl、client/metro.config.js BACKEND_TARGET（内网代理）"
echo "📂 日志: $LOG_DIR/server.log"
echo ""
echo "========================================================="
echo "Ctrl+C 停止全部"
echo "========================================================="
echo ""

cd "$CLIENT_DIR"
# 缺省 Expo Go（exp:// 二维码，用 Expo Go 内扫码）。要切 development build 时在 Metro 里按 s。
pnpm exec expo start --lan --go --port "$METRO_PORT" --clear
