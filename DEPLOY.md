# 部署番茄花园

把项目文件上传到服务器，例如 `/opt/tomato-garden`。服务器使用 Node.js 24，启用到点通知时需先安装 Web Push 依赖。

```sh
cd /opt/tomato-garden
GARDEN_DATA_DIR=/var/lib/tomato-garden node server.mjs
```

运行账号需要能读项目文件并写入 `GARDEN_DATA_DIR`。默认监听 `127.0.0.1:3000`。可以用 systemd 托管该进程，设置工作目录、运行用户和 `GARDEN_DATA_DIR`，并启用开机启动和失败重启。

在已配置证书的 Nginx HTTPS 站点中，将整个域名转发给应用：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $http_host;
}
```

用域名根地址打开番茄花园。服务器防火墙开放 HTTPS 端口 443。如果证书签发或 HTTP 跳转需要 80，也开放 80。应用端口 3000 保持在服务器本机。HTTPS 可用于安装 PWA 和使用专属链接。

首次启动前，在服务环境中设置 `GARDEN_ADMIN_PASSWORD`，口令需有 8 到 128 个字符。空数据库首次启动时会保存口令的校验值。随后打开管理页（例如 `/garden-admin.html`），直接输入这一个口令即可登录。首次初始化成功后，可以从服务环境移除该变量。

重新部署时继续使用同一个 `GARDEN_DATA_DIR`，原口令可直接登录。管理员在管理页生成用户链接，再单独发给相应用户。补发后旧用户链接失效，用户进度保留。

管理员想参加种花时，可以从管理页为自己生成一条普通用户链接。已有管理员可将旧管理链接中 `#member=` 后的全部字符作为口令，继续管理原来的花园。

云端存档写入 `GARDEN_DATA_DIR/garden.sqlite`。更新应用时使用同一个数据目录。数据库启用 WAL，建议停止服务后备份数据目录，或使用 SQLite 的在线备份功能。安装包和 Web 根目录只包含程序文件。

升级、备份、恢复和服务器迁移流程见 [番茄花园运维技能](skills/tomato-garden-ops/SKILL.md)。

## 到点通知测试实例

安装推送依赖后，启动独立实例。测试实例固定为每轮 5 秒，使用独立数据目录和 VAPID 密钥。请把示例联系方式替换为站点管理员邮箱。

```sh
npm ci --omit=dev
GARDEN_DATA_DIR=/var/lib/tomato-garden-test GARDEN_PUSH_TEST=1 \
  GARDEN_PUSH_CONTACT=mailto:admin@example.com PORT=3001 node server.mjs
```

在已有 HTTPS 站点配置独立路径。保留末尾斜线，让测试版可以单独添加到主屏幕。

```nginx
location = /tomato-garden-test {
    return 308 /tomato-garden-test/;
}
location ^~ /tomato-garden-test/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_set_header Host $http_host;
}
```

从 Safari 打开测试地址，添加到主屏幕后从测试图标启动。在右上角「设置」菜单点「开启到点通知」并允许，开始专注后切换到其他 App。收到通知后点横幅应能返回测试页。测试提前结束时，应在到点前取消通知。备份测试或正式推送数据时同时保留 `vapid.json`，更换密钥后需要重新订阅。正式实例设置 `GARDEN_PUSH_CONTACT` 后启用推送，默认专注时长为 25 分钟。
