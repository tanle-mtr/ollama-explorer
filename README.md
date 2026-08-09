# OllamaFOFA

> FOFA 风格的 **Ollama 模型资产测绘引擎**。像 FOFA 检索公网资产一样，检索暴露在端口
> 11434 上的 Ollama 实例，直接看到每个实例的**模型列表**，并支持按模型 ID 筛选。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tanle-mtr/ollama-explorer)
[![GitHub](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

## 功能特性

- 类 FOFA 语法检索 `port="11434" && status_code="200"`
- 表格展示每个实例的模型列表（模型名、大小、参数量、量化等级）
- 点击模型标签即可筛选「哪些公网实例提供了这个模型」（支持家族匹配，`llama3.1` 命中 `llama3.1:8b`）
- 「探测 IP」面板直接对指定 IP/网段发起探测（社区协作添加资产）
- 实例详情弹窗：地址、版本、Server、模型清单、重新探测、复制查询
- 存储使用 Upstash Redis / Vercel KV，未配置时自动回退内存存储
- 可部署到 Vercel（Hobby 即可）

## 工作原理

```
持续探测（社区提交 IP / 自研 GitHub Actions 扫描器批量扫描公网 11434 端口）
        │  对 host:11434 发起 /api/tags、/api/version 请求
        ▼
指纹化：IP + 端口 + 协议 + 状态码 + 版本 + 模型列表 + 归属信息
        ▼
写入索引库（Redis：实例哈希 + 模型倒排集合）
        ▼
用户用类 FOFA 语法检索快照库：port="11434" && status_code="200"
```

## 快速开始（本地）

```bash
npm install
npm run dev
```

打开 http://localhost:3000 。默认使用内存存储，探测的数据仅在进程内有效。

## 部署到 Vercel

1. 将本项目推送到 GitHub 仓库。
2. 在 Vercel 导入该仓库（Framework 选 Next.js，无需其他配置）。
3. 在项目 Settings → Storage 中 **创建 KV（Upstash Redis）** 并链接，
   Vercel 会自动注入 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`。
4. 重新部署即可。部署完成后，任意用户都能：
   - 直接输入 IP 地址或域名探测自己的资产（写入共享数据库）；
   - 用 FOFA 语法检索实例与模型列表。

> 不配置 KV 也能跑，但 serverless 冷启动后内存数据会丢失，多用户无法共享数据。
> 推荐始终链接 KV。

## 环境变量

请参考 [.env.example](.env.example)：

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | 部署时建议 | 链接 Vercel KV 后自动注入 |
| `GEOIP_TOKEN` | 可选 | ipinfo.io token（不配也能用，免费额度即可） |
| `PROBE_TOKEN` | 可选 | 保护 `/api/probe`，未配置则任何访客都可探测 |

## 给数据库注入初始数据（自研扫描，无需第三方 API）

**方式一：GitHub Actions 定时扫描（自研 FOFA 引擎）**

1. 在仓库 Settings → Actions secrets 中添加 `PROBE_TOKEN`（与部署环境变量一致）；
2. 在 Actions variables 中添加 `OLLAMA_API_URL`（你的 Vercel 域名，如
   `https://ollama-explorer.vercel.app`）；
3. 推送 `.github/workflows/scan.yml`，扫描器随机扫一批公网 IP 的 11434 端口，
   命中即写库（也可在 Workflow 中手动触发并设置数量）。

**方式二：页面「探测 IP」** 直接输入已知的 Ollama 服务器地址生成（
经 `/api/probe` 探测后写入 KV 共享库）。

## FOFA 语法支持

支持 `&&` 连接多个条件，全部满足才命中：

| 字段 | 示例 | 说明 |
| --- | --- | --- |
| `ip` | `ip="1.2.3.4"` / `ip="1.2.3.0/24"` | 精确 IP 或 CIDR |
| `port` | `port="11434"` | 端口 |
| `status_code` | `status_code="200"` | HTTP 状态码 |
| `model` | `model="llama3.1"` | 模型 ID，家族匹配（命中 `llama3.1:8b` 等） |
| `title` | `title="Ollama"` | 标题/服务名 |
| `version` | `version="0.5"` | Ollama 版本 |
| `country` | `country="US"` | 国家代码 |
| `hostname` | `hostname="ollama"` | 域名 |
| `server` | `server="ollama"` | Server 响应头 |

不带引号的自由文本会匹配 IP / 域名 / 模型名。

## 项目结构

```
ollama-explorer/
├── app/
│   ├── page.tsx                    # 主页面（FOFA 风格搜索）
│   └── api/
│       ├── search/route.ts         # GET 类 SQL 检索
│       ├── probe/route.ts          # POST 主动探测并入库
│       ├── models/route.ts         # GET 模型列表与实例数
│       └── stats/route.ts          # GET 统计
├── components/                     # 模型筛选、探测面板、实例详情、语法说明
├── lib/
│   ├── ollama.ts                   # 探测逻辑（/api/tags、/api/version）
│   ├── parser.ts                   # FOFA 语法解析与匹配
│   ├── store.ts                    # 索引（Redis / 内存双实现）
│   ├── redis.ts                    # Upstash Redis REST 客户端
│   └── geo.ts                      # ipinfo 归属信息
├── scripts/scan-remote.mjs         # GitHub Actions 定时扫描
└── .github/workflows/scan.yml      # 每天自动探测一批公网 IP
```

## 免责声明

本项目仅用于安全研究、资产自查与合规测试。探测未授权目标可能违反当地法律，
使用前请确保你拥有对所探测资产的授权。请为 `/api/probe` 配置 `PROBE_TOKEN` 防止滥用。

## License

MIT