# 数据库环境变量说明

## 项目实际使用的环境变量

本项目使用 **Supabase** 作为数据库，使用的环境变量是：

### 核心环境变量
- `COZE_SUPABASE_URL` - Supabase 项目 URL
- `COZE_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `COZE_SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥（可选，用于管理操作）

### 在 Coze 环境中配置
这些变量由 Coze 平台自动注入，无需手动配置。

## 关于 DATABASE_URL 和 POSTGRES_URL

这两个变量通常用于 **直接连接 PostgreSQL 数据库**，而不是通过 Supabase SDK：

- `DATABASE_URL` - PostgreSQL 连接字符串（标准格式）
- `POSTGRES_URL` - 同上，某些平台使用此名称

### 格式示例
```
postgresql://username:password@host:port/database
```

## 如何获取 DATABASE_URL

如果你需要使用 `init-demo-data.js` 脚本，需要获取 Supabase 的数据库连接字符串：

### 方法 1：从 Supabase Dashboard 获取
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 点击 **Settings** → **Database**
4. 找到 **Connection string**
5. 选择 **URI** 格式
6. 复制连接字符串（替换密码）

### 方法 2：使用 Supabase SDK（推荐）
由于项目已经使用 Supabase SDK，建议修改 `init-demo-data.js` 使用 Supabase SDK 而不是直接 SQL。

## 当前项目架构

```
┌─────────────────────────────────────┐
│   Express.js Server                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Supabase Client             │   │
│  │ (使用 COZE_SUPABASE_URL)    │   │
│  └─────────────────────────────┘   │
│           ↓                         │
│  ┌─────────────────────────────┐   │
│  │ Supabase Cloud              │   │
│  │ (PostgreSQL)                │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 演示数据初始化脚本

当前的 `init-demo-data.js` 脚本需要 `DATABASE_URL` 环境变量。

### 临时解决方案

如果你想使用 `init-demo-data.js` 脚本，可以：

1. **在本地开发时**：
   ```bash
   export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"
   node scripts/init-demo-data.js
   ```

2. **或者使用 Supabase SQL Editor**（推荐）：
   - 直接在 Supabase Dashboard 的 SQL Editor 中运行 `demo-data.sql`
   - 不需要任何环境变量配置

3. **或者修改脚本使用 Supabase SDK**（最佳）：
   - 修改 `init-demo-data.js` 使用 Supabase Client
   - 使用现有的 `COZE_SUPABASE_URL` 环境变量

## 推荐方式

对于 Supabase 项目，**推荐使用 Supabase SQL Editor** 来初始化演示数据：

1. 打开 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `server/demo-data.sql` 内容
4. 点击 Run

这是最简单、最安全的方式，无需配置任何额外环境变量。

## 总结

| 环境变量 | 用途 | 是否必需 |
|---------|------|---------|
| `COZE_SUPABASE_URL` | Supabase 项目连接 | ✅ 必需（自动注入） |
| `COZE_SUPABASE_ANON_KEY` | Supabase 认证 | ✅ 必需（自动注入） |
| `COZE_SUPABASE_SERVICE_ROLE_KEY` | 管理操作密钥 | ⭕ 可选 |
| `DATABASE_URL` | 直接 PostgreSQL 连接 | ⭕ 仅用于 init-demo-data.js |
| `POSTGRES_URL` | 同上 | ⭕ 仅用于 init-demo-data.js |

**项目正常运行只需要 COZE_SUPABASE_URL 和 COZE_SUPABASE_ANON_KEY！**
