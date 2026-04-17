# 如何获取 Supabase 配置凭证

## 完整步骤指南

### 1. 创建 Supabase 账户

如果你还没有 Supabase 账户：
1. 访问 https://supabase.com
2. 点击 "Start your project"
3. 使用 GitHub 账号登录或注册新账户

### 2. 创建新项目

1. 登录后，点击 **"New Project"** 按钮
2. 填写项目信息：
   ```
   Name: voxora-demo
   Database Password: [设置一个强密码，至少10个字符]
   Region: Northeast Asia (Seoul) 或 Southeast Asia (Singapore)
   Pricing Plan: Free (推荐用于测试)
   ```
3. 点击 **"Create new project"**
4. 等待项目创建完成（通常需要 1-2 分钟）

### 3. 获取 API 配置

项目创建完成后：

1. 在左侧菜单中，点击 **Settings** → **API**
2. 你会看到以下信息：

   #### Project URL（必需）
   ```
   https://[project-id].supabase.co
   示例: https://abcdefgh123456.supabase.co
   ```

   #### anon public key（必需）
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   （这是一个长字符串，通常有 200+ 字符）
   ```

   #### service_role secret（可选但推荐）
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   （这是另一个长字符串，用于管理操作）
   ```

3. 点击每个值旁边的 **复制图标** 📋

### 4. 填写环境变量

打开项目根目录的 `.env` 文件，填入你复制的值：

```bash
# Supabase 配置
COZE_SUPABASE_URL=https://abcdefgh123456.supabase.co
COZE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMDAwMDAwMCwiZXhwIjoxOTQ1NTU1NTU1fQ.abcdefghijklmnopqrstuvwxyz1234567890

# 可选：服务角色密钥（用于管理操作）
COZE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnMiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjMwMDAwMDAwLCJleHAiOjE5NDU1NTU1NTV9.abcdefghijklmnopqrstuvwxyz1234567890
```

### 5. 获取数据库连接信息（用于演示数据初始化）

如果你想使用 `init-demo-data.js` 脚本：

1. 在左侧菜单中，点击 **Settings** → **Database**
2. 向下滚动找到 **Connection string**
3. 选择 **URI** 格式
4. 点击 **Copy** 按钮复制连接字符串

连接字符串格式：
```
postgresql://postgres:[YOUR-PASSWORD]@db.[project-id].supabase.co:5432/postgres
```

在 `.env` 文件中添加：

```bash
# 方式 1：使用完整的 DATABASE_URL
DATABASE_URL=postgresql://postgres:your-database-password@db.abcdefgh123456.supabase.co:5432/postgres

# 或者方式 2：使用密码（脚本会自动构建连接）
SUPABASE_DB_PASSWORD=your-database-password
```

### 6. 验证配置

保存 `.env` 文件后，测试配置是否正确：

```bash
# 测试后端配置
cd server
node -e "console.log('COZE_SUPABASE_URL:', process.env.COZE_SUPABASE_URL); console.log('COZE_SUPABASE_ANON_KEY:', process.env.COZE_SUPABASE_ANON_KEY ? 'Found' : 'Missing')"
```

应该看到：
```
COZE_SUPABASE_URL: https://abcdefgh123456.supabase.co
COZE_SUPABASE_ANON_KEY: Found
```

### 7. 测试数据库连接（可选）

```bash
cd server
node scripts/init-demo-data.js
```

如果配置正确，你应该看到：
```
✅ 成功读取 SQL 文件
🔗 连接到数据库...
📝 正在执行 SQL 脚本...

✅ 演示数据初始化完成！
📊 统计信息：
   - 成功执行：14 条语句
   - 错误：0 条语句
```

## ⚠️ 安全提示

### 重要注意事项

1. **不要分享你的密钥**
   - ⚠️ **永远不要**将 `service_role secret` 分享给任何人
   - ⚠️ 这个密钥具有管理员权限，可以绕过所有安全限制

2. **不要提交到 Git**
   - ✅ `.env` 文件已添加到 `.gitignore`
   - ✅ 只提交 `.env.example` 作为模板

3. **区分不同密钥**
   - **anon public key**: 可以公开，用于客户端
   - **service_role secret**: 必须保密，仅用于服务端

4. **定期更换密钥**
   - 在生产环境中，建议定期更换密钥
   - 可以在 Supabase Dashboard 中重新生成

## 🔑 密钥用途说明

| 密钥名称 | 用途 | 安全级别 | 使用位置 |
|---------|------|---------|---------|
| `COZE_SUPABASE_URL` | 项目 URL | 公开 | 前端和后端 |
| `COZE_SUPABASE_ANON_KEY` | 匿名访问 | 低 | 前端和后端 |
| `COZE_SUPABASE_SERVICE_ROLE_KEY` | 管理操作 | 高 | 仅后端 |
| `DATABASE_URL` | 数据库连接 | 高 | 仅初始化脚本 |
| `SUPABASE_DB_PASSWORD` | 数据库密码 | 高 | 仅初始化脚本 |

## 🐛 故障排除

### 问题：找不到 API 设置页面

**解决方案**：
1. 确保你已经登录 Supabase 账户
2. 确保你已经创建了一个项目
3. 在左侧菜单中找到 "Settings"，然后点击 "API"

### 问题：密钥太长，复制不完整

**解决方案**：
1. 使用 Supabase Dashboard 的复制按钮（📋）
2. 不要手动复制，容易出错
3. 复制后，确保开头是 `eyJhbGci`，包含完整的字符串

### 问题：数据库连接失败

**解决方案**：
1. 确认数据库密码正确（创建项目时设置的）
2. 检查 Supabase 项目是否已经完全创建（等待2分钟）
3. 尝试重置数据库密码：
   - Settings → Database → Reset database password

### 问题：演示数据初始化失败

**解决方案**：
1. 确认 `.env` 文件已正确配置
2. 使用 Supabase SQL Editor 方式初始化（更可靠）
3. 查看 `server/DATABASE_CONFIG.md` 了解详情

## 📚 参考资源

- [Supabase 官方文档 - API](https://supabase.com/docs/guides/api)
- [Supabase 官方文档 - Database](https://supabase.com/docs/guides/database)
- [本地部署完整指南](./LOCAL_DEPLOYMENT.md)

---

**配置完成后，请返回 [LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md) 继续部署流程。**
