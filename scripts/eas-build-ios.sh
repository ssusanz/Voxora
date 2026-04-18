#!/usr/bin/env bash
# Voxora：iOS EAS 构建（与 Android 相同：独立包须在构建时注入 EXPO_PUBLIC_BACKEND_BASE_URL）
#
# 用法：
#   ./scripts/eas-build-ios.sh              # profile production（常见：上架 / TestFlight 流程）
#   ./scripts/eas-build-ios.sh preview      # profile preview（内部分发 / 真机初测常用）
#
# 后端地址 EXPO_PUBLIC_BACKEND_BASE_URL：
#
#   **默认 EAS 为云端构建**：必须在 **expo.dev → 项目 → Environment variables**
#   中配置（勾选与 profile 一致的环境：preview / production），或写在 **client/eas.json**
#   的 `build.<profile>.env`。云端 **不会** 读取本机 `.env`；本机 `export` 也不会可靠传入构建机。
#
#   本脚本从仓库根 `.env` 读取该行，仅用于：**自检**、以及 **`eas build --local`** 同一会话可见。
#
# Apple 凭证：
#   首次 iOS 构建请在 **终端** 运行本脚本并按 `eas-cli` 提示登录 Apple、选择 Team、由 EAS 管理
#   Distribution 证书；**不必**先在 expo.dev 网页里手动上传 .p12（除非公司策略要求自管证书）。
#
# iOS 与 HTTP：
#   若 API 为 **http://** 公网地址，需在 **app.config 的 ios.infoPlist（ATS）** 中放行或改用 HTTPS，
#   否则真机请求可能被系统拦截（与 Android cleartext 不同层）。
#
# 示例：
#   ./scripts/eas-build-ios.sh preview

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
  echo "若 expo.dev 也未配置，安装包会回退 localhost，真机无法访问你的 API。" >&2
  echo "==============================================" >&2
fi

echo "==================== EAS iOS ===================="
echo "CLIENT_DIR=$CLIENT_DIR"
echo "PROFILE=$PROFILE"
echo "EXPO_PUBLIC_BACKEND_BASE_URL=${EXPO_PUBLIC_BACKEND_BASE_URL:-<本机未设，依赖 expo.dev / eas.json>}"
echo "==================================================="

cd "$CLIENT_DIR"
exec npx eas-cli build --platform ios --profile "$PROFILE" "$@"
