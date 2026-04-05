#!/bin/bash
set -e

echo "进入 Voxora 根目录..."
cd "$(dirname "$0")"

echo "安装 pnpm（如果尚未安装）..."
if ! command -v pnpm &> /dev/null
then
    npm install -g pnpm
fi

echo "安装根工作区依赖..."
pnpm install

echo "安装客户端依赖..."
cd client
pnpm install
cd ..

echo "安装服务端依赖..."
cd server
pnpm install
cd ..

echo "安装完成 ✅"
