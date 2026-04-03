# Voxora 数据迁移指南

## 概述

本指南帮助将国内版 Voxora 数据迁移到海外版，供印度同事使用。

---

## 数据概览

| 数据类型 | 数量 | 说明 |
|---------|------|------|
| 回忆记录 | 8 条 | 包含标题、日期、地点、天气、心情 |
| 图片文件 | 2 个 | 已上传到对象存储 |

---

## 方法一：使用 API 迁移（推荐）

印度同事在海外版开通服务后，直接调用 API 导入数据：

### 步骤 1：复制数据文件

将 `memories_data.json` 发送给印度同事

### 步骤 2：运行导入脚本

在海外版项目中创建导入脚本：

```javascript
// import_data.js
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./memories_data.json', 'utf8'));

async function importData() {
  for (const memory of data) {
    await fetch('http://localhost:9091/api/v1/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: memory.title,
        memory_date: memory.memory_date,
        location: memory.location,
        weather: memory.weather,
        mood: memory.mood,
      }),
    });
  }
  console.log('导入完成！');
}

importData();
```

---

## 方法二：使用 SQL 导入

### 步骤 1：进入 Supabase SQL Editor

1. 打开海外版 Coze 项目
2. 进入 Supabase 控制台
3. 点击 SQL Editor

### 步骤 2：执行 SQL 脚本

复制 `migrate_data.sql` 内容并执行

---

## 方法三：手动添加（数据量小时）

如果只有几条数据，可以直接在 App 中手动添加。

---

## 图片文件迁移

由于图片存储在国内版对象存储中，海外版无法直接访问。解决方案：

### 方案 A：重新上传

印度同事在 App 中重新上传图片

### 方案 B：下载后传输

1. 导出国内版图片
2. 通过网盘/邮件发送给印度同事
3. 印度同事在海外版重新上传

---

## 文件清单

```
migration/
├── migrate_data.sql      # SQL 迁移脚本
├── memories_data.json    # JSON 格式数据
└── README.md            # 本说明文档
```

---

## 印度同事操作步骤

### 1. 克隆代码
```bash
git clone https://github.com/ssusanz/Voxora.git
cd Voxora
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 在 Coze 海外版创建项目
- 访问 https://www.coze.com
- 创建新项目，导入 GitHub 仓库
- 开通 Supabase 和 Storage（自动开通）

### 4. 导入数据
选择上述任一方法导入数据

### 5. 启动项目
```bash
pnpm dev
```

---

## 注意事项

1. **数据库隔离**：国内版和海外版数据库完全独立，数据不会自动同步
2. **图片链接失效**：国内版图片链接在海外版无法访问，需要重新上传
3. **ID 重置**：导入数据时 ID 可能会变化，建议让数据库自动生成新 ID

---

## 需要帮助？

如有问题，请联系项目负责人。
