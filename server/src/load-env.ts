/**
 * 必须在其它 `server/src` 模块之前加载：ESM 会先执行全部静态 import，
 * 若 dotenv 写在 index 里路由 import 之后，则 `routes/*.ts` 顶层的 `new Config()` 读不到 .env。
 *
 * 路径以本文件为锚点（repo/.env 与 repo/server/.env），不依赖 process.cwd()，
 * 避免从仓库根目录启动 tsx 时读错 ../.env 导致 GEMINI_API_KEY 等未加载。
 *
 * 加载顺序：先 server/.env，再仓库根 .env（override），根目录配置优先于 server 内示例空行。
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(serverDir, '..');
const rootEnv = path.join(repoRoot, '.env');
const localEnv = path.join(serverDir, '.env');

// 先 server/.env，再根目录 .env 且 override，避免 server 里示例空变量覆盖根目录已配置的密钥
dotenv.config({ path: localEnv, override: false });
dotenv.config({ path: rootEnv, override: true });
