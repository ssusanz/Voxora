#!/usr/bin/env bash
# Voxora：Android EAS 构建（必须在构建时注入 EXPO_PUBLIC_BACKEND_BASE_URL，独立包无法从 Metro 推断后端）
#
# 用法：
#   ./scripts/eas-build-android.sh              # profile production（AAB）
#   ./scripts/eas-build-android.sh preview      # profile preview（APK 内部分发）
#
# 后端地址 EXPO_PUBLIC_BACKEND_BASE_URL：
#
#   **默认 EAS 为云端构建**：变量必须在 **expo.dev → 项目 → Environment variables**
#   （勾选与 profile 对应的环境：preview / production），或写在 **client/eas.json**
#   的 `build.<profile>.env` 里。云端 **不会** 读取你本机磁盘上的 `.env`，本机 shell
#   里 `export` 也 **不会** 可靠传入 Expo 构建机（见官方 Environment variables in EAS）。
#
#   本脚本从仓库根 `.env` 读取该行，仅用于：**启动前检查变量是否已配置**、以及
#   **`eas build --local` 时** 同一会话内可见；打云端包时仍以 expo.dev / eas.json 为准。
#
# 示例（expo.dev 配好后，本地可省略；若本地有 .env 仅作自检）：
#   ./scripts/eas-build-android.sh preview

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="$ROOT_DIR/client"
ENV_FILE="$ROOT_DIR/.env"

PROFILE="production"
if [[ "${1:-}" == "preview" || "${1:-}" == "production" ]]; then
  PROFILE="$1"
  shift
fi

if [[ -z "${EXPO_PUBLIC_BACKEND_BASE_URL:-}" && -f "$ENV_FILE" ]]; then
  line="$(grep -E '^[[:space:]]*EXPO_PUBLIC_BACKEND_BASE_URL=' "$ENV_FILE" | tail -n 1 || true)"
  if [[ -n "$line" ]]; then
    # shellcheck disable=SC2163,SC2046
    export "$(echo "$line" | sed 's/^[[:space:]]*//')"
  fi
fi

if [[ -z "${EXPO_PUBLIC_BACKEND_BASE_URL:-}" ]]; then
  echo "==================== 注意 ====================" >&2
  echo "本机未读到 EXPO_PUBLIC_BACKEND_BASE_URL（未 export 且根目录 .env 无该项）。" >&2
  echo "EAS **云端**构建以 **expo.dev Environment variables** 或 **eas.json → env** 为准，仍会继续执行 eas build。" >&2
  echo "若 expo.dev 也未配置，安装包会回退 localhost，真机列表为空。" >&2
  echo "==============================================" >&2
fi

echo "==================== EAS Android ===================="
echo "CLIENT_DIR=$CLIENT_DIR"
echo "PROFILE=$PROFILE"
echo "EXPO_PUBLIC_BACKEND_BASE_URL=${EXPO_PUBLIC_BACKEND_BASE_URL:-<本机未设，依赖 expo.dev / eas.json>}"
echo "======================================================="

cd "$CLIENT_DIR"
exec npx eas-cli build --platform android --profile "$PROFILE" "$@"
