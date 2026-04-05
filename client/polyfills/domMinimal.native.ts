/**
 * Hermes 上若不存在全局 `document`，部分依赖（含 `document?.x`）在求值标识符时仍会抛 ReferenceError。
 * 提供极简占位；仅用于 native。故意用 any，避免与 DOM lib 类型冲突。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const g = globalThis as any;

if (!('document' in g) || g.document === undefined) {
  const noopEl: any = {
    appendChild: () => noopEl,
    removeChild: () => noopEl,
    setAttribute: () => undefined,
    removeAttribute: () => undefined,
    matches: () => false,
    style: {},
    dataset: {},
  };
  g.document = {
    title: '',
    currentScript: null,
    createElement: () => ({ ...noopEl }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementsByTagName: () => [],
    createTextNode: () => ({}),
    body: { appendChild: () => noopEl, removeChild: () => noopEl },
    head: { appendChild: () => noopEl },
    documentElement: {
      removeAttribute: () => undefined,
      style: { setProperty: () => undefined },
    },
    styleSheets: [],
  };
}

if (!('location' in g) || g.location === undefined) {
  g.location = { href: 'file:///', origin: 'file://' };
}

export {};
