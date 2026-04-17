/**
 * Voxora 演示数据初始化脚本
 *
 * 用法：node scripts/init-demo-data.js
 *
 * 环境变量：
 *   DATABASE_URL - PostgreSQL 数据库连接字符串（可选）
 *   POSTGRES_URL - PostgreSQL 数据库连接字符串（可选）
 *   COZE_SUPABASE_URL - Supabase 项目 URL（会自动提取数据库连接）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 尝试从多种来源获取数据库连接字符串
let databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// 如果没有直接提供，尝试从 COZE_SUPABASE_URL 提取
if (!databaseUrl && process.env.COZE_SUPABASE_URL) {
  try {
    // COZE_SUPABASE_URL 格式: https://xxx.supabase.co
    const supabaseUrl = process.env.COZE_SUPABASE_URL;
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

    if (projectId) {
      // Supabase 默认连接字符串格式
      // 注意：需要设置数据库密码作为环境变量
      const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;

      if (dbPassword) {
        databaseUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectId}.supabase.co:5432/postgres`;
        console.log('✅ 从 COZE_SUPABASE_URL 提取数据库连接字符串');
      } else {
        console.warn('⚠️  检测到 COZE_SUPABASE_URL 但缺少 SUPABASE_DB_PASSWORD 或 POSTGRES_PASSWORD');
        console.warn('⚠️  请设置数据库密码环境变量，或直接设置 DATABASE_URL');
      }
    }
  } catch (error) {
    console.warn('⚠️  无法从 COZE_SUPABASE_URL 提取数据库连接:', error.message);
  }
}

if (!databaseUrl) {
  console.error('❌ 错误：未找到数据库连接字符串');
  console.error('');
  console.error('请设置以下环境变量之一：');
  console.error('  1. DATABASE_URL - PostgreSQL 连接字符串（推荐）');
  console.error('  2. POSTGRES_URL - 同上（某些平台使用此名称）');
  console.error('');
  console.error('或者使用 Supabase 环境：');
  console.error('  3. COZE_SUPABASE_URL + SUPABASE_DB_PASSWORD');
  console.error('');
  console.error('示例：');
  console.error('  export DATABASE_URL="postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres"');
  console.error('  node scripts/init-demo-data.js');
  console.error('');
  console.error('💡 提示：更简单的方法是直接在 Supabase SQL Editor 中运行 demo-data.sql');
  console.error('   查看 server/DEMO_DATA_README.md 了解更多方法');
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
