/**
 * Monorepo 根目录占位入口：在仓库根运行 Expo/Metro 时，HMR 会解析 `./index`。
 * 实际应用在 client/；此处仅做转发（polyfill 仍在 client/index.js 最前执行）。
 */
import './client/index.js';
