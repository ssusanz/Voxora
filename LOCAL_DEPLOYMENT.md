# Voxora 本地部署指南

## 📋 前置要求

在开始本地部署之前，请确保已安装以下工具：

- **Node.js** 18.x 或更高版本
- **pnpm** 包管理器（推荐）
- **Git** 版本控制
- **Supabase 账户**（免费即可）

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/ssusanz/Voxora.git
cd Voxora
```

### 2. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/dashboard)
2. 点击 "New Project"
3. 填写项目信息：
   - Name: voxora-demo（或任意名称）
   - Database Password: 设置一个强密码（请记住！）
   - Region: 选择最近的区域（如 Singapore 或 Tokyo）
4. 等待项目创建完成（约2分钟）

### 3. 获取 Supabase 凭证

创建完成后，获取以下信息：

1. 进入 **Settings** → **API**
2. 记录以下值：
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role secret**: 可选，但建议记录

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
nano .env  # 或使用其他编辑器
```

填入以下必需配置：

```bash
# Supabase 配置
COZE_SUPABASE_URL=https://your-project-id.supabase.co
COZE_SUPABASE_ANON_KEY=your-anon-key-here
COZE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here  # 可选
```

### 5. 安装依赖

```bash
# 安装根目录依赖
pnpm install

# 安装前端依赖
cd client
pnpm install

# 安装后端依赖
cd ../server
pnpm install
```

### 6. 初始化数据库

选择以下方式之一：

#### 方式 A：使用 Supabase SQL Editor（推荐）

1. 回到 Supabase Dashboard
2. 点击 **SQL Editor**
3. 新建查询
4. 复制 `server/demo-data.sql` 的全部内容
5. 点击 **Run**
6. 等待执行完成（底部显示 "演示数据初始化完成！"）

#### 方式 B：使用初始化脚本（需要配置数据库密码）

编辑 `.env` 文件，添加：
```bash
SUPABASE_DB_PASSWORD=your-database-password
```

然后运行：
```bash
cd server
node scripts/init-demo-data.js
```

### 7. 启动开发服务器

```bash
# 返回项目根目录
cd /path/to/Voxora

# 启动前后端服务（使用项目脚本）
bash .cozeproj/scripts/dev_run.sh

# 或者手动启动（需要两个终端窗口）

# 终端 1：启动后端
cd server
pnpm run dev

# 终端 2：启动前端
cd client
pnpm start
```

### 8. 访问应用

- **前端（Web）**: http://localhost:8081
- **后端 API**: http://localhost:9091
- **API 健康检查**: http://localhost:9091/api/v1/health

## 📱 移动端调试

### 使用 Expo Go（推荐）

1. 在手机上下载 [Expo Go](https://expo.dev/client)
2. 确保手机和电脑在同一 Wi-Fi 网络
3. 在电脑终端中，复制显示的二维码
4. 用 Expo Go 扫描二维码
5. 应用将在手机上打开

### 使用 iOS 模拟器

```bash
cd client
pnpm ios
```

### 使用 Android 模拟器

```bash
cd client
pnpm android
```

## 🔧 常见问题

### 问题 1：后端启动失败，提示 COZE_SUPABASE_URL 未设置

**解决方案**：
```bash
# 检查 .env 文件是否存在
ls -la .env

# 检查环境变量是否正确加载
cat .env

# 重启服务
bash .cozeproj/scripts/dev_run.sh
```

### 问题 2：数据库连接失败

**解决方案**：
1. 检查 Supabase 项目是否已经创建完成
2. 确认 COZE_SUPABASE_URL 和 COZE_SUPABASE_ANON_KEY 是否正确
3. 检查网络连接是否正常
4. 尝试 ping Supabase 服务器：
   ```bash
   ping your-project-id.supabase.co
   ```

### 问题 3：演示数据初始化失败

**解决方案**：
- 使用 Supabase SQL Editor 方式（最可靠）
- 或者确保数据库密码正确：
  ```bash
  # 检查密码
  echo $SUPABASE_DB_PASSWORD

  # 或在 Supabase Dashboard 中重置数据库密码
  # Settings → Database → Reset database password
  ```

### 问题 4：前端无法连接后端

**解决方案**：
1. 确认后端服务正在运行（http://localhost:9091）
2. 检查后端端口是否被占用：
   ```bash
   lsof -i :9091
   ```
3. 检查防火墙设置

### 问题 5：expo-av 弃用警告

**解决方案**：
这是一个警告，不影响功能。expo-av 在 Expo SDK 54 中虽然标记为弃用，但仍然完全可用。

如果想消除警告，需要：
1. 等待官方提供迁移指南
2. 或接受当前警告（推荐）

## 📊 验证部署

部署成功后，你应该能够：

- ✅ 访问 http://localhost:8081 看到应用界面
- ✅ 在 "瞬间" 页面看到 11 条回忆
- ✅ 在 "我的" 页面看到用户信息和统计数据
- ✅ 在 "家庭" 页面看到 3 个家庭
- ✅ 点击回忆查看详情，浏览照片墙
- ✅ 发送情感反应
- ✅ 生成回忆总结
- ✅ 录制语音互动

## 🛠️ 开发工具

### 查看日志

```bash
# 查看前端日志
tail -f logs/console.log

# 查看后端日志
tail -f logs/app.log
```

### 代码检查

```bash
# 检查前端代码
npm run lint:client

# 检查后端代码
npm run lint:server
```

### 重启服务

```bash
# 使用项目脚本重启
bash .cozeproj/scripts/dev_run.sh
```

## 🔐 安全建议

1. **不要提交 .env 文件**：已添加到 .gitignore
2. **不要分享 service_role key**：具有管理员权限
3. **定期更新数据库密码**
4. **在生产环境使用环境变量管理服务**

## 📚 相关文档

- [Supabase 官方文档](https://supabase.com/docs)
- [Expo 官方文档](https://docs.expo.dev)
- [React Native 官方文档](https://reactnative.dev)
- [项目演示数据说明](./server/DEMO_DATA_README.md)
- [数据库配置说明](./server/DATABASE_CONFIG.md)

## 🆘 获取帮助

如果遇到问题：

1. 查看本文档的 "常见问题" 部分
2. 检查 [项目 Issues](https://github.com/ssusanz/Voxora/issues)
3. 查看相关文档链接

## 📝 更新日志

- 2024-01-xx: 初始版本
- 包含完整的部署流程和故障排除指南

---

**祝您部署顺利！** 🎉
