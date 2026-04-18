#!/usr/bin/env bash
# 仅启动 Express 后端（不启 Metro / Expo），与是否使用 Expo Go 无关。
#
# 端口优先级：
#   1）当前 shell 已 export SERVER_PORT
#   2）server/.env 与仓库根 .env 中的 SERVER_PORT（后者覆盖前者；仅当 shell 未设置时读取）
#   3）默认 9091
#
# 公网调试示例：在根 .env 写 SERVER_PORT=19091，或执行 SERVER_PORT=19091 ./scripts/server-dev.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"

if [[ -z "${SERVER_PORT:-}" ]]; then
  for f in "$SERVER_DIR/.env" "$ROOT_DIR/.env"; do
    [[ -f "$f" ]] || continue
    line="$(grep -E '^[[:space:]]*SERVER_PORT=' "$f" | tail -n 1 || true)"
    [[ -n "$line" ]] || continue
    # shellcheck disable=SC2163,SC2046
    export "$(echo "$line" | sed 's/^[[:space:]]*//')"
  done
fi

export SERVER_PORT="${SERVER_PORT:-9091}"

echo "==================== Voxora server dev ===================="
echo "SERVER_DIR=$SERVER_DIR"
echo "SERVER_PORT=$SERVER_PORT"
echo "日志：$ROOT_DIR/logs/server.log（若存在）"
echo "==========================================================="

cd "$SERVER_DIR"
exec pnpm dev
