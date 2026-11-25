import {createHash, randomUUID, scrypt, timingSafeEqual} from "node:crypto";
import {promisify} from "node:util";
import {mkdirSync, readFileSync} from "node:fs";
import {createServer} from "node:http";
import {resolve} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {Readable} from "node:stream";
import gardenApi, {createAdmin} from "./multiplayer/worker.js";

process.umask(0o077);
const dataDirectory = resolve(process.env.GARDEN_DATA_DIR || "server-data");
mkdirSync(dataDirectory, {recursive:true});
const database = new DatabaseSync(resolve(dataDirectory, "garden.sqlite"));
database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
database.exec("BEGIN IMMEDIATE");
try {
  const {user_version} = database.prepare("PRAGMA user_version").get();
  const migrations = ["0001_gardens.sql", "0002_admin_access.sql"];
  for (let version = user_version; version < migrations.length; version++) {
    const migration = new URL("./multiplayer/migrations/" + migrations[version], import.meta.url);
    database.exec(readFileSync(migration, "utf8"));
    database.exec("PRAGMA user_version = " + (version + 1));
  }
  database.exec("COMMIT");
} catch (error) {
  database.exec("ROLLBACK");
  throw error;
}

// Adapt the local SQLite connection to the database methods used by the shared API.
const DB = {
  prepare(query) {
    const statement = database.prepare(query);
    return {
      bind(...parameters) {
        return {
          run:() => ({meta:{changes:statement.run(...parameters).changes}}),
          all:() => ({results:statement.all(...parameters)}),
          first:() => statement.get(...parameters)
        };
      }
    };
  },
  batch(statements) {
    database.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map(statement => statement.run());
      database.exec("COMMIT");
      return results;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
};

if (process.argv[2] === "--create-admin-password") {
  const {id, secret} = await createAdmin(DB);
  console.log(id + "." + secret);
  database.close();
  process.exit(0);
}

if (process.argv[2] === "--create-admin") {
  const site = new URL(process.argv[3] || "http://127.0.0.1:3000/");
  if (!["http:", "https:"].includes(site.protocol) || site.pathname !== "/" ||
      site.search || site.hash || site.username || site.password) {
    throw new Error("Provide the site's root URL, for example https://garden.example.com/");
  }
  const {id, secret} = await createAdmin(DB);
  const admin = new URL("garden-admin.html", site);
  admin.hash = "member=" + id + "." + secret;
  console.log(admin.href);
  database.close();
  process.exit(0);
}

const pushTest = process.env.GARDEN_PUSH_TEST === "1";
const push = process.env.GARDEN_PUSH_CONTACT
  ? (await import("./push.mjs")).createPushService(database, dataDirectory, pushTest ? 5000 : 25 * 60_000)
  : null;

const files = new Map(Object.entries({
  "/index.html":"text/html; charset=utf-8",
  "/garden-admin.html":"text/html; charset=utf-8",
  "/manifest.webmanifest":"application/manifest+json",
  "/icon-192.png":"image/png",
  "/icon-512.png":"image/png",
  "/friends.css":"text/css; charset=utf-8",
  "/garden-catalog.js":"text/javascript; charset=utf-8",
  "/garden-art.js":"text/javascript; charset=utf-8",
  "/friends.js":"text/javascript; charset=utf-8",
  "/friends-config.js":"text/javascript; charset=utf-8",
  "/garden-admin.js":"text/javascript; charset=utf-8",
  "/sw.js":"text/javascript; charset=utf-8"
}));
const release = createHash("sha256");
for (const [path, type] of files) {
  const body = path === "/friends-config.js"
    ? pushTest
      ? Buffer.from('window.GARDEN_API = "";\ndocument.documentElement.classList.add("push-test");\n')
      : Buffer.from('window.GARDEN_API = "./api";\ndocument.documentElement.classList.add("invite-only");\n')
    : readFileSync(new URL("." + path, import.meta.url));
  const servedBody = pushTest && path === "/index.html"
    ? Buffer.from(body.toString().replace('const testMode = new URLSearchParams(location.search).get("mode") === "test";', 'const testMode = true;'))
    : pushTest && path === "/manifest.webmanifest"
      ? Buffer.from(body.toString().replaceAll("番茄花园", "番茄花园测试"))
      : body;
  release.update(servedBody);
  files.set(path, {body:servedBody, type});
}
const serviceWorker = files.get("/sw.js");
serviceWorker.body = Buffer.from(serviceWorker.body.toString().replace("__GARDEN_RELEASE__", release.digest("hex")));

function json(response, status, error) {
  response.writeHead(status, {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"});
  response.end(JSON.stringify({error}));
}

if (process.argv[2] === "--change-admin-password") {
  const admins = database.prepare("SELECT id FROM garden_admins LIMIT 2").all();
  if (admins.length !== 1) throw new Error("此命令需要数据库中恰有一个管理员。");
  const password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
  if (password.length < 8 || password.length > 128) {
    throw new Error("管理员密码需有 8 到 128 个字符。");
  }
  const {id} = admins[0];
  const secret = (await promisify(scrypt)(password, id, 32)).toString("hex");
  const hash = createHash("sha256").update(secret).digest("hex");
  database.prepare("UPDATE garden_admins SET secret_hash = ? WHERE id = ?").run(hash, id);
  console.log("管理员密码已更新。");
  database.close();
  process.exit(0);
}

const initialPassword = process.env.GARDEN_ADMIN_PASSWORD;
const hasAdmin = () => database.prepare("SELECT 1 FROM garden_admins LIMIT 1").get();
if (initialPassword !== undefined && !hasAdmin()) {
  if (initialPassword.length < 8 || initialPassword.length > 128) {
    throw new Error("GARDEN_ADMIN_PASSWORD must contain 8 to 128 characters.");
  }
  const id = randomUUID();
  const secret = (await promisify(scrypt)(initialPassword, id, 32)).toString("hex");
  database.exec("BEGIN IMMEDIATE");
  try {
    if (!hasAdmin()) {
      const code = randomUUID();
      database.prepare("INSERT INTO gardens (code) VALUES (?)").run(code);
      database.prepare("INSERT INTO garden_admins (id, garden_code, secret_hash) VALUES (?, ?, ?)")
        .run(id, code, createHash("sha256").update(secret).digest("hex"));
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://local.invalid");
    if (url.pathname.startsWith("/api/")) {
      const origin = request.headers.origin;
      if (origin && (origin === "null" || new URL(origin).host !== request.headers.host)) {
        request.resume();
        json(response, 403, "请求来源无效。");
        return;
      }
      const method = request.method;
      const options = {method};
      if (method === "POST") {
        const chunks = [];
        let size = 0;
        for await (const chunk of request.iterator({destroyOnReturn:false})) {
          size += chunk.length;
          if (size > 4096) {
            request.resume();
            json(response, 413, "请求过大。");
            return;
          }
          chunks.push(chunk);
        }
        options.body = Buffer.concat(chunks);
      }
      if (url.pathname.startsWith("/api/push/")) {
        if (!push) return json(response, 404, "推送服务尚未启用。");
        const route = url.pathname.slice("/api/push/".length);
        if (route === "config" && method === "GET") {
          response.writeHead(200, {"Content-Type":"application/json", "Cache-Control":"no-store"});
          return response.end(JSON.stringify({publicKey:push.publicKey, test:pushTest}));
        }
        if (method !== "POST" || !origin) return json(response, 403, "请求来源无效。");
        let input;
        try { input = JSON.parse(options.body); } catch {
          return json(response, 400, "请求格式无效。");
        }
        if (route === "schedule") {
          const status = push.schedule(input?.endpoint, input?.token);
          if (status !== 200) return json(response, status, "无法登记到点通知。");
        } else if (route === "cancel") {
          push.cancel(input?.token);
        } else {
          return json(response, 404, "接口不存在。");
        }
        response.writeHead(204, {"Cache-Control":"no-store"});
        return response.end();
      }
      if (url.pathname === "/api/manage/claim" && method === "POST") {
        let input;
        try { input = JSON.parse(options.body); } catch {
          return json(response, 400, "请求格式无效。");
        }
        const token = process.env.GARDEN_CLAIM_TOKEN;
        const hash = value => createHash("sha256").update(value).digest("hex");
        if (!token || typeof input?.token !== "string" ||
            !timingSafeEqual(Buffer.from(hash(token)), Buffer.from(hash(input.token)))) {
          return json(response, 403, "设置链接无效。");
        }
        if (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 128) {
          return json(response, 400, "密码需有 8 到 128 个字符。");
        }
        const pending = hash(token);
        const admin = database.prepare("SELECT id FROM garden_admins WHERE secret_hash = ?").get(pending);
        if (!admin) return json(response, 409, "设置链接已使用，请登录。");
        const secret = (await promisify(scrypt)(input.password, admin.id, 32)).toString("hex");
        const result = database.prepare("UPDATE garden_admins SET secret_hash = ? WHERE id = ? AND secret_hash = ?")
          .run(hash(secret), admin.id, pending);
        if (!result.changes) return json(response, 409, "设置链接已使用，请登录。");
        response.writeHead(200, {"Content-Type":"application/json", "Cache-Control":"no-store"});
        return response.end(JSON.stringify({id:admin.id, secret}));
      }
      if (url.pathname === "/api/manage/login" && method === "POST") {
        if (!hasAdmin()) return json(response, 503, "管理员口令尚未设置，请联系部署人员。");
        let password;
        try { ({password} = JSON.parse(options.body)); } catch {
          return json(response, 400, "请求格式无效。");
        }
        if (typeof password !== "string" || password.length < 8 || password.length > 128) {
          return json(response, 403, "管理员口令无效。");
        }
        const admins = database.prepare("SELECT id, secret_hash FROM garden_admins").all();
        for (const {id, secret_hash} of admins) {
          const secret = (await promisify(scrypt)(password, id, 32)).toString("hex");
          const hash = createHash("sha256").update(secret).digest("hex");
          if (timingSafeEqual(Buffer.from(hash), Buffer.from(secret_hash))) {
            response.writeHead(200, {"Content-Type":"application/json", "Cache-Control":"no-store"});
            return response.end(JSON.stringify({id, secret}));
          }
        }
        return json(response, 403, "管理员口令无效。");
      }
      const apiUrl = "http://local.invalid" + url.pathname.slice(4) + url.search;
      const result = await gardenApi.fetch(new Request(apiUrl, options), {DB});
      response.writeHead(result.status, {
        "Content-Type":result.headers.get("Content-Type") || "application/json",
        "Cache-Control":"no-store"
      });
      if (result.body) Readable.fromWeb(result.body).pipe(response);
      else response.end();
      return;
    }

    const file = files.get(url.pathname === "/" ? "/index.html" : url.pathname);
    if (!file || !["GET", "HEAD"].includes(request.method)) {
      response.writeHead(file ? 405 : 404);
      response.end();
      return;
    }
    response.writeHead(200, {
      "Content-Type":file.type,
      "Content-Length":file.body.length,
      "Cache-Control":"no-cache",
      "X-Content-Type-Options":"nosniff"
    });
    response.end(request.method === "HEAD" ? undefined : file.body);
  } catch {
    if (response.headersSent) response.destroy();
    else json(response, 500, "请求暂时无法处理。");
  }
});
server.requestTimeout = 15000;
server.listen(Number(process.env.PORT || 3000), process.env.HOST || "127.0.0.1", () => {
  const {address, port} = server.address();
  console.log("Tomato Garden listening on " + address + ":" + port);
});
