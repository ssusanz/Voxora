#!/usr/bin/env bash
# Voxora：iOS EAS 构建（与 Android 相同：独立包须在构建时注入 EXPO_PUBLIC_BACKEND_BASE_URL）
#
# 用法：
#   ./scripts/eas-build-ios.sh
#       → profile **production**：云端 `eas build` 成功后自动执行 `eas submit --platform ios --latest`（TestFlight 路径）
#   ./scripts/eas-build-ios.sh production --no-submit
#       → 仅构建、不提交（本地试打、或 submit 改用手动）
#   ./scripts/eas-build-ios.sh preview
#       → profile **preview**（EAS internal）；不会执行 submit
#   其余参数原样传给 `eas build`（如 --non-interactive）；`--no-submit` 会被剥掉不传 build。
#
#   环境变量 **EAS_IOS_NO_SUBMIT=1** 与 **--no-submit** 等价（便于 CI）。
#
# 后端地址 EXPO_PUBLIC_BACKEND_BASE_URL：
#
#   **默认 EAS 为云端构建**：必须在 **expo.dev → 项目 → Environment variables**
#   中配置（勾选与 profile 一致的环境：preview / production），或写在 **client/eas.json**
#   的 `build.<profile>.env`。云端 **不会** 读取本机 `.env`；本机 `export` 也不会可靠传入构建机。
#
#   本脚本从仓库根 `.env` 读取该行，仅用于：**自检**、以及 **`eas build --local`** 同一会话可见。
#
# Bundle ID：
#   默认 `com.susanshpd.voxora`（client/app.config.ts）；勿用 `com.anonymous.myapp` 等易被占用的 ID。
#   覆盖：`export IOS_BUNDLE_IDENTIFIER=com.yourcompany.voxora` 后再执行本脚本。
#
# iOS / Android 开发者构建号（与商店唯一性）：
#   **EAS 云端**已启用 `eas.json` → `cli.appVersionSource: remote` + `autoIncrement: true`，由 EAS 自动递增，
#   **无需**每次改 `app.config.ts` 或 expo 环境变量里的 IOS_BUILD_NUMBER。
#   若项目曾用手动 build 号且第一次切到 remote，请执行：`eas build:version:set` 对齐当前商店版本。
#   根目录 `.env` 里的 `IOS_BUILD_NUMBER` 仅影响本机 `expo run:ios` 等（本脚本仍会 export 供 local 构建）。
#
# Apple 凭证：
#   首次 iOS 构建请在 **终端** 运行本脚本并按 `eas-cli` 提示登录 Apple、选择 Team、由 EAS 管理
#   Distribution 证书；**不必**先在 expo.dev 网页里手动上传 .p12（除非公司策略要求自管证书）。
#
# iOS 与 HTTP：
#   若 API 为 **http://** 公网地址，需在 **app.config 的 ios.infoPlist（ATS）** 中放行或改用 HTTPS，
#   否则真机请求可能被系统拦截（与 Android cleartext 不同层）。
#
# 注意：**--local** 构建产物以本机为主；`submit --latest` 针对的是 EAS 云端队列里的最新构建。
#   本地打 iOS 包时请加 **--no-submit**，改用手动上传或仅测 IPA。
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

if [[ -f "$ENV_FILE" ]]; then
  if [[ -z "${EXPO_PUBLIC_BACKEND_BASE_URL:-}" ]]; then
    line="$(grep -E '^[[:space:]]*EXPO_PUBLIC_BACKEND_BASE_URL=' "$ENV_FILE" | tail -n 1 || true)"
    if [[ -n "$line" ]]; then
      # shellcheck disable=SC2163,SC2046
      export "$(echo "$line" | sed 's/^[[:space:]]*//')"
    fi
  fi
  if [[ -z "${IOS_BUILD_NUMBER:-}" ]]; then
    bn="$(grep -E '^[[:space:]]*IOS_BUILD_NUMBER=' "$ENV_FILE" | tail -n 1 || true)"
    if [[ -n "$bn" ]]; then
      # shellcheck disable=SC2163,SC2046
      export "$(echo "$bn" | sed 's/^[[:space:]]*//')"
    fi
  fi
fi

if [[ -z "${EXPO_PUBLIC_BACKEND_BASE_URL:-}" ]]; then
  echo "==================== 注意 ====================" >&2
  echo "本机未读到 EXPO_PUBLIC_BACKEND_BASE_URL（未 export 且根目录 .env 无该项）。" >&2
  echo "EAS **云端**构建以 **expo.dev Environment variables** 或 **eas.json → env** 为准，仍会继续执行 eas build。" >&2
  echo "若 expo.dev 也未配置，安装包会回退 localhost，真机无法访问你的 API。" >&2
  echo "==============================================" >&2
fi

SUBMIT_AFTER=0
if [[ "$PROFILE" == "production" ]]; then
  SUBMIT_AFTER=1
fi
if [[ "${EAS_IOS_NO_SUBMIT:-}" == "1" ]]; then
  SUBMIT_AFTER=0
fi

BUILD_ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--no-submit" ]]; then
    SUBMIT_AFTER=0
  else
    BUILD_ARGS+=("$arg")
  fi
done

echo "==================== EAS iOS ===================="
echo "CLIENT_DIR=$CLIENT_DIR"
echo "PROFILE=$PROFILE"
if [[ "$PROFILE" == "production" ]]; then
  echo "SUBMIT_AFTER_BUILD=$([[ "$SUBMIT_AFTER" -eq 1 ]] && echo yes || echo no)"
fi
echo "EXPO_PUBLIC_BACKEND_BASE_URL=${EXPO_PUBLIC_BACKEND_BASE_URL:-<本机未设，依赖 expo.dev / eas.json>}"
echo "IOS_BUILD_NUMBER=${IOS_BUILD_NUMBER:-<未 export / .env 无则使用 app.config 默认值>}"
echo "==================================================="

cd "$CLIENT_DIR"
# With `set -u`, empty `"${BUILD_ARGS[@]}"` errors on some Bash (e.g. Homebrew bash 5+).
if [[ ${#BUILD_ARGS[@]} -gt 0 ]]; then
  npx eas-cli build --platform ios --profile "$PROFILE" "${BUILD_ARGS[@]}"
else
  npx eas-cli build --platform ios --profile "$PROFILE"
fi

if [[ "$PROFILE" == "production" && "$SUBMIT_AFTER" -eq 1 ]]; then
  echo ""
  echo "==================== EAS submit → App Store Connect ===================="
  npx eas-cli submit --platform ios --latest
  echo "========================================================================"
fi
