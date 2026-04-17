# 演示数据使用说明

本目录包含 Voxora 应用的演示数据，用于展示应用功能。

## 文件说明

### `demo-data.sql`
包含完整的演示数据，包括：
- **3 个家庭**：温馨之家、幸福一家人、快乐小家庭
- **6 个用户**：每个家庭的成员
- **11 条回忆**：
  - 春节团聚
  - 暑假旅行
  - 周末野餐
  - 生日派对
  - 海边度假
  - 婚礼纪念日
  - 露营体验
  - 第一次游泳
  - 圣诞节
  - 动物园一日游
  - 时光胶囊（已封存，2025年解锁）
- **3 个 Vlog**：基于回忆生成的视频记录

所有图片使用 Unsplash 免费图库，无需额外配置。

## 如何使用演示数据

### 方法 1：通过 Supabase 控制台（推荐）

1. 登录 Supabase 控制台（https://supabase.com/dashboard）
2. 选择你的项目
3. 点击左侧菜单的 **SQL Editor**
4. 创建新查询
5. 复制 `demo-data.sql` 的内容
6. 点击 **Run** 执行脚本
7. 等待执行完成，底部会显示 "演示数据初始化完成！"

### 方法 2：通过命令行

如果你有 `psql` 客户端并知道数据库连接信息：

```bash
psql -h <your-db-host> -U <your-db-user> -d <your-db-name> -f demo-data.sql
```

### 方法 3：通过 Node.js 脚本（开发环境）

```bash
cd /workspace/projects/server
node scripts/init-demo-data.js
```

## 数据预览

### 家庭数据
| 家庭 ID | 名称 | 成员数 |
|---------|------|--------|
| family-001 | 温馨之家 | 4 |
| family-002 | 幸福一家人 | 2 |
| family-003 | 快乐小家庭 | 0 |

### 用户数据
| 用户 ID | 姓名 | 邮箱 | 家庭 | 角色 |
|---------|------|------|------|------|
| user-001 | 小明 | xiaoming@demo.com | 温馨之家 | 孩子 |
| user-002 | 小红 | xiaohong@demo.com | 温馨之家 | 孩子 |
| user-003 | 爸爸 | dad@demo.com | 温馨之家 | 家长 |
| user-004 | 妈妈 | mom@demo.com | 温馨之家 | 家长 |
| user-005 | 小华 | xiaohua@demo.com | 幸福一家人 | 配偶 |
| user-006 | 小丽 | xiaoli@demo.com | 幸福一家人 | 配偶 |

### 回忆数据亮点
- **春节团聚**：4人参与，12个点赞，3张照片
- **生日派对**：4人参与，20个点赞，3张照片
- **时光胶囊**：已封存，2025年1月1日解锁

### Vlog 数据
- **2024家庭回忆录**：包含3条回忆
- **假期欢乐时光**：包含2条回忆
- **爱情纪念日**：包含1条回忆

## 注意事项

1. **图片链接**：所有图片使用 Unsplash CDN，需要网络连接
2. **数据持久化**：演示数据会永久保存在数据库中，如需清理请手动删除
3. **ID 冲突**：如果数据库中已有相同 ID 的数据，脚本会报错。可以先清空表或修改 ID
4. **权限问题**：确保执行脚本的用户有足够的数据库权限

## 清除演示数据

如需清除所有演示数据，运行以下 SQL：

```sql
-- 删除 Vlog
DELETE FROM vlogs WHERE id LIKE 'vlog-%';

-- 删除回忆
DELETE FROM memories WHERE id LIKE 'mem-%';

-- 删除用户
DELETE FROM users WHERE id LIKE 'user-%';

-- 删除家庭
DELETE FROM families WHERE id LIKE 'family-%';

-- 如果有 reactions 表，也删除
-- DELETE FROM reactions WHERE id LIKE 'rxn-%';

-- 如果有 whiteboard_messages 表，也删除
-- DELETE FROM whiteboard_messages WHERE id LIKE 'wb-%';
```

## 自定义演示数据

如需修改演示数据，编辑 `demo-data.sql` 文件：

1. 修改现有记录的数据（如标题、图片链接等）
2. 添加新的记录（复制现有格式并修改）
3. 删除不需要的记录
4. 重新执行脚本

## 技术细节

### 使用的图片资源
所有图片来自 Unsplash，采用商业友好许可：
- 人物照片：肖像摄影
- 场景照片：自然风光、家庭场景
- 质量高，加载快

### 数据关系
- 家庭 → 用户（一对多）
- 用户 → 回忆（一对多）
- 回忆 → Vlog（多对一）
- 家庭 → 回忆（一对多）

### 日期格式
所有日期使用 ISO 8601 格式（YYYY-MM-DD），时区为 UTC。

## 支持

如有问题，请查看：
- Supabase 官方文档：https://supabase.com/docs
- Drizzle ORM 文档：https://orm.drizzle.team
