# Ollama Explorer - 状态报告

## 项目概述
自研 FOFA 风格 Ollama 资产侦察引擎，无需依赖 FOFA API，使用 Masscan 扫描公网 IP，数据存储在 Upstash Redis。

## 当前状态

### ✅ 已完成
1. **Redis 迁移** - 从旧实例 (busy-caiman-70293) 迁移到新的临时实例 (strong-roughy-199744)
   - 迁移了 630 个 key (224 个 host + 索引)
   - 重建了所有索引 (ollama:all, ollama:port:11434, ollama:status:200, ollama:modelnames 等)
   
2. **Search API 修复** - 添加了完整的错误处理，Redis 超时时返回空结果而非 500
   
3. **UI 改造**
   - 移除搜索框，锁定固定查询 `port="11434" && status_code="200"`
   - 添加模型厂商筛选 (14 个厂商分组)
   - 添加延迟/IP/时间排序
   
4. **扫描引擎** - GitHub Actions 定时扫描 (Masscan + probe)

### 📊 数据状态
- **Hosts**: 224
- **Models**: 401
- **厂商分布**:
  - Other: 163
  - Qwen/Alibaba: 65
  - Llama/Meta: 37
  - Gemma: 37
  - Gemini/Google: 29
  - Phi/Microsoft: 15
  - DeepSeek: 15
  - Mistral: 11
  - GLM/Zhipu: 9
  - Kimi/Moonshot: 9
  - Claude/Anthropic: 6
  - MiniMax: 5

### ⚠️ 待处理
1. **Vercel 部署** - 每日部署限制已达上限 (100次/天)，需等 24 小时后部署
   - 环境变量已更新: `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`
   - 新 Redis: `https://strong-roughy-199744.upstash.io`
   - Token: `gQAAAAAAAwxAAQIgcDI3ZmJjMTMyOTJkYzM0NDE5OGE0OWYxNWI1YWY1ODJlNQ`

2. **扫描任务失败** - GitHub Actions 30 分钟超时
   - 最新两次扫描 (31182237501, 31177156470) 失败
   - 成功扫描 (31174451315) 耗时 6m54s，使用 16 个网段

3. **Redis 临时实例** - 当前使用的是 3 天过期的临时实例
   - 需要创建正式的 Upstash Redis 实例
   - 迁移脚本: `scripts/migrate-redis.mjs`

## 下一步计划 (参考 ARL-Next 和 CyberRay)

### P0 - 核心修复
- [x] Redis 迁移
- [ ] Vercel 部署验证
- [ ] 搜索 API 端到端测试

### P1 - 功能增强
- [ ] **增量检测** (参考 CyberRay)
  - 记录上次扫描的 host 列表
  - 只返回新增/变化的 host
  - API: `GET /api/search?since=<timestamp>`
  
- [ ] **告警通知** (参考 CyberRay)
  - 新 host 发现时发送通知
  - 支持 Email / Telegram / Discord
  - 可配置告警规则

### P2 - 高级功能
- [ ] **MCP 接口** (参考 ARL-Next)
  - 让 AI Agent 可以直接查询资产
  - 工具: `search_ollama_hosts`, `get_host_details`
  
- [ ] **优化扫描策略**
  - 分批扫描，避免超时
  - 只扫描新增网段
  - 增量更新而非全量扫描

### P3 - 长期规划
- [ ] 正式 Upstash Redis 实例
- [ ] 数据持久化 (90 天 TTL)
- [ ] 审计日志

## 技术栈
- **前端**: Next.js 15 + Tailwind CSS
- **后端**: Vercel Serverless Functions
- **数据库**: Upstash Redis (临时实例)
- **扫描**: GitHub Actions + Masscan
- **部署**: Vercel

## 相关资源
- **GitHub**: https://github.com/tanle-mtr/ollama-explorer
- **线上站点**: https://ollama-explorer.tanle.cc.cd
- **Vercel**: https://ollama-explorer-two.vercel.app
- **Upstash Redis**: https://upstash.com/console/redis/strong-roughy-199744
- **参考项目**:
  - [ARL-Next](https://github.com/owl234/arl-next) - 自动化资产侦察平台
  - [CyberRay](https://github.com/MiaCTFer/CyberRay) - 资产搜集与风险监控

## 命令参考
```bash
# 检查 Vercel 环境变量
vercel env ls --scope tanle

# 添加环境变量
vercel env add UPSTASH_REDIS_REST_URL production --value "<url>" --yes --scope tanle
vercel env add UPSTASH_REDIS_REST_TOKEN production --value "<token>" --yes --scope tanle

# 部署
vercel --prod --yes

# 测试 Redis
python -c "import requests; r=requests.post('https://strong-roughy-199744.upstash.io', headers={'Authorization':'Bearer <token>','Content-Type':'application/json'}, json=['SCARD','ollama:all']); print(r.json())"
```
