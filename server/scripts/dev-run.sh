#!/usr/bin/env bash
# 由 package.json 的 pnpm dev 调用：在启动 .cozeproj 的 server_dev_run 前注入 SERVER_PORT（该 bash 脚本本身不读 .env）。
set -euo pipefail

SERVER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$SERVER_ROOT/.." && pwd)"

if [[ -z "${SERVER_PORT:-}" ]]; then
  for f in "$SERVER_ROOT/.env" "$REPO_ROOT/.env"; do
    [[ -f "$f" ]] || continue
    line="$(grep -E '^[[:space:]]*SERVER_PORT=' "$f" | tail -n 1 || true)"
    [[ -n "$line" ]] || continue
    # shellcheck disable=SC2163,SC2046
    export "$(echo "$line" | sed 's/^[[:space:]]*//')"
  done
fi

export SERVER_PORT="${SERVER_PORT:-9091}"

cd "$SERVER_ROOT"
exec bash ../.cozeproj/scripts/server_dev_run.sh
