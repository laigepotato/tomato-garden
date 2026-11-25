import "../garden-catalog.js";

const legacyCatalogSize = 20;
const rounds = [3, 4, ...Array(18).fill(5), ...globalThis.gardenCatalog.map(entry => entry.need)];
const animalIndexes = globalThis.gardenCatalog.flatMap((entry, index) =>
  entry.animal ? [legacyCatalogSize + index] : []
);

function restoreProgress(member, memberId) {
  const {garden_json, ...progress} = member;
  const saved = JSON.parse(garden_json);
  const garden = rounds.map((_, i) => saved[i] ?? 0);
  if (saved.length < garden.length && saved.every(Boolean) &&
      progress.growth === 0) {
    // A legacy cloud save must show the same draw on every device until synchronized.
    const draw = parseInt(memberId.slice(0, 8), 16) / 0x100000000;
    progress.species = saved.length + Math.floor(draw * (garden.length - saved.length));
  }
  progress.growth = Math.min(progress.growth, rounds[progress.species]);
  return {...progress, garden};
}
const maxMembers = 32;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const secretPattern = /^[0-9a-f]{64}$/;
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

function reply(data, status = 200) {
  return Response.json(data, {status, headers});
}

function hex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hash(secret) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return hex(new Uint8Array(bytes));
}

function profile(input) {
  const nickname = typeof input?.nickname === "string" ? input.nickname.trim() : "";
  const {species, growth, completed, garden} = input ?? {};
  const count = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000;
  if (!nickname || [...nickname].length > 16 || /[\u0000-\u001f\u007f]/u.test(nickname) ||
      !count(species) || species >= garden?.length || !count(growth) || growth > rounds[species] ||
      !count(completed) || !Array.isArray(garden) || ![legacyCatalogSize, rounds.length].includes(garden.length) ||
      !garden.every(count)) return null;
  const planted = garden.reduce((total, value) => total + value, 0);
  if (completed < growth + planted) return null;
  return [nickname, species, growth, completed, planted, JSON.stringify(garden)];
}

async function createMember(db, input, code) {
  const values = profile(input);
  if (!values) return reply({error:"请检查花名。"}, 400);
  const id = crypto.randomUUID();
  const secret = hex(crypto.getRandomValues(new Uint8Array(32)));
  const secretHash = await hash(secret);
  const result = await db.prepare(`
    INSERT INTO members (id, garden_code, secret_hash, nickname, species, growth, completed, planted, garden_json)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (SELECT 1 FROM gardens WHERE code = ?)
      AND (SELECT COUNT(*) FROM members WHERE garden_code = ?) < ?
  `).bind(id, code, secretHash, ...values, code, code, maxMembers).run();
  if (!result.meta.changes) return reply({error:"花园已满。"}, 409);
  return reply({code, id, secret, revision:0}, 201);
}

export async function createAdmin(db) {
  const code = crypto.randomUUID();
  const id = crypto.randomUUID();
  const secret = hex(crypto.getRandomValues(new Uint8Array(32)));
  await db.batch([
    db.prepare("INSERT INTO gardens (code) VALUES (?)").bind(code),
    db.prepare("INSERT INTO garden_admins (id, garden_code, secret_hash) VALUES (?, ?, ?)")
      .bind(id, code, await hash(secret))
  ]);
  return {id, secret};
}

async function manage(db, action, input) {
  const {id, secret, target} = input ?? {};
  if (typeof id !== "string" || !uuid.test(id) || typeof secret !== "string" || !secretPattern.test(secret)) {
    return reply({error:"管理员口令无效。"}, 403);
  }
  const secretHash = await hash(secret);
  const admin = await db.prepare(`
    SELECT garden_code FROM garden_admins WHERE id = ? AND secret_hash = ?
  `).bind(id, secretHash).first();
  if (!admin) return reply({error:"管理员口令无效。"}, 403);
  if (action === "/manage/list") {
    const {results} = await db.prepare(`
      SELECT id, nickname, completed, planted FROM members
      WHERE garden_code = ? ORDER BY joined_at, id
    `).bind(admin.garden_code).all();
    return reply({members:results});
  }
  if (action === "/manage/create") {
    return createMember(db, {
      nickname:input.nickname, species:0, growth:0, completed:0, garden:rounds.map(() => 0)
    }, admin.garden_code);
  }
  if (typeof target !== "string" || !uuid.test(target)) {
    return reply({error:"请选择要补发链接的好友。"}, 400);
  }
  const replacement = hex(crypto.getRandomValues(new Uint8Array(32)));
  const replacementHash = await hash(replacement);
  const result = await db.prepare(`
    UPDATE members SET secret_hash = ? WHERE id = ? AND garden_code = ?
  `).bind(replacementHash, target, admin.garden_code).run();
  if (!result.meta.changes) return reply({error:"在这座花园里找不到该成员。"}, 404);
  return reply({id:target, secret:replacement});
}

export default {
  async fetch(request, {DB}) {
    if (request.method === "OPTIONS") return new Response(null, {status:204, headers});
    const url = new URL(request.url);
    try {
      const management = ["/manage/list", "/manage/create", "/manage/reissue"].includes(url.pathname);
      if (request.method !== "POST" || !(management || ["/garden", "/restore", "/progress"].includes(url.pathname))) {
        return reply({error:"找不到这个操作。"}, 404);
      }
      const body = await request.text();
      if (body.length > 4096) return reply({error:"请求过大。"}, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({error:"请求格式无效。"}, 400); }
      if (management) return await manage(DB, url.pathname, input);
      const {id, secret, revision} = input ?? {};
      if (typeof id !== "string" || !uuid.test(id) || typeof secret !== "string" ||
          !secretPattern.test(secret)) return reply({error:"专属链接无效。"}, 400);
      const secretHash = await hash(secret);
      if (url.pathname === "/garden") {
        const member = await DB.prepare("SELECT garden_code FROM members WHERE id = ? AND secret_hash = ?")
          .bind(id, secretHash).first();
        if (!member) return reply({error:"无法验证你的花园身份。"}, 403);
        const {results} = await DB.prepare(`
          SELECT id, nickname, species, growth, completed, planted, revision, garden_json
          FROM members WHERE garden_code = ? ORDER BY joined_at, id
        `).bind(member.garden_code).all();
        return reply({members:results.map(member => {
          const {garden, ...progress} = restoreProgress(member, member.id);
          const animals = animalIndexes.reduce((total, index) => total + garden[index], 0);
          return {...progress, animals};
        })});
      }
      if (url.pathname === "/restore") {
        const member = await DB.prepare(`
          SELECT garden_code AS code, nickname, species, growth, completed, garden_json, revision
          FROM members WHERE id = ? AND secret_hash = ?
        `).bind(id, secretHash).first();
        if (!member) return reply({error:"无法验证你的花园身份。"}, 403);
        return reply(restoreProgress(member, id));
      }
      const values = profile(input);
      if (!values || !Number.isSafeInteger(revision) || revision < 0) {
        return reply({error:"进度数据无效。"}, 400);
      }
      const result = await DB.prepare(`
        UPDATE members SET nickname = ?, species = ?, growth = ?, completed = ?, planted = ?,
          garden_json = ?, revision = revision + 1
        WHERE id = ? AND secret_hash = ? AND revision = ? AND json_array_length(garden_json) <= ?
      `).bind(...values, id, secretHash, revision, input.garden.length).run();
      if (!result.meta.changes) {
        const member = await DB.prepare("SELECT id FROM members WHERE id = ? AND secret_hash = ?").bind(id, secretHash).first();
        if (!member) return reply({error:"无法验证你的花园身份。"}, 403);
        return reply({error:"另一台设备已同步更新。"}, 409);
      }
      return reply({revision:revision + 1});
    } catch {
      return reply({error:"花园服务暂时不可用，请稍后再试。"}, 503);
    }
  }
};
