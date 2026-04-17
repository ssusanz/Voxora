#!/usr/bin/env bash
# 提交并推送到 GitHub：add → status →（有变更则）commit → push。首次 push 会 -u。
#
# 假定：已通过 SSH 登录到存放本仓库的机器（常见 cwd 为仓库根）。脚本会 cd 到仓库根再执行 git。
# 用法：
#   ./scripts/voxora-push.sh                    # add -u（仅已跟踪文件）+ status + commit + push
#   ./scripts/voxora-push.sh 本次改动说明      # 同上，提交说明为参数整串（多词请一起传）
#   ./scripts/voxora-push.sh --push-only        # 只做 push（不 add / commit）
#   ./scripts/voxora-push.sh --push-only dev    # 将当前 HEAD 推到远程 dev（仍不 commit）
# 环境变量：VOXORA_ROOT、VOXORA_GIT_REMOTE（默认 origin）
# 日志：logs/voxora-push.log（logs/ 已在 .gitignore）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${VOXORA_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
REMOTE="${VOXORA_GIT_REMOTE:-origin}"
export GIT_TERMINAL_PROMPT=0

cd "$PROJECT_ROOT"

LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/voxora-push.log"
mkdir -p "$LOG_DIR"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$current_branch" == "HEAD" ]]; then
  echo "处于 detached HEAD，请先 checkout 到具体分支再 push。" >&2
  exit 1
fi

push_only=false
remote_push_arg=""
commit_msg=""

if [[ "${1:-}" == "--push-only" ]]; then
  push_only=true
  shift || true
  remote_push_arg="${1:-}"
else
  commit_msg="${*:-"chore: sync $(date '+%Y-%m-%d %H:%M:%S %z')"}"
fi

stamp="$(date '+%Y-%m-%d %H:%M:%S %z')"
set +e
{
  echo "======== $stamp voxora-push ========"
  echo "cwd=$PROJECT_ROOT branch=$current_branch remote=$REMOTE push_only=$push_only"
  echo "HEAD=$(git rev-parse HEAD)"

  if ! "$push_only"; then
    echo "── git add -u（不纳入新的未跟踪文件，避免误提交缓存/日志）──"
    git add -u
    echo "── git status ──"
    git status -sb
    if git diff --cached --quiet; then
      echo "── 无暂存变更，跳过 commit ──"
    else
      echo "── git commit ──"
      git commit -m "$commit_msg"
    fi
  fi

  echo "── git push ──"
  if [[ -n "$remote_push_arg" ]]; then
    git push -u "$REMOTE" "HEAD:$remote_push_arg"
  else
    git push -u "$REMOTE" "$current_branch"
  fi
  rc=$?
  if [[ "$rc" -eq 0 ]]; then
    echo "-------- OK $(date '+%Y-%m-%d %H:%M:%S %z') --------"
  else
    echo "-------- FAIL rc=$rc $(date '+%Y-%m-%d %H:%M:%S %z') --------"
  fi
  exit "$rc"
} 2>&1 | tee -a "$LOG_FILE"
rc_pipe="${PIPESTATUS[0]}"
set -e
if [[ "$rc_pipe" -ne 0 ]]; then
  echo "voxora-push 失败 (exit $rc_pipe)，详见: $LOG_FILE" >&2
  exit "$rc_pipe"
fi

echo "完成: $(git rev-parse --short HEAD) ($current_branch -> $REMOTE)"
echo "日志: $LOG_FILE"
