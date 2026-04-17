# Voxora 项目文档索引

本目录包含 Voxora 家庭回忆录应用的所有部署和配置文档。

## 📚 文档列表

### 部署与配置

1. **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** - 环境变量完整文档
   - 详细说明所有环境变量
   - 包含用途、格式、获取方式、使用位置
   - 安全提示和故障排除指南

2. **[.env.example](./.env.example)** - 环境变量配置模板
   - 所有必需和可选的环境变量
   - 配置示例和说明
   - 优先级说明

3. **[LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md)** - 本地部署指南
   - 环境准备
   - Supabase 项目创建
   - 演示数据初始化
   - 服务启动流程

4. **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Supabase 配置获取指南
   - 创建 Supabase 账户和项目
   - 获取 API 配置
   - 获取数据库连接信息
   - 配置验证步骤

### 数据库与演示数据

5. **[server/DATABASE_CONFIG.md](./server/DATABASE_CONFIG.md)** - 数据库配置详解
   - 各种环境变量说明（DATABASE_URL、POSTGRES_URL 等）
   - 演示数据初始化方法
   - 推荐的初始化方式

6. **[server/DEMO_DATA_README.md](./server/DEMO_DATA_README.md)** - 演示数据说明
   - 数据统计（家庭、用户、回忆、Vlog）
   - 数据结构说明
   - 使用方法

7. **[DEMO_DATA.md](./DEMO_DATA.md)** - 演示数据完整指南
   - 数据概览
   - 快速开始
   - 数据详细信息

---

## 🚀 快速开始

### 1. 环境准备

确保你的系统已安装：
- Node.js 24+
- pnpm

### 2. 获取 Supabase 凭证

按照 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 获取以下凭证：
- `COZE_SUPABASE_URL`
- `COZE_SUPABASE_ANON_KEY`
- `COZE_SUPABASE_SERVICE_ROLE_KEY`（可选）

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入实际值
# 必需配置：
#   - EXPO_PUBLIC_BACKEND_BASE_URL
#   - COZE_SUPABASE_URL
#   - COZE_SUPABASE_ANON_KEY
#   - COZE_BUCKET_ENDPOINT_URL
#   - COZE_BUCKET_NAME
```

详细说明请参考 [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)。

### 4. 安装依赖

```bash
# 安装根目录依赖
pnpm install

# 安装前端依赖
cd client && pnpm install

# 安装后端依赖
cd server && pnpm install
```

### 5. 初始化演示数据

推荐方式：使用 Supabase SQL Editor

```bash
# 打开 server/demo-data.sql
# 复制全部内容到 Supabase SQL Editor
# 点击执行
```

详细说明请参考 [DEMO_DATA.md](./DEMO_DATA.md)。

### 6. 启动服务

```bash
# 方式 1：使用 coze dev（推荐）
coze dev

# 方式 2：手动启动
# 终端 1 - 启动前端
cd client && pnpm start

# 终端 2 - 启动后端
cd server && pnpm run dev
```

详细说明请参考 [LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md)。

---

## 📋 环境变量总览

### 必需配置（最小化部署）

| 变量名 | 用途 | 示例值 |
|--------|------|--------|
| `EXPO_PUBLIC_BACKEND_BASE_URL` | 后端 API 地址 | `http://localhost:9091` |
| `COZE_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `COZE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI...` |
| `COZE_BUCKET_ENDPOINT_URL` | 对象存储端点 | `https://s3.amazonaws.com` |
| `COZE_BUCKET_NAME` | 对象存储桶名称 | `voxora-uploads` |

### 可选配置

| 变量名 | 用途 | 默认值 |
|--------|------|--------|
| `PORT` | 后端服务端口 | `9091` |
| `NODE_ENV` | 环境类型 | `development` |
| `DATABASE_URL` | 数据库连接字符串 | - |
| `COZE_SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 | - |

完整列表请参考 [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)。

---

## 🗄️ 演示数据

项目包含完整的演示数据：

- **3 个家庭**
- **6 个用户**
- **11 条回忆**（包含照片、语音、情感）
- **3 个 Vlog**（AI 生成的视频回忆）

详细数据统计请参考 [server/DEMO_DATA_README.md](./server/DEMO_DATA_README.md)。

---

## 🔒 安全提示

### 必须保密的环境变量

以下变量包含敏感信息，**必须保密**：

- 🔴 `COZE_SUPABASE_SERVICE_ROLE_KEY` - 管理员权限
- 🔴 `DATABASE_URL` - 包含数据库密码
- 🔴 `SUPABASE_DB_PASSWORD` - 数据库密码

### Git 忽略配置

项目已配置 `.gitignore`，自动忽略以下文件：

```
.env
.env.local
.env.*.local
```

✅ **永远不要将 `.env` 文件提交到 Git！**

---

## 🐛 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `DATABASE_URL` 或 `SUPABASE_DB_PASSWORD` 配置
   - 确认 Supabase 项目已完全创建（等待 2 分钟）
   - 参考 [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) 的故障排除部分

2. **前端无法连接后端**
   - 确认后端服务已启动
   - 检查 `EXPO_PUBLIC_BACKEND_BASE_URL` 配置
   - 尝试 `curl http://localhost:9091/api/v1/health`

3. **对象存储上传失败**
   - 确认 `COZE_BUCKET_ENDPOINT_URL` 和 `COZE_BUCKET_NAME` 配置正确
   - 检查存储桶是否存在
   - 验证访问权限

更多问题请参考各文档的"故障排除"部分。

---

## 📚 相关文档

- [Supabase 官方文档](https://supabase.com/docs)
- [Expo 官方文档](https://docs.expo.dev/)
- [React Native 官方文档](https://reactnative.dev/)

---

## 📞 支持

如有问题，请参考对应文档的详细说明，或查看项目 Issues。

---

**最后更新**：2026-04-17
