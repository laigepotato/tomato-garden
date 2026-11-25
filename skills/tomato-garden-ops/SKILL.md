---
name: tomato-garden-ops
description: Deploy, update, back up, restore, migrate, and troubleshoot the Tomato Garden PWA and its SQLite member gardens on a Linux host.
---

# 番茄花园运维

从包含 `server.mjs` 的项目根目录操作。部署参数与首次部署命令见项目的 [DEPLOY.md](../../DEPLOY.md)。迁移时随项目携带本技能目录。

## 确认目标

- 区分本地预览、测试环境和正式服务。先确认目标域名、服务账号、进程管理方式及实际 `GARDEN_DATA_DIR`。若未设置，数据库目录是进程工作目录下的 `server-data`。
- Node.js 24 通过 `node:sqlite` 读写 SQLite。前端、`/api/` 和 `/garden-admin.html` 由同一服务提供。部署包包含 `server.mjs`、`multiplayer/worker.js`、`multiplayer/migrations/` 和 `server.mjs` 静态文件清单列出的文件。
- 管理员口令和用户链接都能用于访问相应身份。保存在受控位置，排除在提交、部署包和日志之外。用户链接中的 `#member=…` 是凭证，域名迁移时保留这一段。

## 部署与升级

1. 在 Linux 上用 systemd 或现有进程管理器运行 `node server.mjs`。固定工作目录和绝对数据目录。服务账号需要写入数据目录。用 HTTPS 反代整个域名，保留原始 Host，应用默认绑定 `127.0.0.1:3000`。
2. 新数据库按部署文档在首次启动前配置 `GARDEN_ADMIN_PASSWORD`，再打开应用路径下的 `garden-admin.html` 登录。已有管理员可用原口令登录，旧管理链接中 `#member=` 后的值也可作为口令。
3. 更新前保留旧程序版本和数据库快照。启动新版本时复用原数据目录，数据库结构迁移由服务启动时执行。重启后先验收，再清理旧版本。

## 备份、恢复与换服务器

1. 使用 SQLite 在线备份生成独立快照，或停服后完整备份数据目录。运行中数据库使用 WAL，直接复制主库文件可能漏掉已提交的更新。

   ```sh
   umask 077
   node --input-type=module - /var/lib/tomato-garden/garden.sqlite /安全目录/garden-backup.sqlite <<'JS'
   import { existsSync } from "node:fs";
   import { DatabaseSync, backup } from "node:sqlite";
   const [source, destination] = process.argv.slice(2);
   if (existsSync(destination)) throw new Error("请使用新的备份文件名");
   const live = new DatabaseSync(source, { readOnly: true });
   try {
     await backup(live, destination);
   } finally {
     live.close();
   }
   const snapshot = new DatabaseSync(destination);
   try {
     const check = snapshot.prepare("PRAGMA integrity_check").all();
     if (check.length !== 1 || check[0].integrity_check !== "ok") {
       throw new Error("备份完整性检查失败");
     }
     console.log(snapshot.prepare("SELECT COUNT(*) AS members FROM members").get());
   } finally {
     snapshot.close();
   }
   JS
   ```

2. 正式迁移时停旧服务或暂停写入后再制作最终快照。在目标服务停止时恢复到独立或空的数据目录，设置服务账号权限，避免与目标旧库的 WAL 文件混用。迁移原库可保留成员、花园进度和管理员凭证。
3. 启动目标服务并验收后再切换域名或代理。域名改变时，给好友发送新域名加原 `#member=…` 的链接。管理页的「补发链接」会使旧凭证失效，只在确实需要轮换时使用。
4. 如需回滚，优先切回原实例和切换前的数据库。目标实例已有新写入时，先保全目标库并确认如何处理新增进度，避免用旧快照覆盖。

## 验收与排查

- 请求首页和管理页，确认 HTTPS 和 `/api/` 转发正常。管理接口缺少凭证应返回 403。有授权测试账号时，检查管理员可读成员列表、用户链接刷新后仍保留身份、「我的花园」的花卡片与排行榜的种植数一致。创建测试用户或验证写入时使用测试库或指定测试账号。
- 管理页空白或云端进度异常时，先查服务日志、数据目录和数据库完整性。排行榜与花园显示不一致时，同时查浏览器脚本错误和服务端记录。
- 线上 PWA 仍显示旧版时，检查 `/sw.js` 是否加载新版本并使用「应用更新」。本地回环地址绕过 PWA 静态缓存。浏览器清理数据会丢失尚未同步的进度。
- 当前用户页面没有存档导入导出。旧 GitHub Pages 上仅存在于浏览器里的进度需要单独迁移，服务器数据库备份只覆盖已写入服务器的数据。
