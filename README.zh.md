# InkForm

**开源表单后端，专为静态站设计。完整跑在 Cloudflare 免费额度上。**

把任意 HTML 表单指向 InkForm，就得到一个真正的后端：提交进 dashboard，可选 webhook 和 Telegram 即时通知。没有服务器、没有数据库运维、没有月账单。

```html
<form action="https://你的-worker.workers.dev/f/表单id" method="POST">
  <input type="text" name="email" required />
  <textarea name="message"></textarea>
  <button>发送</button>
</form>
```

这就是全部集成代码。不需要 JavaScript。

[English documentation](./README.md)

## 为什么做

- **Formspree 式接入体验** —— 纯 HTML action，无 JS 可用，也支持 AJAX
- **数据归你** —— 每条提交落在你自己的 D1 数据库，不是供应商的
- **永久免费额度** —— Workers + D1 + KV 免费层覆盖每月数千条提交
- **默认防垃圾** —— 蜜罐字段、按 IP 限流、可选 Cloudflare Turnstile
- **通知** —— 每条提交可触发 webhook（JSON POST）和/或 Telegram 消息

## 部署到 Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Liteink/inkform)

> 需要一个免费 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)。按钮会把本仓库克隆进你的账号，创建 Worker、D1 数据库和 KV 命名空间，并完成部署。

### 手动部署

```bash
git clone https://github.com/Liteink/inkform.git
cd inkform
npm install

# 创建资源
npx wrangler d1 create inkform
npx wrangler kv namespace create RATE_LIMIT

# 把返回的 ID 粘进 wrangler.jsonc（模板见 wrangler.example.jsonc），
# 然后初始化数据库：
npx wrangler d1 execute inkform --remote --file=schema.sql

# 设置管理密码（不要保留 "changeme"）
npx wrangler secret put ADMIN_PASSWORD

# 可选：Telegram 通知
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID

# 可选：按表单开启 Turnstile
npx wrangler secret put TURNSTILE_SECRET

npm run deploy
```

打开 `https://<你的-worker>.workers.dev/admin`，登录，创建第一个表单，复制端点。

## 特殊字段

下划线开头的字段是控制字段，不会入库。

| 字段 | 作用 |
| --- | --- |
| `_gotcha` | 蜜罐。机器人填了就静默丢弃（返回假成功）。 |
| `_next` | 整页提交后的跳转 URL，覆盖表单默认 redirect。 |
| `cf-turnstile-response` | Turnstile token，表单开启 Turnstile 时服务端校验。 |

## 许可

MIT © [LiteInk](https://liteink.co)

LiteInk 家族成员 —— [Astro 模板](https://liteink.co) · [Ink CMS](https://github.com/Liteink/ink-cms) · [InkForm](https://github.com/Liteink/inkform)
