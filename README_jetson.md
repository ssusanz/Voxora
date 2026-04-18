# Jetson README

> 当前设备：Jetson（Ubuntu / Jetson Linux）  
> 本文档记录当前**真实运行环境（已验证）**。

---

## 1. NAS 挂载

### 1.1 华为家庭存储（192.168.1.48）

- 共享：家庭共享（唯一）
- 挂载方式：GVFS（gio mount）

**挂载命令**

```bash
gio mount -a "smb://192.168.1.48/家庭共享"
```

**GVFS 实际路径**

```bash
/run/user/$(id -u)/gvfs/smb-share:server=192.168.1.48,share=家庭共享
```

**本机入口**

```bash
~/HWMMSPACE
```

### 1.2 Synology NAS（192.168.1.107）

- 协议：NFS v4.1
- 远端：`192.168.1.107:/volume1/homes`
- 本地挂载点：`/mnt/nas_homes`

---

## 2. 本地模型（Qwen2.5-VL-7B）

### 2.1 模型信息

- **Hugging Face repo**：`Qwen/Qwen-2.5-7B-VL`
- **本地目录**：`/mnt/data/models/Qwen/Qwen-2.5-7B-VL`
- **类型**：Vision-Language（多模态：文本 + 图像）

### 2.2 服务方式

- **进程**：`serve_qwen_vl.py`（**不是 vLLM**）
- **启动示例**：

```bash
python serve_qwen_vl.py
```

### 2.3 API

- **OpenAI 兼容**：Chat Completions API（`/v1/chat/completions` 等，以脚本实际监听为准）
- 支持文本与图像输入（多模态）

### 2.4 特点与注意

- 本地推理，数据不外发
- 显存占用较高，需按设备调整 batch / 长度等参数
- 服务需监听 **`0.0.0.0`（或局域网 IP）**，否则同网段 Mac / 手机无法访问

### 2.5 与 Voxora 后端对接（Mac mini）

仓库内回忆总结接口会请求 **OpenAI 兼容** 的 `chat/completions`。在跑 **Express 的终端**里设置（名称沿用 `VLLM_*`，与是否 vLLM 无关，仅表示「兼容端点」）：

- `VLLM_BASE_URL`：例如 `http://<Jetson局域网IP>:<端口>/v1`（须能 `curl` 通）
- `VLLM_MODEL`：与 `serve_qwen_vl.py` 注册的 **model 名** 一致
- 可选：`VLLM_API_KEY`、`VLLM_TIMEOUT_MS`

未配置或请求失败时，接口会回退为模板总结（`stub: true`）。

---

## 3. 常用命令

```bash
# 挂华为 NAS
gio mount -a "smb://192.168.1.48/家庭共享"

# 查看挂载
gio mount -l

# 查看文件
ls ~/HWMMSPACE

# 查看 NFS
mount | grep nfs

# 启动 Qwen VL（OpenAI 兼容 Chat Completions，非 vLLM）
python serve_qwen_vl.py
```

---

## 4. 备注

- CIFS 挂载在当前 Jetson 不可用（缺 UTF-8 NLS）
- GVFS 已验证稳定
- NFS 正常
