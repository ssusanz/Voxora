# Voxora 技术说明书

**适用版本：v1.3.0**  
**文档性质：架构、模块、数据流与运维要点（面向开发与实施人员）**

*English: [TECH_SPEC_v1.2.1_EN.md](./TECH_SPEC_v1.2.1_EN.md)*

---

## 1. 仓库与运行时概览

| 项目 | 说明 |
|------|------|
| 形态 | **pnpm workspace monorepo** |
| `client/` | **Expo SDK 54** + **Expo Router** + React Native；样式以 **Uniwind + Tailwind** 为主（`client/global.css`） |
| `server/` | **Node.js + Express**，REST API 前缀 **`/api/v1`** |
| 根 `package.json` | 聚合脚本（如 `lint`）；**语义化版本号与 `client/app.config.ts` 中 `version` 应对齐**（当前 v1.3.0） |

本地开发常见入口：按仓库约定使用 **`coze dev`** 或各目录脚本；生产构建参考 `.cozeproj` 与 `README.md` 说明（**勿改** `.cozeproj` / `.coze` 中平台注入逻辑）。

---

## 2. 前端架构（client）

### 2.1 路由层次

- **根 Stack**：`client/app/_layout.tsx`  
  - `headerShown: false` 为主；部分 Modal 路由单独配置 `presentation`。  
  - 与「遇见未来」相关的全屏栈：`meet-future-detail`。  
- **Tabs**：`client/app/(tabs)/_layout.tsx`  
  - `index`（首页）、`family`、`moments`、`profile`，中间 `add-placeholder` 挂载自定义 **AddButton**（添加菜单 + **Tab 级语音指令**）。

### 2.2 安全路由与参数

- `useSafeRouter` / `useSafeSearchParams`（`client/hooks/useSafeRouter.ts`）：通过 **Base64 包裹的 JSON payload** 传递路由参数，避免 `push` 与 `useLocalSearchParams` 编解码不一致及特殊字符问题。  
- **遇见未来详情** 使用 `planId` 等参数进入 `MeetFutureDetailScreen`。

### 2.3 首页与「双卡片」

- 实现：`client/screens/home/index.tsx`。  
- **时光长廊**：`FlatList` 展示回忆节点；`ListFooterComponent` 预留底部 Tab 高度（与 `useBottomTabBarHeight` 等配合）。  
- **遇见未来**：`MeetFuturePanel`（`client/components/MeetFuturePanel.tsx`）嵌入同一屏，通过本地状态 `corridorTab` 在 `memories` / `future` 间切换。  
- `MeetFuturePanel` 使用 **`useFocusEffect`** 在 Tab 获焦时 **重新 `loadFuturePlans()`**，避免从详情返回后列表标题等仍陈旧。

### 2.4 遇见未来：本地数据模型

- 模块：`client/utils/meetFutureStorage.ts`  
- **AsyncStorage** 键：`voxora_meet_future_plans_v1`  
- 类型要点：  
  - `FuturePlan`：`id`, `kind`（`trip` | `birthday` | `party` | `gathering`）, `title`, `dateLabel`, `status`（`brainstorm` | `locked`）, `entries?`, `summary?`, `summaryUpdatedAt?`  
  - `FuturePlanEntry`：`authorLabel`, `text`, `source`（`text` | `voice`）, `createdAt`, `id`  
- API：`loadFuturePlans`, `saveFuturePlans`, `getFuturePlanById`, `updateFuturePlan`。

### 2.5 遇见未来：详情与小结

- 页面：`client/screens/meet-future-detail/index.tsx`  
- 路由：`client/app/meet-future-detail.tsx` → 默认导出上述 screen。  
- **留言**：`updateFuturePlan` 追加 `entries`；语音经 **`VoiceInput` `mode="transcribe"`** 写入 `source: 'voice'`。  
- **小结**：`POST ${getBackendBaseUrl()}/api/v1/future-plans/summarize`，请求体含 `title`、`kind`（展示用已本地化字符串）、`entries`（`authorLabel` + `text`）。成功则写回 `summary` / `summaryUpdatedAt`。  
- **标题编辑**：本地 `updateFuturePlan` 更新 `title`；栈顶 **原生 Stack title** 仍可能显示 i18n 的 `home.futureDetailTitle`（与卡片标题独立，可按产品要求后续收敛）。

### 2.6 后端地址解析

- `client/utils/backend.ts`：`getBackendBaseUrl()`  
  - 处理 **`EXPO_PUBLIC_BACKEND_BASE_URL`**、Coze 场景下 **`EXPO_PACKAGER_PROXY_URL` 与后端同 origin 时跳过误用 Metro 主机** 等逻辑；详见文件内注释。

### 2.7 国际化

- `client/locales/i18n.ts`：`zh-CN` / `en` / `hi`；遇见未来、时光长廊、Tab 语音等键名以 `home.*`、`tab.*` 等前缀管理。

### 2.8 静态检查

```bash
npm run lint              # client + server
npm run lint:client       # 仅 client
npm run lint:server       # 仅 server
```

---

## 3. 后端架构（server）

### 3.1 启动与配置

- 入口：`server/src/index.ts`  
- **环境变量加载顺序**（关键）：`server/src/load-env.ts` 先读 `server/.env`，再读 **仓库根 `.env`（override）**，避免 cwd 不同导致密钥未加载。

### 3.2 已挂载路由（节选）

| 路径前缀 | 模块 | 说明 |
|----------|------|------|
| `/api/v1/health` | 内联 | 返回 `summarize.gemini` / `localLlm` 是否配置、`supabase` 与 memories 列表是否走 service role 等 |
| `/api/v1/memories` | `routes/memories` | 回忆 CRUD、总结等 |
| `/api/v1/families` | `routes/families` | 家庭 |
| `/api/v1/pets` | `routes/pets` | 宠物 |
| `/api/v1/vlogs` | `routes/vlogs` | Vlog |
| `/api/v1/voice` | `routes/voice` | 语音相关 |
| `/api/v1/upload` | `routes/upload` | 上传；无对象存储时落盘 `data/local-uploads/...` 并由静态目录对外 |
| `/api/v1/video` | `routes/video` | 视频 |
| **`/api/v1/future-plans`** | **`routes/future-plans`** | **遇见未来：全量列表 GET/PUT + 小结 POST** |

### 3.2.1 遇见未来：列表同步（v1.3.0+）

- **`GET /api/v1/future-plans`**：返回 `{ ok: true, plans }`，数据来自 **`server/data/future-plans/plans.json`**（与 `server/data/` 一同被 `.gitignore` 忽略）。  
- **`PUT /api/v1/future-plans`**：请求体 `{ plans: FuturePlan[] }`，校验为对象数组且每项含字符串 `id` 后整文件覆盖写入。  
- **客户端**：`syncFuturePlansWithServer()` 在进入遇见未来 Tab / 详情时拉取；若服务端为空且本机有卡片则 **自动 PUT 本机数据** 完成首次「种云」；每次 `saveFuturePlans` 后会 **异步 PUT** 推送（离线失败静默）。**多设备 MVP 策略**：服务端有数据时以服务端列表为准写回本机。

### 3.3 遇见未来：`POST /api/v1/future-plans/summarize`

- 实现：`server/src/routes/future-plans.ts`  
- 入参（JSON）：  
  - `title`：必填字符串  
  - `kind`：可选，拼进 Gemini 提示  
  - `entries`：`{ authorLabel?, text? }[]`  
- 行为：  
  1. 若 **`isGeminiSummarizeConfigured()`** 为真：调用 **`geminiGenerateFreeform`**（`server/src/lib/gemini-summarize.ts`），按固定中文 Markdown 小节输出；成功则 `{ ok: true, summary, source: 'gemini' }`。  
  2. Gemini 未配置或调用抛错：**回退** `buildLocalSummary` 模板，`{ ok: true, summary, source: 'local' }`。  
- Gemini 环境变量：`GEMINI_API_KEY` 或 `GOOGLE_GENERATIVE_AI_API_KEY`；可选 `GEMINI_MODEL`、`GEMINI_TIMEOUT_MS`。

### 3.4 其他 AI 与存储

- `gemini-summarize.ts` 同时服务回忆总结与 **freeform** 生成。  
- `local-llm-summarize`、`supabase` 等与回忆列表/总结链路相关；`/api/v1/health` 可快速确认当前进程配置。

---

## 4. 数据流小结（遇见未来）

```
[MeetFuturePanel / Detail]
       │ read/write
       ▼
AsyncStorage (voxora_meet_future_plans_v1)
       │ summarize 时
       ▼
POST /api/v1/future-plans/summarize
       │ Gemini 或本地模板
       ▼
回写 FuturePlan.summary (+ summaryUpdatedAt)
```

---

## 5. 构建、发布与运维

- **Expo / EAS**：`client/app.config.ts` 中 `version` 与 EAS `projectId`；真机构建参考 `scripts/eas-build-ios.sh`。  
- **iOS 分发（推荐）**：`client/eas.json` 中 **`production`** 使用 **`ios.distribution`: `store`**；`./scripts/eas-build-ios.sh`（默认 `production`）在云端 **build 成功后会自动执行 `eas submit --platform ios --latest`**；加 **`--no-submit`** 或 **`EAS_IOS_NO_SUBMIT=1`** 可只构建。测试员通过 **TestFlight** 安装（无需每台设备 UDID）。**`preview`**（`distribution: internal`）为备用：流程见 `docs/ios-eas-joint-testing.md`。  
- **部署**：`scripts/voxora-deploy.sh` 等用于导出公网 IP、后端地址等（以脚本内注释为准）。  
- **日志**：服务端排查可看 `logs/server.log`（若运行脚本将 stdout 重定向至此）。

---

## 6. 安全与合规注意

- **勿将 `.env`、API Key 提交进 Git**；生产环境使用密钥管理或注入。  
- **遇见未来** 当前设计以 **设备本地存储** 为主，多设备同步与权限模型若产品化需另行设计。  
- `upload` 与 `usesCleartextTraffic` 等配置在开发局域网场景常见；上架前应按目标商店策略收紧 **HTTPS** 与 **网络安全配置**。

---

## 7. 版本与文档维护

- 本文档与 **发行标签（如 `语音识别真机ok` / `v1.3.0`）**、**`package.json` / `client/app.config.ts` 的 version 字段** 应对齐。  
- 功能变更时请同步更新：本技术说明书、`USER_MANUAL_v1.2.1.md`（或下一版本号文件）、以及 `CHANGELOG`（若团队采用）。

---

## 8. 参考路径索引

| 主题 | 路径 |
|------|------|
| 遇见未来列表与卡片 UI | `client/components/MeetFuturePanel.tsx` |
| 遇见未来详情 | `client/screens/meet-future-detail/index.tsx` |
| 本地存储 | `client/utils/meetFutureStorage.ts` |
| 小结 API | `server/src/routes/future-plans.ts` |
| Gemini 封装 | `server/src/lib/gemini-summarize.ts` |
| 根路由 | `client/app/_layout.tsx` |
| Tab 与语音添加 | `client/app/(tabs)/_layout.tsx` |
| 环境加载 | `server/src/load-env.ts` |
