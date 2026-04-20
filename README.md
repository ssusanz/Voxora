# Expo App + Express.js

## 目录结构规范（严格遵循）

当前仓库是一个 monorepo（基于 pnpm 的 workspace）

- Expo 代码在 client 目录，Express.js 代码在 server 目录
- 本模板默认无 Tab Bar，可按需改造

├── client/                     # React Native 前端代码
│   ├── app/                    # Expo Router 路由目录（仅路由配置）
│   │   ├── _layout.tsx         # 根布局文件（必需，务必阅读）
│   │   └── index.tsx           # 首页
│   ├── screens/                # 页面实现目录（与 app/ 路由对应）
│   │   └── demo/               # 示例页面
│   │       └── index.tsx
│   ├── components/             # 可复用组件
│   │   └── Screen.tsx          # 页面容器组件（必用）
│   ├── hooks/                  # 自定义 Hooks
│   ├── contexts/               # React Context 代码
│   ├── utils/                  # 工具函数
│   ├── assets/                 # 静态资源
|   └── package.json            # Expo 应用 package.json
├── server/                     # 服务端代码根目录 (Express.js)
|   ├── src/
│   │   └── index.ts            # 服务端入口文件
|   └── package.json            # 服务端 package.json
├── package.json
├── .cozeproj                   # 预置脚手架脚本（禁止修改）
└── .coze                       # 配置文件（禁止修改）

## 样式方案

基于 tailwindcss 进行样式开发（底层基于 Uniwind）

写法示例：

```tsx
<View className="flex-1 bg-white dark:bg-gray-900 p-4"></View>
```

```tsx
<Text
  className="text-lg font-bold text-gray-900 dark:text-white"
  selectionColorClassName="accent-blue-500"
>
  Hello World
</Text>
```

Uniwind 官方文档：https://docs.uniwind.dev/llms.txt

## 如何进行静态校验（TSC + ESLint）

```bash
# 对 client 和 server 目录同时进行校验
npm run lint

# 对 client 目录进行校验
npm run lint:client

# 对 server 目录进行校验
npm run lint:server
```

## 如何修改主题模式（跟随系统、固定暗色、固定亮色）

默认为跟随系统，如果用户明确指定为“暗色”或“亮色”，需要修改 `client/components/ColorSchemeUpdater.tsx` 的 `DEFAULT_THEME` 变量为合适的值

## 如何定制主题 design tokens

当前项目的**设计系统**基于 tailwindcss 实现，核心入口文件为 `client/global.css`，如果需要定制主题，应该**阅读并修改 `client/global.css` 文件**

## 路由及 Tab Bar 实现规范

### 方案一：无 Tab Bar（Stack 导航）

适用于线性流程应用，采用简化的目录结构：

```
client/app/
├── _layout.tsx         # 根布局（Stack 导航配置）
├── index.tsx           # 应用入口
├── detail.tsx          # 详情页（通过 params 传递数据）
└── +not-found.tsx      # 404 页面
```

**根布局配置** `client/app/_layout.tsx`：

以下仅为代码片段供写法参考

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="detail" />
</Stack>
```

**应用入口** `client/app/index.tsx`：
```tsx
export { default } from "@/screens/home";
```
> **禁止事项**：无 Tab Bar 场景下，不得创建 `(tabs)` 目录。

### 方案二：有 Tab Bar（Tabs 导航）

采用路由分组实现底部导航栏：
```
client/app/
├── _layout.tsx              # 根布局
├── (tabs)/
│   ├── _layout.tsx          # Tab 导航配置
│   ├── index.tsx            # 默认 Tab（必须存在）
│   ├── discover.tsx         # 发现页
│   └── profile.tsx          # 个人中心
├── detail.tsx               # Tab 外的独立页面（通过 params 传递数据）
└── +not-found.tsx
```
> **⚠️ [CRITICAL]**： `app/index.tsx` 优先级高于 `(tabs)/index.tsx`，会导致首页无 Tab Bar。**当有(tabs)/index.tsx时必须删除 `app/index.tsx`**。

**根布局配置** `client/app/_layout.tsx`：

以下仅为代码片段供写法参考

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="detail" />
</Stack>
```

**应用入口** `client/app/(tabs)/index.tsx`：
```tsx
export { default } from "@/screens/home";
```

**Tab 布局配置** `client/app/(tabs)/_layout.tsx`：

```tsx
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [background, muted, accent, border] = useCSSVariable([
    '--color-background',
    '--color-muted',
    '--color-accent',
    '--color-border',
  ]) as string[];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: background,
          borderTopWidth: 1,
          borderTopColor: border,
          // 通过固定宽度 55 来修正 Web 上的表现
          height: Platform.OS === 'web' ? 55 : 50 + insets.bottom,
        },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: muted,
      }}
    >
      {/* name 必须与文件名完全一致 */}
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="house" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: '发现',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="compass" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="user" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Tab 页面文件** `client/app/(tabs)/index.tsx`：
```tsx
export { default } from "@/screens/home";
```

### 注意事项

在改动 `client/app/_layout.tsx` 前，必须先阅读该文件，再进行修改操作

以下是需要保留的重要逻辑

- 保留 global.css 引入（tailwindcss 生效的关键）
- 保留 Provider 的使用

## 依赖管理与模块导入规范

### 依赖安装
**禁止**使用 `npm` 或 `yarn`，按目录区分安装命令：

| 目录 | 安装命令 | 说明 |
|------|----------|------|
| `client/` | `npx expo install <package>` | Expo 会自动选择与 SDK 兼容的版本 |
| `server/` | `pnpm add <package>` | 使用 pnpm 管理后端依赖 |

```bash
# client 目录（Expo 项目）
cd client && npx expo install expo-camera expo-image-picker

# server 目录（Express 项目）
cd server && pnpm add axios cors
```

**网络问题处理**：`npx expo install` 可能因网络原因失败，失败时重试 2 次，仍失败则改用 `pnpm add` 安装

## Expo 开发规范

### 路径别名

Expo 配置了 `@/` 路径别名指向 `client/` 目录：

```tsx
// 正确
import { Screen } from '@/components/Screen';

// 避免相对路径
import { Screen } from '../../../components/Screen';
```

## 本地开发

在仓库根目录执行 **`pnpm dev`**：会运行 **`.cozeproj/scripts/dev_run.sh`**，用于首次或重启前后端（脚本内会处理端口占用等）。**不要求**安装 `coze` CLI；若使用 Coze 空间，其 **`coze dev`** 与上述脚本等价。

**说明：** **Cursor** 等仅作本地**编辑 / IDE**；前后端进程仍由 **`pnpm dev`**（或各子目录脚本）启动。

## 远程部署（Mac mini / 后台运行）

本项目推荐在远程机器（例如 Mac mini）上通过脚本启动 **Express 后端 + Expo Metro**。脚本会先释放端口，再启动后端与 Metro，并将后端日志写入文件。

### 前置条件

- 远程机器已安装：`git`、`pnpm`、Node.js
- 如需后台运行（`deploy-bg`）：已安装 `tmux`（macOS：`brew install tmux`）
- 路由器端口映射（若需要外网访问）：
  - 公网 `METRO_PORT` → 远程机器 `METRO_PORT`（默认 `18081`，用于 Expo Go / Metro）
  - 公网 `BACKEND_PORT` → 远程机器 `BACKEND_PORT`（默认 `19091`，用于 API）

### 部署命令（建议后台）

在远程机器上进入仓库根目录：

```bash
./scripts/voxora-deploy.sh deploy-bg
```

默认会创建 tmux 会话 `voxora-deploy` 并在其中运行同一个脚本（无参数版）。

### 查看后台是否正常

#### 1) tmux 会话是否存在

```bash
tmux ls
```

#### 2) 附着查看实时输出（最直接）

```bash
tmux attach -t voxora-deploy
```

退出附着但不杀进程：按 **`Ctrl+b`**，松手后再按 **`d`**（detach）。

#### 3) 端口是否在监听

```bash
lsof -nP -iTCP:19091 -sTCP:LISTEN
lsof -nP -iTCP:18081 -sTCP:LISTEN
```

#### 4) 后端健康检查

后端提供健康检查接口：

```bash
curl -sS "http://127.0.0.1:19091/api/v1/health"
```

期望返回类似：

```json
{ "status": "ok", "timestamp": "..." }
```

#### 5) 查看后端日志

脚本将后端输出写到：

```bash
tail -n 100 logs/server.log
```

### 停止 / 重启

- **重启（推荐）**：重新执行 `./scripts/voxora-deploy.sh deploy-bg`。脚本会先按端口结束旧进程，再拉起新进程。
- **停止**：
  - 进入会话：`tmux attach -t voxora-deploy`
  - 在会话里 `Ctrl+C`（会触发脚本的清理逻辑，结束后端与 Metro）

### 端口与配置说明（与脚本一致）

`scripts/voxora-deploy.sh` 顶部「调试配置」区块里包含关键变量（默认值可能会被你们调整）：

- `BACKEND_PORT`：后端端口（默认 `19091`）
- `METRO_PORT`：Expo Metro 端口（默认 `18081`）
- `PUBLIC_IP` / `LAN_IP`：用于生成 Expo Go 二维码/链接与路由器映射说明

### 相关脚本

- `scripts/voxora-pull.sh`：更新代码（fetch/pull）
- `scripts/voxora-push.sh`：提交并推送（add/status/commit/push，日志在 `logs/voxora-push.log`）
- `scripts/voxora-deploy.sh`：部署启动（前台 / `deploy-bg` 后台）
