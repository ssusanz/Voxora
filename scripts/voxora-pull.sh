#!/usr/bin/env bash
# 从 GitHub 拉取更新。默认：fetch + 快进合并当前分支的上游；也可显式指定远程分支名。
#
# 假定：已通过 SSH 登录到存放本仓库的机器（常见 cwd 为仓库根）。脚本会 cd 到仓库根再执行 git。
# 示例：./scripts/voxora-pull.sh   或   cd scripts && ./voxora-pull.sh dev
#
# 环境变量：VOXORA_ROOT（可选，覆盖仓库根；默认为本脚本所在 scripts/ 的上一级）、VOXORA_GIT_REMOTE（默认 origin）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${VOXORA_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
REMOTE="${VOXORA_GIT_REMOTE:-origin}"
export GIT_TERMINAL_PROMPT=0

cd "$PROJECT_ROOT"

git fetch "$REMOTE"

if [[ -n "${1:-}" ]]; then
  git pull "$REMOTE" "$1"
else
  if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
    git pull --ff-only
  else
    echo "当前分支未设置上游。请任选其一：" >&2
    echo "  ./scripts/voxora-pull.sh dev     # 拉取并合并 origin/dev" >&2
    echo "  git branch -u origin/dev dev     # 为 dev 设置上游后再执行本脚本无参数" >&2
    exit 1
  fi
fi

echo "Pull 完成: $(git rev-parse --short HEAD) ($(git rev-parse --abbrev-ref HEAD))"
