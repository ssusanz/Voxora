/**
 * Voxora 演示数据初始化脚本
 *
 * 用法：node scripts/init-demo-data.js
 *
 * 环境变量：
 *   DATABASE_URL - PostgreSQL 数据库连接字符串
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从环境变量或默认值读取数据库配置
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('❌ 错误：未找到数据库连接字符串');
  console.error('请设置环境变量 DATABASE_URL 或 POSTGRES_URL');
  process.exit(1);
}

// 创建数据库连接池
const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 读取 SQL 文件
const sqlFilePath = path.join(__dirname, '../demo-data.sql');
let sqlContent;

try {
  sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  console.log('✅ 成功读取 SQL 文件');
} catch (error) {
  console.error('❌ 错误：无法读取 SQL 文件', error.message);
  process.exit(1);
}

// 执行 SQL 脚本
async function initDemoData() {
  const client = await pool.connect();

  try {
    console.log('🔗 连接到数据库...');
    console.log('📝 正在执行 SQL 脚本...\n');

    // 分割 SQL 语句（简单分割，不处理嵌套的分号）
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        await client.query(statement);
        successCount++;
      } catch (error) {
        // 忽略"重复键"错误（数据已存在）
        if (error.code === '23505') {
          console.log(`⚠️  跳过重复数据: ${statement.substring(0, 50)}...`);
        } else {
          console.error(`❌ 执行错误:`, error.message);
          errorCount++;
        }
      }
    }

    console.log('\n✅ 演示数据初始化完成！');
    console.log(`📊 统计信息：`);
    console.log(`   - 成功执行：${successCount} 条语句`);
    console.log(`   - 错误：${errorCount} 条语句`);
    console.log(`\n💡 提示：查看 server/DEMO_DATA_README.md 了解详情`);

    // 查询数据统计
    const [familiesResult, usersResult, memoriesResult, vlogsResult] = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM families'),
      client.query('SELECT COUNT(*) as count FROM users'),
      client.query('SELECT COUNT(*) as count FROM memories'),
      client.query('SELECT COUNT(*) as count FROM vlogs'),
    ]);

    console.log(`\n📋 当前数据统计：`);
    console.log(`   - 家庭数量：${familiesResult.rows[0].count}`);
    console.log(`   - 用户数量：${usersResult.rows[0].count}`);
    console.log(`   - 回忆数量：${memoriesResult.rows[0].count}`);
    console.log(`   - Vlog 数量：${vlogsResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ 初始化失败：', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 运行初始化
initDemoData().catch((error) => {
  console.error('❌ 未捕获的错误：', error);
  process.exit(1);
});
