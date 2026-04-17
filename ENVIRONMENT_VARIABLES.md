# Voxora 环境变量完整文档

本文档详细说明了 Voxora 家庭回忆录应用所需的所有环境变量及其配置方法。

## 📋 环境变量总览

| 变量名 | 必需 | 环境 | 用途 | 获取方式 |
|--------|------|------|------|----------|
| `EXPO_PUBLIC_BACKEND_BASE_URL` | ✅ | 前端 | 后端 API 地址 | 手动配置 |
| `EXPO_PUBLIC_API_BASE` | ❌ | 前端 | API 基础 URL | 手动配置 |
| `EXPO_PUBLIC_COZE_PROJECT_ID` | ❌ | 前端 | Coze 项目 ID | 手动配置 |
| `EXPO_PUBLIC_COZE_PROJECT_NAME` | ❌ | 前端 | 应用名称 | 手动配置 |
| `PORT` | ❌ | 后端 | 服务端口 | 手动配置 |
| `NODE_ENV` | ❌ | 后端 | 环境类型 | 手动配置 |
| `COZE_SUPABASE_URL` | ✅ | 前后端 | Supabase 项目 URL | Supabase Dashboard |
| `COZE_SUPABASE_ANON_KEY` | ✅ | 前后端 | Supabase 匿名密钥 | Supabase Dashboard |
| `COZE_SUPABASE_SERVICE_ROLE_KEY` | ❌ | 后端 | Supabase 服务角色密钥 | Supabase Dashboard |
| `DATABASE_URL` | ❌ | 后端 | 数据库连接字符串 | Supabase Dashboard |
| `POSTGRES_URL` | ❌ | 后端 | PostgreSQL 连接 URL | Supabase Dashboard |
| `SUPABASE_DB_PASSWORD` | ❌ | 后端 | 数据库密码 | Supabase Dashboard |
| `POSTGRES_PASSWORD` | ❌ | 后端 | Postgres 密码 | Supabase Dashboard |
| `COZE_BUCKET_ENDPOINT_URL` | ✅ | 后端 | 对象存储端点 | 系统注入或手动配置 |
| `COZE_BUCKET_NAME` | ✅ | 后端 | 对象存储桶名称 | 系统注入或手动配置 |

---

## 🔧 前端环境变量

### EXPO_PUBLIC_BACKEND_BASE_URL（必需）

**用途**：后端 API 的基础 URL，前端通过此地址调用后端接口

**格式**：
```
http://localhost:9091          # 本地开发
https://api.your-domain.com    # 生产环境
```

**使用位置**：
- `client/services/api.ts`
- 所有前端 fetch 请求

**配置示例**：
```bash
EXPO_PUBLIC_BACKEND_BASE_URL=http://localhost:9091
```

---

### EXPO_PUBLIC_API_BASE（可选）

**用途**：API 基础 URL（备用）

**格式**：与 `EXPO_PUBLIC_BACKEND_BASE_URL` 类似

**使用位置**：
- `client/utils/index.ts`

**配置示例**：
```bash
EXPO_PUBLIC_API_BASE=http://localhost:9091
```

---

### EXPO_PUBLIC_COZE_PROJECT_ID（可选）

**用途**：Coze 项目 ID，用于构建应用的 slug 和 package name

**格式**：数字或字符串

**使用位置**：
- `client/app.config.ts` - 构建 slug 和 package name

**配置示例**：
```bash
EXPO_PUBLIC_COZE_PROJECT_ID=123456
```

---

### EXPO_PUBLIC_COZE_PROJECT_NAME（可选）

**用途**：应用的显示名称

**格式**：字符串

**使用位置**：
- `client/app.config.ts` - 应用名称

**配置示例**：
```bash
EXPO_PUBLIC_COZE_PROJECT_NAME=Voxora
```

---

## 🔧 后端环境变量

### PORT（可选）

**用途**：Express 后端服务监听的端口

**格式**：端口号（数字）

**默认值**：`9091`

**使用位置**：
- `server/src/index.ts`

**配置示例**：
```bash
PORT=9091
```

---

### NODE_ENV（可选）

**用途**：指定运行环境

**格式**：`development` | `production` | `test`

**默认值**：`development`

**配置示例**：
```bash
NODE_ENV=development
```

---

## 🔧 Supabase 配置（必需）

### COZE_SUPABASE_URL（必需）

**用途**：Supabase 项目的 URL，用于连接 Supabase 服务

**格式**：`https://xxx.supabase.co`

**获取方式**：
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入项目
3. 点击 **Settings** → **API**
4. 复制 **Project URL**

**使用位置**：
- `server/src/storage/database/supabase-client.ts`
- `server/scripts/init-demo-data.js`

**配置示例**：
```bash
COZE_SUPABASE_URL=https://abcdefgh123456.supabase.co
```

---

### COZE_SUPABASE_ANON_KEY（必需）

**用途**：Supabase 匿名密钥，用于客户端访问

**格式**：长字符串（通常 200+ 字符）

**获取方式**：
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入项目
3. 点击 **Settings** → **API**
4. 复制 **anon public key**

**安全级别**：⚠️ 低（可以公开）

**使用位置**：
- `server/src/storage/database/supabase-client.ts`
- 前端代码（如果需要）

**配置示例**：
```bash
COZE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMDAwMDAwMCwiZXhwIjoxOTQ1NTU1NTU1fQ.abcdefghijklmnopqrstuvwxyz1234567890
```

---

### COZE_SUPABASE_SERVICE_ROLE_KEY（可选）

**用途**：Supabase 服务角色密钥，用于服务端管理操作

**格式**：长字符串（通常 200+ 字符）

**获取方式**：
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入项目
3. 点击 **Settings** → **API**
4. 复制 **service_role secret**

**安全级别**：🔴 极高（必须保密）

**使用位置**：
- `server/src/storage/database/supabase-client.ts` - `getServiceRoleClient()`

**配置示例**：
```bash
COZE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnMiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjMwMDAwMDAwLCJleHAiOjE5NDU1NTU1NTV9.abcdefghijklmnopqrstuvwxyz1234567890
```

⚠️ **安全警告**：此密钥具有管理员权限，可以绕过所有安全限制（如 RLS 策略），仅用于服务端管理操作，切勿泄露！

---

## 🔧 数据库连接配置（可选）

### DATABASE_URL（可选）

**用途**：完整的 PostgreSQL 数据库连接字符串

**格式**：`postgresql://user:password@host:port/database`

**获取方式**：
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入项目
3. 点击 **Settings** → **Database**
4. 找到 **Connection string**
5. 选择 **URI** 格式
6. 点击 **Copy**

**使用位置**：
- `server/scripts/init-demo-data.js`

**配置示例**：
```bash
DATABASE_URL=postgresql://postgres:your-password@db.abcdefgh123456.supabase.co:5432/postgres
```

---

### POSTGRES_URL（可选）

**用途**：PostgreSQL 连接 URL（与 `DATABASE_URL` 作用相同）

**格式**：与 `DATABASE_URL` 相同

**使用位置**：
- `server/scripts/init-demo-data.js`

**配置示例**：
```bash
POSTGRES_URL=postgresql://postgres:your-password@db.abcdefgh123456.supabase.co:5432/postgres
```

---

### SUPABASE_DB_PASSWORD（可选）

**用途**：Supabase 数据库密码（脚本会自动从 `COZE_SUPABASE_URL` 提取并构建连接）

**格式**：纯密码字符串

**获取方式**：
1. 创建 Supabase 项目时设置的数据库密码
2. 或在 Supabase Dashboard → Settings → Database 重置密码

**使用位置**：
- `server/scripts/init-demo-data.js` - 自动构建 `DATABASE_URL`

**配置示例**：
```bash
SUPABASE_DB_PASSWORD=YourSecurePassword123
```

---

### POSTGRES_PASSWORD（可选）

**用途**：Postgres 密码（与 `SUPABASE_DB_PASSWORD` 作用相同）

**格式**：与 `SUPABASE_DB_PASSWORD` 相同

**使用位置**：
- `server/scripts/init-demo-data.js`

**配置示例**：
```bash
POSTGRES_PASSWORD=YourSecurePassword123
```

---

## 🔧 对象存储配置（必需）

### COZE_BUCKET_ENDPOINT_URL（必需）

**用途**：S3 兼容对象存储的端点 URL

**格式**：`https://your-storage-endpoint.com`

**获取方式**：
- 系统环境自动注入（生产环境）
- 对象存储服务商提供的端点（本地部署）

**使用位置**：
- `server/src/routes/upload.ts`

**配置示例**：
```bash
COZE_BUCKET_ENDPOINT_URL=https://s3.amazonaws.com
```

---

### COZE_BUCKET_NAME（必需）

**用途**：S3 存储桶的名称

**格式**：存储桶名称（字符串）

**获取方式**：
- 系统环境自动注入（生产环境）
- 在对象存储服务中创建的存储桶名称

**使用位置**：
- `server/src/routes/upload.ts`

**配置示例**：
```bash
COZE_BUCKET_NAME=voxora-uploads
```

---

## 🔧 环境变量优先级

### 前端配置优先级

**应用名称**：
```
COZE_PROJECT_NAME > EXPO_PUBLIC_COZE_PROJECT_NAME > '应用'
```

**项目 ID**：
```
COZE_PROJECT_ID > EXPO_PUBLIC_COZE_PROJECT_ID
```

### 数据库连接优先级（init-demo-data.js）

```
DATABASE_URL > POSTGRES_URL > (COZE_SUPABASE_URL + SUPABASE_DB_PASSWORD)
```

---

## 📝 最小化部署配置

如果只是运行应用，最少需要配置以下变量：

```bash
# 前端配置
EXPO_PUBLIC_BACKEND_BASE_URL=http://localhost:9091

# Supabase 配置
COZE_SUPABASE_URL=https://your-project-id.supabase.co
COZE_SUPABASE_ANON_KEY=your-anon-key-here

# 对象存储配置
COZE_BUCKET_ENDPOINT_URL=https://your-storage-endpoint.com
COZE_BUCKET_NAME=your-bucket-name
```

---

## 🔒 安全最佳实践

### 必须保密的环境变量

以下变量包含敏感信息，**必须保密**：

- 🔴 `COZE_SUPABASE_SERVICE_ROLE_KEY` - 管理员权限
- 🔴 `DATABASE_URL` - 包含数据库密码
- 🔴 `POSTGRES_URL` - 包含数据库密码
- 🔴 `SUPABASE_DB_PASSWORD` - 数据库密码
- 🔴 `POSTGRES_PASSWORD` - 数据库密码

### 可以公开的环境变量

以下变量相对安全，**可以公开**（但仍建议保密）：

- 🟡 `COZE_SUPABASE_URL` - 项目 URL
- 🟡 `COZE_SUPABASE_ANON_KEY` - 匿名密钥
- 🟢 `EXPO_PUBLIC_BACKEND_BASE_URL` - API 地址
- 🟢 `PORT` - 端口号
- 🟢 `NODE_ENV` - 环境类型

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

### 问题：数据库连接失败

**可能原因**：
1. `DATABASE_URL` 或 `SUPABASE_DB_PASSWORD` 配置错误
2. Supabase 项目未完全创建（等待 2 分钟）
3. 数据库密码已更改

**解决方案**：
1. 检查 Supabase Dashboard 中的连接字符串
2. 确认数据库密码正确
3. 尝试使用 Supabase SQL Editor 方式初始化数据

### 问题：对象存储上传失败

**可能原因**：
1. `COZE_BUCKET_ENDPOINT_URL` 或 `COZE_BUCKET_NAME` 配置错误
2. 存储桶不存在或权限不足

**解决方案**：
1. 确认存储桶已创建
2. 检查访问权限配置
3. 验证端点 URL 是否正确

### 问题：前端无法连接后端

**可能原因**：
1. `EXPO_PUBLIC_BACKEND_BASE_URL` 配置错误
2. 后端服务未启动
3. 防火墙阻止连接

**解决方案**：
1. 确认后端服务已启动（`curl http://localhost:9091/api/v1/health`）
2. 检查 `EXPO_PUBLIC_BACKEND_BASE_URL` 是否正确
3. 确认端口号配置一致

---

## 📚 参考文档

- [本地部署指南](./LOCAL_DEPLOYMENT.md)
- [Supabase 配置获取指南](./SUPABASE_SETUP.md)
- [数据库配置详解](./server/DATABASE_CONFIG.md)
- [演示数据说明](./DEMO_DATA.md)

---

**最后更新**：2026-04-17
