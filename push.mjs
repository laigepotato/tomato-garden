import {readFileSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {generateVAPIDKeys, sendNotification} from "web-push";

const pushHosts = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"]);

export function createPushService(database, dataDirectory, duration) {
  const keyFile = resolve(dataDirectory, "vapid.json");
  try {
    writeFileSync(keyFile, JSON.stringify(generateVAPIDKeys()), {flag:"wx", mode:0o600});
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const keys = JSON.parse(readFileSync(keyFile, "utf8"));
  const vapidDetails = {subject:process.env.GARDEN_PUSH_CONTACT || "mailto:admin@example.com", ...keys};
  database.exec(`CREATE TABLE IF NOT EXISTS focus_push (
    endpoint TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, due INTEGER NOT NULL, retry INTEGER NOT NULL
  )`);
  const schedule = database.prepare(`INSERT INTO focus_push VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET token=excluded.token, due=excluded.due, retry=excluded.retry`);
  const remove = database.prepare("DELETE FROM focus_push WHERE token = ?");
  const count = database.prepare("SELECT COUNT(*) AS total FROM focus_push");
  const exists = database.prepare("SELECT 1 FROM focus_push WHERE endpoint = ?");
  const expired = database.prepare("DELETE FROM focus_push WHERE due < ?");
  const ready = database.prepare("SELECT * FROM focus_push WHERE retry <= ? ORDER BY retry LIMIT 20");
  const defer = database.prepare("UPDATE focus_push SET retry = ? WHERE token = ?");
  let sending = false;
  const drain = async () => {
    if (sending) return;
    sending = true;
    try {
      const now = Date.now();
      expired.run(now - 120_000);
      await Promise.all(ready.all(now).map(async ({endpoint, token}) => {
        try {
          await sendNotification({endpoint}, null, {vapidDetails, TTL:60, timeout:5000, urgency:"high"});
          remove.run(token);
        } catch (error) {
          if ([400, 401, 403, 404, 410].includes(error.statusCode)) remove.run(token);
          else defer.run(Date.now() + 10_000, token);
        }
      }));
    } finally {
      sending = false;
    }
  };
  setInterval(() => void drain().catch(error => console.error("Focus push queue:", error.message)), 500).unref();

  return {
    publicKey:keys.publicKey,
    schedule(endpoint, token) {
      if (typeof endpoint !== "string" || endpoint.length > 2048 ||
          typeof token !== "string" || !/^[\da-f-]{36}$/i.test(token)) return 400;
      let target;
      try { target = new URL(endpoint); } catch { return 400; }
      if (target.protocol !== "https:" || target.port || target.username || target.password ||
          target.hash || !pushHosts.has(target.hostname)) return 400;
      if (!exists.get(target.href) && count.get().total >= 1000) return 429;
      const due = Date.now() + duration;
      schedule.run(target.href, token, due, due);
      return 200;
    },
    cancel(token) {
      if (typeof token === "string") remove.run(token);
    }
  };
}
