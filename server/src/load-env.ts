/**
 * 必须在其它 `server/src` 模块之前加载：ESM 会先执行全部静态 import，
 * 若 dotenv 写在 index 里路由 import 之后，则 `routes/*.ts` 顶层的 `new Config()` 读不到 .env。
 */
import dotenv from 'dotenv';
import path from 'path';

const rootEnv = path.resolve(process.cwd(), '../.env');
const localEnv = path.resolve(process.cwd(), '.env');

dotenv.config({ path: rootEnv, override: false });
dotenv.config({ path: localEnv, override: false });
