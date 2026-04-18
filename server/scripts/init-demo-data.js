/**
 * Voxora 演示数据初始化脚本
 *
 * 用法：node scripts/init-demo-data.js
 *
 * 环境变量：
 *   DATABASE_URL - PostgreSQL 数据库连接字符串（可选）
 *   POSTGRES_URL - PostgreSQL 数据库连接字符串（可选）
 *   SUPABASE_URL 或 COZE_SUPABASE_URL - Supabase 项目 URL（会自动提取数据库连接）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDotenvIfPresent() {
  const candidates = [
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../../.env.local'),
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../.env.local'),
  ];

  const dotenvPath = candidates.find((p) => fs.existsSync(p));
  if (!dotenvPath) return;

  try {
    const content = fs.readFileSync(dotenvPath, 'utf8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;

      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    console.log(`✅ 已加载环境变量: ${path.relative(process.cwd(), dotenvPath)}`);
  } catch (error) {
    console.warn('⚠️  读取 .env 失败:', error.message);
  }
}

loadDotenvIfPresent();

// 尝试从多种来源获取数据库连接字符串
let databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// 如果没有直接提供，尝试从 Supabase 项目 URL 提取
const supabaseProjectUrl = process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL;
if (!databaseUrl && supabaseProjectUrl) {
  try {
    const supabaseUrl = supabaseProjectUrl;
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

    if (projectId) {
      // Supabase 默认连接字符串格式
      // 注意：需要设置数据库密码作为环境变量
      const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;

      if (dbPassword) {
        databaseUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectId}.supabase.co:5432/postgres`;
        console.log('✅ 从 SUPABASE_URL / COZE_SUPABASE_URL 提取数据库连接字符串');
      } else {
        console.warn('⚠️  检测到 Supabase URL 但缺少 SUPABASE_DB_PASSWORD 或 POSTGRES_PASSWORD');
        console.warn('⚠️  请设置数据库密码环境变量，或直接设置 DATABASE_URL');
      }
    }
  } catch (error) {
    console.warn('⚠️  无法从 Supabase URL 提取数据库连接:', error.message);
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
  console.error('  3. SUPABASE_URL（或 COZE_SUPABASE_URL）+ SUPABASE_DB_PASSWORD');
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
    console.log('🧹 清理旧的演示数据（仅清理 demo id 前缀）...');
    // 注意顺序：先删引用方，再删被引用方
    await client.query("DELETE FROM vlogs WHERE id LIKE 'vlog-%'");
    await client.query("DELETE FROM memories WHERE id LIKE 'mem-%'");
    await client.query("DELETE FROM users WHERE id LIKE 'user-%'");
    await client.query("DELETE FROM families WHERE id LIKE 'family-%'");

    console.log('📝 正在执行 SQL 脚本（整文件执行，支持 DO $$ 等语法）...\n');
    // 直接执行整份 SQL，避免用 ';' 分割导致 DO $$ 块/注释解析错误
    await client.query(sqlContent);

    console.log('\n✅ 演示数据初始化完成！');
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
